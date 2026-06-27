import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	CheckIcon,
	EyeIcon,
	EyeOffIcon,
	PencilIcon,
	PlusIcon,
} from "lucide-react";
import type { FormEvent } from "react";
import { useId, useState } from "react";

import { Badge } from "#/components/coss/badge";
import { Button } from "#/components/coss/button";
import {
	Dialog,
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
	DialogTrigger,
} from "#/components/coss/dialog";
import { Field, FieldLabel } from "#/components/coss/field";
import { Form } from "#/components/coss/form";
import { Input } from "#/components/coss/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "#/components/coss/input-group";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/coss/table";
import { EnumFieldSelect } from "#/components/enumFieldSelect";
import type { components } from "#/data/APIschema";
import { ROLE_BADGE_VARIANT, ROLE_OPTIONS } from "#/enums/userEnums";
import { authMutations, authQueries } from "#/lib/queries/auth.queries";
import { userMutation, userQuery } from "#/lib/queries/users.queries";
import {
	PASSWORD_RULE_LABEL,
	checkPassword,
	isPasswordValid,
} from "#/lib/utils/password";

type UserInfo = components["schemas"]["UserInfo"];
type CreateUserRequest = components["schemas"]["CreateUserRequest"];
type UpdateUserRequest = components["schemas"]["UpdateUserRequest"];
type Role = components["schemas"]["Roles"];

type CreateUserForm = Pick<CreateUserRequest, "password" | "role" | "username">;

const EMPTY_FORM: CreateUserForm = {
	password: "",
	role: "User",
	username: "",
};

const editableRoles = (currentUser: UserInfo | undefined) =>
	ROLE_OPTIONS.filter(
		(option) =>
			option.value !== "Owner" &&
			(currentUser?.roles.includes("Owner") || option.value !== "Admin"),
	);

const canEditUser = (currentUser: UserInfo | undefined, user: UserInfo) =>
	currentUser &&
	(currentUser.roles.includes("Owner") ||
		user.id === currentUser.id ||
		(currentUser.roles.includes("Admin") &&
			(user.roles.includes("User") || user.roles.includes("Uploader"))));

export function UsersTabContent() {
	const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
	const { data: users = [], isPending } = useQuery(userQuery.getUsers());
	const { data: currentUser } = useQuery(authQueries.userInfo());

	return (
		<section className="flex min-w-0 flex-col gap-4">
			<div className="flex items-center justify-between gap-2">
				<div>
					<h2 className="font-heading text-xl font-semibold tracking-tight">
						Users
					</h2>
					<p className="text-sm text-muted-foreground">
						Manage who can access this instance.
					</p>
				</div>
				<CreateUserDialog currentUser={currentUser} />
			</div>

			<EditUserDialog
				currentUser={currentUser}
				onOpenChange={(open) => !open && setEditingUser(null)}
				user={editingUser}
			/>

			<div className="min-w-0 rounded-lg border">
				<Table className="table-fixed">
					<TableHeader>
						<TableRow className="hover:bg-transparent">
							<TableHead>Username</TableHead>
							<TableHead className="hidden w-48 sm:table-cell">Roles</TableHead>
							<TableHead className="hidden sm:table-cell">ID</TableHead>

							<TableHead className="w-10" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{isPending ? (
							<TableRow>
								<TableCell className="h-24 text-center" colSpan={3}>
									Loading...
								</TableCell>
							</TableRow>
						) : users.length === 0 ? (
							<TableRow>
								<TableCell className="h-24 text-center" colSpan={3}>
									No users found.
								</TableCell>
							</TableRow>
						) : (
							users.map((user) => (
								<TableRow key={user.id}>
									<TableCell className="min-w-0 font-medium">
										<div className="flex min-w-0 items-center gap-2">
											<span className="min-w-0 truncate">{user.userName}</span>
											{currentUser && user.id === currentUser.id && (
												<Badge
													variant="outline"
													className="-my-0.5 shrink-0 text-xs font-normal"
												>
													Current user
												</Badge>
											)}
										</div>
									</TableCell>
									<TableCell className="hidden sm:table-cell">
										<div className="flex flex-wrap gap-1">
											{user.roles.map((role) => (
												<Badge
													key={role}
													variant={
														ROLE_BADGE_VARIANT[
															role as keyof typeof ROLE_BADGE_VARIANT
														]
													}
												>
													{role}
												</Badge>
											))}
										</div>
									</TableCell>
									<TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">
										{user.id}
									</TableCell>
									<TableCell className="w-10">
										{canEditUser(currentUser, user) && (
											<Button
												size="icon-xs"
												variant="ghost"
												type="button"
												onClick={() => setEditingUser(user)}
											>
												<PencilIcon />
											</Button>
										)}
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</section>
	);
}

function CreateUserDialog({
	currentUser,
}: {
	currentUser: UserInfo | undefined;
}) {
	const queryClient = useQueryClient();
	const usernameId = useId();
	const passwordId = useId();
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState<CreateUserForm>(EMPTY_FORM);
	const [showPassword, setShowPassword] = useState(false);
	const { isPending, mutateAsync: createUser } = useMutation(
		userMutation.addUser(),
	);

	const passwordChecks = checkPassword(form.password);
	const passwordIsInvalid =
		form.password.length > 0 && !isPasswordValid(form.password);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		event.stopPropagation();

		const username = form.username.trim();
		if (!username || !isPasswordValid(form.password)) return;

		await createUser({ ...form, username });
		await queryClient.invalidateQueries({ queryKey: ["users"] });
		setOpen(false);
		setForm(EMPTY_FORM);
	}

	function reset() {
		setForm(EMPTY_FORM);
		setShowPassword(false);
	}

	return (
		<Dialog
			open={open}
			onOpenChange={setOpen}
			onOpenChangeComplete={(nextOpen) => !nextOpen && reset()}
		>
			<DialogTrigger render={<Button />}>
				<PlusIcon />
				Create user
			</DialogTrigger>
			<DialogPopup className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Create user</DialogTitle>
					<DialogDescription>
						Add a new user account. Click create when you&apos;re done.
					</DialogDescription>
				</DialogHeader>
				<Form className="contents" onSubmit={handleSubmit}>
					<DialogPanel className="grid gap-4">
						<Field name="username">
							<FieldLabel htmlFor={usernameId}>Username</FieldLabel>
							<Input
								autoComplete="off"
								id={usernameId}
								name="username"
								onChange={(event) =>
									setForm((current) => ({
										...current,
										username: event.target.value,
									}))
								}
								required
								value={form.username}
							/>
						</Field>
						<Field name="password" invalid={passwordIsInvalid}>
							<FieldLabel htmlFor={passwordId}>Password</FieldLabel>
							<PasswordInput
								autoComplete="new-password"
								id={passwordId}
								name="password"
								onChange={(password) =>
									setForm((current) => ({ ...current, password }))
								}
								required
								showPassword={showPassword}
								setShowPassword={setShowPassword}
								value={form.password}
							/>
							{form.password.length > 0 && (
								<ul className="grid gap-1 pt-1">
									{Object.entries(PASSWORD_RULE_LABEL).map(([key, label]) => (
										<li
											className="flex items-center gap-1.5 text-xs text-muted-foreground"
											key={key}
										>
											<CheckIcon
												aria-hidden="true"
												className={
													passwordChecks[key as keyof typeof passwordChecks]
														? "size-3.5 text-success-foreground"
														: "size-3.5 opacity-30"
												}
											/>
											{label}
										</li>
									))}
								</ul>
							)}
						</Field>
						<EnumFieldSelect
							label="Role"
							onValueChange={(role) =>
								setForm((current) => ({ ...current, role }))
							}
							options={editableRoles(currentUser)}
							value={form.role}
						/>
					</DialogPanel>
					<DialogFooter>
						<DialogClose render={<Button type="button" variant="outline" />}>
							Cancel
						</DialogClose>
						<Button
							disabled={passwordIsInvalid || isPending}
							loading={isPending}
							type="submit"
						>
							Create
						</Button>
					</DialogFooter>
				</Form>
			</DialogPopup>
		</Dialog>
	);
}

function EditUserDialog({
	currentUser,
	onOpenChange,
	user,
}: {
	currentUser: UserInfo | undefined;
	onOpenChange: (open: boolean) => void;
	user: UserInfo | null;
}) {
	const queryClient = useQueryClient();
	const passwordId = useId();
	const [form, setForm] = useState<UpdateUserRequest>({});
	const [showPassword, setShowPassword] = useState(false);
	const { isPending, mutateAsync: editUser } = useMutation(
		userMutation.editUser(),
	);
	const { mutateAsync: logout } = useMutation(authMutations.logout());
	const canChangeRole = !(
		currentUser &&
		user &&
		currentUser.id === user.id &&
		currentUser.roles.includes("Owner")
	);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		event.stopPropagation();
		if (!user) return;

		const body: UpdateUserRequest = {};
		const username = (form.username ?? user.userName).trim();
		if (username) body.username = username;
		if (form.password) body.password = form.password;
		body.role = form.role ?? (user.roles[0] as Role);

		await editUser({ id: user.id, ...body });
		queryClient.invalidateQueries({ queryKey: ["users"] });
		onOpenChange(false);

		if (currentUser && user.id === currentUser.id) {
			await logout();
			queryClient.invalidateQueries({ queryKey: ["auth"] });
		}
	}

	function reset() {
		setForm({});
		setShowPassword(false);
	}

	return (
		<Dialog
			open={!!user}
			onOpenChange={onOpenChange}
			onOpenChangeComplete={(open) => !open && reset()}
		>
			<DialogPopup className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Edit user</DialogTitle>
					<DialogDescription>
						Update user details. Leave password empty to keep current.
					</DialogDescription>
				</DialogHeader>
				<Form className="contents" onSubmit={handleSubmit}>
					<DialogPanel className="grid gap-4">
						<Field name="username">
							<FieldLabel>Username</FieldLabel>
							<Input
								autoComplete="off"
								name="username"
								onChange={(event) =>
									setForm((current) => ({
										...current,
										username: event.target.value,
									}))
								}
								value={form.username ?? user?.userName ?? ""}
							/>
						</Field>
						<Field name="password">
							<FieldLabel htmlFor={passwordId}>New password</FieldLabel>
							<PasswordInput
								autoComplete="new-password"
								id={passwordId}
								name="password"
								onChange={(password) =>
									setForm((current) => ({ ...current, password }))
								}
								showPassword={showPassword}
								setShowPassword={setShowPassword}
								value={form.password ?? ""}
							/>
						</Field>
						{canChangeRole && (
							<EnumFieldSelect
								label="Role"
								onValueChange={(role) =>
									setForm((current) => ({ ...current, role: role as Role }))
								}
								options={editableRoles(currentUser)}
								value={form.role ?? user?.roles[0] ?? "User"}
							/>
						)}
					</DialogPanel>
					<DialogFooter>
						<DialogClose render={<Button type="button" variant="outline" />}>
							Cancel
						</DialogClose>
						<Button disabled={isPending} loading={isPending} type="submit">
							Save
						</Button>
					</DialogFooter>
				</Form>
			</DialogPopup>
		</Dialog>
	);
}

function PasswordInput({
	autoComplete,
	id,
	name,
	onChange,
	required,
	setShowPassword,
	showPassword,
	value,
}: {
	autoComplete: string;
	id: string;
	name: string;
	onChange: (value: string) => void;
	required?: boolean;
	setShowPassword: (show: boolean) => void;
	showPassword: boolean;
	value: string;
}) {
	return (
		<InputGroup>
			<InputGroupInput
				autoComplete={autoComplete}
				id={id}
				name={name}
				onChange={(event) => onChange(event.target.value)}
				required={required}
				type={showPassword ? "text" : "password"}
				value={value}
			/>
			<InputGroupAddon align="inline-end">
				<Button
					aria-label={showPassword ? "Hide password" : "Show password"}
					onClick={() => setShowPassword(!showPassword)}
					size="icon-xs"
					variant="ghost"
					type="button"
				>
					{showPassword ? <EyeOffIcon /> : <EyeIcon />}
				</Button>
			</InputGroupAddon>
		</InputGroup>
	);
}
