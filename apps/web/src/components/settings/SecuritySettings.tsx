import { startRegistration } from "@simplewebauthn/browser";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
	FingerprintIcon,
	KeyRoundIcon,
	LaptopIcon,
	PencilIcon,
	PlusIcon,
	SmartphoneIcon,
	Trash2Icon,
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
import { Field, FieldLabel } from "#/components/base/field";
import { Input } from "#/components/base/input";
import { toastManager } from "#/components/base/toast";
import {
	ConfirmDialog,
	SettingsEmpty,
	SettingsError,
	SettingsList,
	SettingsListSkeleton,
	SettingsRow,
	SettingsSection,
	useDialogSubject,
} from "#/components/settings/SettingsSection";
import type { DialogControl } from "#/components/settings/SettingsSection";
import {
	deletePasskey,
	getPasskeys,
	passkeyRegistrationOptions,
	registerPasskey,
	renamePasskey,
} from "#/lib/api/auth";
import type { Passkey } from "#/lib/api/auth";
import { authMutations, authQueries } from "#/lib/queries/auth.queries";
import type { AuthSession } from "#/lib/queries/auth.queries";
import { formatDate, formatRelativeTime } from "#/lib/utils/date";
import { describeUserAgent } from "#/store/playbackDeviceStore";

const PASSKEYS_QUERY_KEY = ["auth", "passkeys"] as const;

export function SecuritySettings() {
	return (
		<div className="flex flex-col gap-10">
			<PasskeysSection />
			<SessionsSection />
		</div>
	);
}

function PasskeysSection() {
	const queryClient = useQueryClient();
	const renaming = useDialogSubject<Passkey>();
	const deleting = useDialogSubject<Passkey>();
	const passkeys = useQuery({
		queryKey: PASSKEYS_QUERY_KEY,
		queryFn: getPasskeys,
	});
	const create = useMutation({
		mutationFn: async () => {
			const optionsJSON = await passkeyRegistrationOptions();
			return registerPasskey(await startRegistration({ optionsJSON }));
		},
		onSuccess: async (passkey) => {
			await queryClient.invalidateQueries({ queryKey: PASSKEYS_QUERY_KEY });
			renaming.show(passkey);
		},
		onError: (error) =>
			toastManager.add({
				type: "error",
				title: "Could not add the passkey",
				description: error.message,
			}),
	});
	const remove = useMutation({
		mutationFn: (passkey: Passkey) => deletePasskey(passkey.id),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: PASSKEYS_QUERY_KEY });
			deleting.close();
		},
	});

	return (
		<SettingsSection
			action={
				<Button
					disabled={create.isPending}
					onClick={() => create.mutate()}
					type="button"
					variant="outline"
				>
					<PlusIcon />
					{create.isPending ? "Waiting for passkey…" : "Add passkey"}
				</Button>
			}
			description="Sign in with your device's screen lock or a security key instead of a password."
			title="Passkeys"
		>
			{passkeys.isPending ? (
				<SettingsListSkeleton />
			) : passkeys.isError ? (
				<SettingsError
					message="Passkeys could not be loaded."
					onRetry={() => void passkeys.refetch()}
				/>
			) : passkeys.data.length === 0 ? (
				<SettingsEmpty
					description="Add one to sign in without typing your password."
					icon={<FingerprintIcon />}
					title="No passkeys yet"
				/>
			) : (
				<SettingsList>
					{passkeys.data.map((passkey) => {
						const name = passkey.name.trim() || "Unnamed passkey";
						return (
							<SettingsRow
								actions={
									<>
										<Button
											aria-label={`Rename ${name}`}
											onClick={() => renaming.show(passkey)}
											size="icon-sm"
											type="button"
											variant="ghost"
										>
											<PencilIcon />
										</Button>
										<Button
											aria-label={`Delete ${name}`}
											onClick={() => {
												remove.reset();
												deleting.show(passkey);
											}}
											size="icon-sm"
											type="button"
											variant="ghost"
										>
											<Trash2Icon />
										</Button>
									</>
								}
								details={`${passkeyKind(passkey)} · Added ${formatDate(passkey.createdAt)}`}
								icon={
									isDevicePasskey(passkey) ? (
										<FingerprintIcon />
									) : (
										<KeyRoundIcon />
									)
								}
								key={passkey.id}
								title={name}
							/>
						);
					})}
				</SettingsList>
			)}

			{renaming.subject && (
				<RenamePasskeyDialog control={renaming} passkey={renaming.subject} />
			)}
			<ConfirmDialog
				confirmLabel="Delete passkey"
				description={`“${deleting.subject?.name.trim() || "This passkey"}” will no longer sign you in.`}
				mutation={remove}
				onConfirm={() => deleting.subject && remove.mutate(deleting.subject)}
				onOpenChange={(open) => !open && deleting.close()}
				onOpenChangeComplete={deleting.onOpenChangeComplete}
				open={deleting.open}
				pendingLabel="Deleting…"
				title="Delete passkey?"
			/>
		</SettingsSection>
	);
}

function isDevicePasskey(passkey: Passkey) {
	return (
		passkey.deviceType.toLowerCase() === "multidevice" ||
		passkey.transports.some((transport) =>
			["internal", "hybrid"].includes(transport.toLowerCase()),
		)
	);
}

function passkeyKind(passkey: Passkey) {
	return isDevicePasskey(passkey) ? "Synced passkey" : "Security key";
}

function RenamePasskeyDialog({
	control,
	passkey,
}: {
	control: DialogControl;
	passkey: Passkey;
}) {
	const queryClient = useQueryClient();
	const [name, setName] = useState(passkey.name);
	const mutation = useMutation({
		mutationFn: () => renamePasskey({ id: passkey.id, name: name.trim() }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: PASSKEYS_QUERY_KEY });
			control.close();
		},
	});

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
					<DialogTitle>
						{passkey.name.trim() ? "Rename passkey" : "Name your passkey"}
					</DialogTitle>
					<DialogDescription>
						Use a name that tells you which device or key this is.
					</DialogDescription>
				</DialogHeader>
				<form
					className="contents"
					onSubmit={(event) => {
						event.preventDefault();
						if (name.trim() && !mutation.isPending) mutation.mutate();
					}}
				>
					<DialogPanel>
						<div className="grid gap-4">
							<Field>
								<FieldLabel>Name</FieldLabel>
								<Input
									autoComplete="off"
									disabled={mutation.isPending}
									maxLength={100}
									onChange={(event) => setName(event.target.value)}
									required
									value={name}
								/>
							</Field>
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
							{passkey.name.trim() ? "Cancel" : "Skip"}
						</DialogClose>
						<Button disabled={!name.trim() || mutation.isPending} type="submit">
							{mutation.isPending ? "Saving…" : "Save"}
						</Button>
					</DialogFooter>
				</form>
			</DialogPopup>
		</Dialog>
	);
}

function SessionsSection() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const revoking = useDialogSubject<AuthSession>();
	const sessions = useQuery(authQueries.sessions());
	const revoke = useMutation({
		...authMutations.revokeSession(),
		onSuccess: async (_, id) => {
			revoking.close();
			if (sessions.data?.find((session) => session.id === id)?.isCurrent) {
				queryClient.removeQueries({ queryKey: ["auth"] });
				await navigate({ to: "/login", search: { redirect: "" } });
				return;
			}
			await queryClient.invalidateQueries({
				queryKey: authQueries.sessions().queryKey,
			});
		},
	});

	return (
		<SettingsSection
			description="Devices and browsers signed in to your account. A session ends after 30 days without use."
			title="Sessions"
		>
			{sessions.isPending ? (
				<SettingsListSkeleton rows={3} />
			) : sessions.isError ? (
				<SettingsError
					message="Sessions could not be loaded."
					onRetry={() => void sessions.refetch()}
				/>
			) : (
				<SettingsList>
					{sessions.data.map((session) => (
						<SettingsRow
							actions={
								<Button
									onClick={() => {
										revoke.reset();
										revoking.show(session);
									}}
									size="sm"
									type="button"
									variant="ghost"
								>
									Sign out
								</Button>
							}
							badges={
								session.isCurrent && (
									<Badge variant="success">This device</Badge>
								)
							}
							details={sessionDetails(session)}
							icon={
								session.client === "App" ? <SmartphoneIcon /> : <LaptopIcon />
							}
							key={session.id}
							title={sessionName(session)}
						/>
					))}
				</SettingsList>
			)}

			<ConfirmDialog
				confirmLabel="Sign out"
				description={
					revoking.subject?.isCurrent
						? "You will be signed out of this browser."
						: `${revoking.subject ? sessionName(revoking.subject) : "This device"} will need to sign in again.`
				}
				mutation={revoke}
				onConfirm={() => revoking.subject && revoke.mutate(revoking.subject.id)}
				onOpenChange={(open) => !open && revoking.close()}
				onOpenChangeComplete={revoking.onOpenChangeComplete}
				open={revoking.open}
				pendingLabel="Signing out…"
				title={
					revoking.subject?.isCurrent ? "Sign out here?" : "Sign out device?"
				}
			/>
		</SettingsSection>
	);
}

// Web sessions created without a device name are labelled with the raw user agent.
function sessionName(session: AuthSession) {
	return session.name.startsWith("Mozilla/")
		? describeUserAgent(session.name)
		: session.name;
}

function sessionDetails(session: AuthSession) {
	return [
		session.client === "App" ? "App" : "Browser",
		session.ipAddress,
		`Signed in ${formatDate(session.createdAt)}`,
		session.lastUsedAt && `Active ${formatRelativeTime(session.lastUsedAt)}`,
	]
		.filter(Boolean)
		.join(" · ");
}
