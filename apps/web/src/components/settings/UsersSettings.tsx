import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
	CheckIcon,
	EyeIcon,
	EyeOffIcon,
	PencilIcon,
	PlusIcon,
	UserRoundIcon,
} from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "#/components/base/alert";
import { Badge } from "#/components/base/badge";
import { Button } from "#/components/base/button";
import {
	Dialog,
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "#/components/base/dialog";
import { Field, FieldDescription, FieldLabel } from "#/components/base/field";
import { Input } from "#/components/base/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "#/components/base/input-group";
import { FilterSelect } from "#/components/library/FilterSelect";
import {
	SettingsError,
	SettingsList,
	SettingsListSkeleton,
	SettingsRow,
	SettingsSection,
	useDialogSubject,
} from "#/components/settings/SettingsSection";
import type { DialogControl } from "#/components/settings/SettingsSection";
import { useUserInfo } from "#/context/UserInfoContext";
import type { components } from "#/data/APIschema";
import { ROLE_BADGE_VARIANT, ROLE_OPTIONS } from "#/enums/userEnums";
import { userMutation, userQuery } from "#/lib/queries/users.queries";
import {
	PASSWORD_RULE_LABEL,
	checkPassword,
	isPasswordValid,
} from "#/lib/utils/password";
import type { PasswordRuleKey } from "#/lib/utils/password";

type UserInfo = components["schemas"]["UserInfo"];
type Role = components["schemas"]["Roles"];

// Mirrors the server: owners grant Admin, admins grant Uploader and User, and Owner is never granted.
function assignableRoles(currentUser: UserInfo) {
	const isOwner = currentUser.roles.includes("Owner");
	return ROLE_OPTIONS.filter(
		(option) =>
			option.value !== "Owner" && (isOwner || option.value !== "Admin"),
	);
}

// Everyone edits themselves; owners edit every non-owner; admins edit users and uploaders.
function canEditUser(currentUser: UserInfo, user: UserInfo) {
	if (user.id === currentUser.id) return true;
	if (user.roles.includes("Owner")) return false;
	if (currentUser.roles.includes("Owner")) return true;
	return currentUser.roles.includes("Admin") && !user.roles.includes("Admin");
}

export function UsersSettings() {
	const currentUser = useUserInfo();
	// Holds the user being edited; an empty subject creates a new user.
	const dialog = useDialogSubject<{ user?: UserInfo }>();
	const users = useQuery(userQuery.getUsers());

	return (
		<SettingsSection
			action={
				<Button onClick={() => dialog.show({})} type="button">
					<PlusIcon />
					Create user
				</Button>
			}
			description="Manage who can sign in to this library and what they can do."
			title="Users"
		>
			{users.isPending ? (
				<SettingsListSkeleton rows={3} />
			) : users.isError ? (
				<SettingsError
					message="Users could not be loaded."
					onRetry={() => void users.refetch()}
				/>
			) : (
				<SettingsList>
					{users.data.map((user) => (
						<SettingsRow
							actions={
								canEditUser(currentUser, user) && (
									<Button
										aria-label={`Edit ${user.userName}`}
										onClick={() => dialog.show({ user })}
										size="icon-sm"
										type="button"
										variant="ghost"
									>
										<PencilIcon />
									</Button>
								)
							}
							badges={
								<>
									{user.id === currentUser.id && (
										<Badge variant="outline">You</Badge>
									)}
									{user.roles.map((role) => (
										<Badge
											key={role}
											variant={ROLE_BADGE_VARIANT[role as Role]}
										>
											{role}
										</Badge>
									))}
								</>
							}
							icon={<UserRoundIcon />}
							key={user.id}
							title={user.userName}
						/>
					))}
				</SettingsList>
			)}

			{dialog.subject && (
				<UserDialog
					control={dialog}
					currentUser={currentUser}
					key={dialog.subject.user?.id ?? "new"}
					user={dialog.subject.user}
				/>
			)}
		</SettingsSection>
	);
}

/** Creates a user, or edits one when `user` is given. */
function UserDialog({
	control,
	currentUser,
	user,
}: {
	control: DialogControl;
	currentUser: UserInfo;
	user?: UserInfo;
}) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const isSelf = user?.id === currentUser.id;
	const roles = assignableRoles(currentUser);
	const currentRole = (user?.roles[0] as Role | undefined) ?? "User";
	const [username, setUsername] = useState(user?.userName ?? "");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [role, setRole] = useState<Role>(currentRole);
	const passwordInvalid = password.length > 0 && !isPasswordValid(password);
	const canSubmit =
		username.trim().length > 0 &&
		!passwordInvalid &&
		(user !== undefined || password.length > 0);

	const create = useMutation(userMutation.addUser());
	const edit = useMutation(userMutation.editUser());
	const mutation = user ? edit : create;

	async function submit() {
		if (!user) {
			await create.mutateAsync({ password, role, username: username.trim() });
		} else {
			await edit.mutateAsync({
				id: user.id,
				username:
					username.trim() !== user.userName ? username.trim() : undefined,
				password: password || undefined,
				role: !isSelf && role !== currentRole ? role : undefined,
			});
		}
		await queryClient.invalidateQueries({ queryKey: ["users"] });
		control.close();

		if (!isSelf) return;
		// A new password ends every session, including this one.
		if (password) {
			queryClient.removeQueries({ queryKey: ["auth"] });
			await navigate({ to: "/login", search: { redirect: "" } });
		} else {
			await queryClient.invalidateQueries({ queryKey: ["auth"] });
		}
	}

	return (
		<Dialog
			onOpenChange={(open) => {
				if (!open && !mutation.isPending) control.close();
			}}
			onOpenChangeComplete={control.onOpenChangeComplete}
			open={control.open}
		>
			<DialogPopup
				finalFocus={control.finalFocus}
				showCloseButton={!mutation.isPending}
			>
				<DialogHeader>
					{/* Leaves room for the close button and wraps long usernames. */}
					<DialogTitle className="me-8 [overflow-wrap:anywhere]">
						{user ? `Edit ${user.userName}` : "Create user"}
					</DialogTitle>
					<DialogDescription>
						{user
							? "Leave the password empty to keep the current one."
							: "The new user signs in with this username and password."}
					</DialogDescription>
				</DialogHeader>
				<form
					className="contents"
					onSubmit={(event) => {
						event.preventDefault();
						if (canSubmit && !mutation.isPending) void submit().catch(() => {});
					}}
				>
					<DialogPanel>
						<div className="grid gap-4">
							<Field>
								<FieldLabel>Username</FieldLabel>
								<Input
									autoComplete="off"
									disabled={mutation.isPending}
									onChange={(event) => setUsername(event.target.value)}
									required
									value={username}
								/>
							</Field>
							<Field invalid={passwordInvalid}>
								<FieldLabel>{user ? "New password" : "Password"}</FieldLabel>
								<InputGroup>
									<InputGroupInput
										autoComplete="new-password"
										disabled={mutation.isPending}
										onChange={(event) => setPassword(event.target.value)}
										required={!user}
										type={showPassword ? "text" : "password"}
										value={password}
									/>
									<InputGroupAddon align="inline-end">
										<Button
											aria-label={
												showPassword ? "Hide password" : "Show password"
											}
											onClick={() => setShowPassword(!showPassword)}
											size="icon-xs"
											type="button"
											variant="ghost"
										>
											{showPassword ? <EyeOffIcon /> : <EyeIcon />}
										</Button>
									</InputGroupAddon>
								</InputGroup>
								{password.length > 0 && <PasswordRules password={password} />}
								{isSelf && password.length > 0 && (
									<FieldDescription>
										Changing your password signs you out everywhere.
									</FieldDescription>
								)}
							</Field>
							{!isSelf && (
								<FilterSelect
									label="Role"
									onValueChange={setRole}
									options={roles}
									value={role}
								/>
							)}
							{mutation.error && (
								<Alert variant="error">
									<AlertDescription>{mutation.error.message}</AlertDescription>
								</Alert>
							)}
						</div>
					</DialogPanel>
					<DialogFooter>
						<DialogClose
							disabled={mutation.isPending}
							render={<Button type="button" variant="ghost" />}
						>
							Cancel
						</DialogClose>
						<Button disabled={!canSubmit || mutation.isPending} type="submit">
							{mutation.isPending ? "Saving…" : user ? "Save" : "Create user"}
						</Button>
					</DialogFooter>
				</form>
			</DialogPopup>
		</Dialog>
	);
}

function PasswordRules({ password }: { password: string }) {
	const checks = checkPassword(password);
	return (
		<ul className="grid gap-1 pt-1">
			{(Object.keys(PASSWORD_RULE_LABEL) as PasswordRuleKey[]).map((key) => (
				<li
					className={
						checks[key]
							? "flex items-center gap-1.5 text-xs text-success-foreground"
							: "flex items-center gap-1.5 text-xs text-muted-foreground"
					}
					key={key}
				>
					<CheckIcon
						aria-hidden="true"
						className={checks[key] ? "size-3.5" : "size-3.5 opacity-30"}
					/>
					{PASSWORD_RULE_LABEL[key]}
					<span className="sr-only">{checks[key] ? "(met)" : "(not met)"}</span>
				</li>
			))}
		</ul>
	);
}
