import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CopyIcon, KeyRoundIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "#/components/base/alert";
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
import { authMutations, authQueries } from "#/lib/queries/auth.queries";
import type { ApiKey } from "#/lib/queries/auth.queries";
import { formatDate, formatRelativeTime } from "#/lib/utils/date";

export function ApiKeysSettings() {
	const queryClient = useQueryClient();
	const creating = useDialogSubject<true>();
	const revoking = useDialogSubject<ApiKey>();
	const apiKeys = useQuery(authQueries.apiKeys());
	const revoke = useMutation({
		...authMutations.revokeApiKey(),
		onSuccess: async () => {
			revoking.close();
			await queryClient.invalidateQueries({
				queryKey: authQueries.apiKeys().queryKey,
			});
		},
	});

	return (
		<SettingsSection
			action={
				<Button onClick={() => creating.show(true)} type="button">
					<PlusIcon />
					Create API key
				</Button>
			}
			description="Keys let services such as the web server's link previews read your library. They act as you without admin rights and never expire, so revoke keys you no longer use."
			title="API keys"
		>
			{apiKeys.isPending ? (
				<SettingsListSkeleton />
			) : apiKeys.isError ? (
				<SettingsError
					message="API keys could not be loaded."
					onRetry={() => void apiKeys.refetch()}
				/>
			) : apiKeys.data.length === 0 ? (
				<SettingsEmpty
					description="Create a key for a service that needs to read your library."
					icon={<KeyRoundIcon />}
					title="No API keys"
				/>
			) : (
				<SettingsList>
					{apiKeys.data.map((apiKey) => (
						<SettingsRow
							actions={
								<Button
									onClick={() => {
										revoke.reset();
										revoking.show(apiKey);
									}}
									size="sm"
									type="button"
									variant="ghost"
								>
									Revoke
								</Button>
							}
							details={[
								`Created ${formatDate(apiKey.createdAt)}`,
								apiKey.lastUsedAt
									? `Used ${formatRelativeTime(apiKey.lastUsedAt)}`
									: "Never used",
							].join(" · ")}
							icon={<KeyRoundIcon />}
							key={apiKey.id}
							title={apiKey.name}
						/>
					))}
				</SettingsList>
			)}

			{creating.subject && <CreateApiKeyDialog control={creating} />}
			<ConfirmDialog
				confirmLabel="Revoke key"
				description={`Services using “${revoking.subject?.name ?? "this key"}” will stop working right away.`}
				mutation={revoke}
				onConfirm={() => revoking.subject && revoke.mutate(revoking.subject.id)}
				onOpenChange={(open) => !open && revoking.close()}
				onOpenChangeComplete={revoking.onOpenChangeComplete}
				open={revoking.open}
				pendingLabel="Revoking…"
				title="Revoke API key?"
			/>
		</SettingsSection>
	);
}

function CreateApiKeyDialog({ control }: { control: DialogControl }) {
	const queryClient = useQueryClient();
	const [name, setName] = useState("");
	const mutation = useMutation({
		...authMutations.createApiKey(),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: authQueries.apiKeys().queryKey,
			}),
	});
	const token = mutation.data?.token;

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
						{token ? "Copy your API key" : "Create API key"}
					</DialogTitle>
					<DialogDescription>
						{token
							? "This is the only time the key is shown. Store it somewhere safe."
							: "Name the key after the service that will use it."}
					</DialogDescription>
				</DialogHeader>
				{token ? (
					<>
						<DialogPanel>
							<Field>
								<FieldLabel className="[overflow-wrap:anywhere]">
									{mutation.data?.key.name}
								</FieldLabel>
								<InputGroup>
									<InputGroupInput
										onFocus={(event) => event.currentTarget.select()}
										readOnly
										value={token}
									/>
									<InputGroupAddon align="inline-end">
										<Button
											aria-label="Copy API key"
											onClick={() => void copySecret(token)}
											size="icon-xs"
											type="button"
											variant="ghost"
										>
											<CopyIcon />
										</Button>
									</InputGroupAddon>
								</InputGroup>
								<FieldDescription>
									Send it as <code>Authorization: Bearer &lt;key&gt;</code>.
								</FieldDescription>
							</Field>
						</DialogPanel>
						<DialogFooter>
							<DialogClose render={<Button type="button" />}>Done</DialogClose>
						</DialogFooter>
					</>
				) : (
					<form
						className="contents"
						onSubmit={(event) => {
							event.preventDefault();
							if (name.trim() && !mutation.isPending)
								mutation.mutate(name.trim());
						}}
					>
						<DialogPanel>
							<div className="grid gap-4">
								<Field>
									<FieldLabel>Name</FieldLabel>
									<Input
										autoComplete="off"
										disabled={mutation.isPending}
										maxLength={128}
										onChange={(event) => setName(event.target.value)}
										placeholder="Web link previews"
										required
										value={name}
									/>
								</Field>
								{mutation.error && (
									<Alert variant="error">
										<AlertDescription>
											{mutation.error.message}
										</AlertDescription>
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
							<Button
								disabled={!name.trim() || mutation.isPending}
								type="submit"
							>
								{mutation.isPending ? "Creating…" : "Create key"}
							</Button>
						</DialogFooter>
					</form>
				)}
			</DialogPopup>
		</Dialog>
	);
}

// The shared copy helper echoes the copied text in its toast, which a secret must not do.
async function copySecret(secret: string) {
	try {
		await navigator.clipboard.writeText(secret);
		toastManager.add({ type: "success", title: "API key copied" });
	} catch (error) {
		toastManager.add({
			type: "error",
			title: "Could not copy",
			description: error instanceof Error ? error.message : undefined,
		});
	}
}
