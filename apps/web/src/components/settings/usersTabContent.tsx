import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	CheckIcon,
	EyeIcon,
	EyeOffIcon,
	PencilIcon,
	PlusIcon,
} from "lucide-react";
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

type CreateUserForm = Pick<CreateUserRequest, "password" | "role" | "username">;

const EMPTY_FORM: CreateUserForm = {
	password: "",
	role: "User",
	username: "",
};

const EDITABLE_ROLES = (currentUser: UserInfo | undefined) =>
	ROLE_OPTIONS.filter(
		(o) =>
			o.value !== "Owner" &&
			(currentUser?.roles.includes("Owner") || o.value !== "Admin"),
	);

export function UsersTabContent() {
	const queryClient = useQueryClient();
	const usernameId = useId();
	const passwordId = useId();
	const editPasswordId = useId();
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [createForm, setCreateForm] = useState<CreateUserForm>(EMPTY_FORM);
	const [showPassword, setShowPassword] = useState(false);

	const [isEditOpen, setIsEditOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
	const [editForm, setEditForm] = useState<
		components["schemas"]["UpdateUserRequest"]
	>({});
	const [editShowPassword, setEditShowPassword] = useState(false);

	const { data: users = [], isPending } = useQuery(userQuery.getUsers());
	const { data: currentUser } = useQuery(authQueries.userInfo());

	const { isPending: isCreating, mutateAsync: createUser } = useMutation(
		userMutation.addUser(),
	);
	const { isPending: isEditing, mutateAsync: editUser } = useMutation(
		userMutation.editUser(),
	);
	const { mutateAsync: logout } = useMutation(authMutations.logout());

	const passwordChecks = checkPassword(createForm.password);
	const passwordIsInvalid =
		createForm.password.length > 0 && !isPasswordValid(createForm.password);
	const canEditUser = (user: UserInfo) =>
		currentUser &&
		(currentUser.roles.includes("Owner") ||
			user.id === currentUser.id ||
			(currentUser.roles.includes("Admin") &&
				(user.roles.includes("User") || user.roles.includes("Uploader"))));

	async function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		event.stopPropagation();

		const username = createForm.username.trim();
		if (!username || !isPasswordValid(createForm.password)) return;

		await createUser({ ...createForm, username });
		await queryClient.invalidateQueries({ queryKey: ["users"] });
		setIsCreateOpen(false);
		setCreateForm(EMPTY_FORM);
	}

	async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		event.stopPropagation();

		if (!editingUser) return;

		const body: components["schemas"]["UpdateUserRequest"] = {};
		if (editForm.username?.trim()) body.username = editForm.username.trim();
		if (editForm.password) body.password = editForm.password;
		if (editForm.role) body.role = editForm.role;

		await editUser({ id: editingUser.id, ...body });
		queryClient.invalidateQueries({ queryKey: ["users"] });

		setIsEditOpen(false);

		if (currentUser && editingUser.id === currentUser.id) {
			await logout();
			queryClient.invalidateQueries({ queryKey: ["auth"] });
		}
	}

	return (
		<section className="flex flex-col gap-4">
			<div className="flex items-center justify-between gap-2">
				<div>
					<h2 className="font-heading text-xl font-semibold tracking-tight">
						Users
					</h2>
					<p className="text-sm text-muted-foreground">
						Manage who can access this instance.
					</p>
				</div>
				<Dialog
					open={isCreateOpen}
					onOpenChange={setIsCreateOpen}
					onOpenChangeComplete={(open) => {
						if (!open) {
							setCreateForm(EMPTY_FORM);
							setShowPassword(false);
						}
					}}
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
						<Form className="contents" onSubmit={handleCreateSubmit}>
							<DialogPanel className="grid gap-4">
								<Field name="username">
									<FieldLabel htmlFor={usernameId}>Username</FieldLabel>
									<Input
										autoComplete="off"
										id={usernameId}
										name="username"
										onChange={(event) => {
											setCreateForm((current) => ({
												...current,
												username: event.target.value,
											}));
										}}
										required
										value={createForm.username}
									/>
								</Field>
								<Field name="password" invalid={passwordIsInvalid}>
									<FieldLabel htmlFor={passwordId}>Password</FieldLabel>
									<InputGroup>
										<InputGroupInput
											id={passwordId}
											name="password"
											onChange={(event) => {
												setCreateForm((current) => ({
													...current,
													password: event.target.value,
												}));
											}}
											required
											type={showPassword ? "text" : "password"}
											value={createForm.password}
											autoComplete="new-password"
										/>
										<InputGroupAddon align="inline-end">
											<Button
												aria-label={
													showPassword ? "Hide password" : "Show password"
												}
												onClick={() => setShowPassword(!showPassword)}
												size="icon-xs"
												variant="ghost"
												type="button"
											>
												{showPassword ? <EyeOffIcon /> : <EyeIcon />}
											</Button>
										</InputGroupAddon>
									</InputGroup>
									{createForm.password.length > 0 && (
										<ul className="grid gap-1 pt-1">
											{(
												Object.keys(
													PASSWORD_RULE_LABEL,
												) as (keyof typeof PASSWORD_RULE_LABEL)[]
											).map((key) => (
												<li
													className="flex items-center gap-1.5 text-xs text-muted-foreground"
													key={key}
												>
													<CheckIcon
														aria-hidden="true"
														className={
															passwordChecks[key]
																? "size-3.5 text-success-foreground"
																: "size-3.5 opacity-30"
														}
													/>
													{PASSWORD_RULE_LABEL[key]}
												</li>
											))}
										</ul>
									)}
								</Field>
								<EnumFieldSelect
									label="Role"
									onValueChange={(role) => {
										setCreateForm((current) => ({
											...current,
											role: role,
										}));
									}}
									options={EDITABLE_ROLES(currentUser)}
									value={createForm.role}
								/>
							</DialogPanel>
							<DialogFooter>
								<DialogClose
									render={<Button type="button" variant="outline" />}
								>
									Cancel
								</DialogClose>
								<Button
									disabled={passwordIsInvalid || isCreating}
									loading={isCreating}
									type="submit"
								>
									Create
								</Button>
							</DialogFooter>
						</Form>
					</DialogPopup>
				</Dialog>
			</div>

			<Dialog
				open={isEditOpen}
				onOpenChange={setIsEditOpen}
				onOpenChangeComplete={(open) => {
					if (!open) {
						setEditingUser(null);
						setEditForm({});
						setEditShowPassword(false);
					}
				}}
			>
				<DialogPopup className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>Edit user</DialogTitle>
						<DialogDescription>
							Update user details. Leave password empty to keep current.
						</DialogDescription>
					</DialogHeader>
					<Form className="contents" onSubmit={handleEditSubmit}>
						<DialogPanel className="grid gap-4">
							<Field name="username">
								<FieldLabel>Username</FieldLabel>
								<Input
									autoComplete="off"
									name="username"
									onChange={(event) => {
										setEditForm((current) => ({
											...current,
											username: event.target.value,
										}));
									}}
									value={editForm.username ?? editingUser?.userName ?? ""}
								/>
							</Field>
							<Field name="password">
								<FieldLabel>New password</FieldLabel>
								<InputGroup>
									<InputGroupInput
										id={editPasswordId}
										name="password"
										onChange={(event) => {
											setEditForm((current) => ({
												...current,
												password: event.target.value,
											}));
										}}
										type={editShowPassword ? "text" : "password"}
										value={editForm.password ?? ""}
										autoComplete="new-password"
									/>
									<InputGroupAddon align="inline-end">
										<Button
											aria-label={
												editShowPassword ? "Hide password" : "Show password"
											}
											onClick={() => setEditShowPassword(!editShowPassword)}
											size="icon-xs"
											variant="ghost"
											type="button"
										>
											{editShowPassword ? <EyeOffIcon /> : <EyeIcon />}
										</Button>
									</InputGroupAddon>
								</InputGroup>
							</Field>
							{currentUser &&
							editingUser &&
							currentUser.id === editingUser.id &&
							currentUser.roles.includes("Owner") ? null : (
								<EnumFieldSelect
									label="Role"
									onValueChange={(role) => {
										setEditForm((current) => ({
											...current,
											role: role as components["schemas"]["Roles"],
										}));
									}}
									options={EDITABLE_ROLES(currentUser)}
									value={editForm.role ?? editingUser?.roles[0] ?? "User"}
								/>
							)}
						</DialogPanel>
						<DialogFooter>
							<DialogClose render={<Button type="button" variant="outline" />}>
								Cancel
							</DialogClose>
							<Button disabled={isEditing} loading={isEditing} type="submit">
								Save
							</Button>
						</DialogFooter>
					</Form>
				</DialogPopup>
			</Dialog>

			<div className="rounded-lg border">
				<Table>
					<TableHeader>
						<TableRow className="hover:bg-transparent">
							<TableHead>Username</TableHead>
							<TableHead>Roles</TableHead>
							<TableHead>ID</TableHead>
							<TableHead className="w-0" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{isPending ? (
							<TableRow>
								<TableCell className="h-24 text-center" colSpan={4}>
									Loading...
								</TableCell>
							</TableRow>
						) : users.length === 0 ? (
							<TableRow>
								<TableCell className="h-24 text-center" colSpan={4}>
									No users found.
								</TableCell>
							</TableRow>
						) : (
							users.map((user) => (
								<TableRow key={user.id}>
									<TableCell className="font-medium">
										<div className="flex items-center gap-2">
											{user.userName}
											{currentUser && user.id === currentUser.id && (
												<Badge
													variant="outline"
													className="-my-0.5 text-xs font-normal"
												>
													Current user
												</Badge>
											)}
										</div>
									</TableCell>
									<TableCell>
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
									<TableCell className="font-mono text-xs text-muted-foreground">
										{user.id}
									</TableCell>
									<TableCell className="w-0">
										{canEditUser(user) && (
											<Button
												size="icon-xs"
												variant="ghost"
												type="button"
												onClick={() => {
													setEditingUser(user);
													setEditForm({
														username: user.userName,
														role: user
															.roles[0] as components["schemas"]["Roles"],
													});
													setEditShowPassword(false);
													setIsEditOpen(true);
												}}
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
