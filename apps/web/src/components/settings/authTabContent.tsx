import { startRegistration } from "@simplewebauthn/browser";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	CircleHelpIcon,
	KeyRoundIcon,
	MonitorSmartphoneIcon,
	PencilIcon,
	PlusIcon,
	Trash2Icon,
} from "lucide-react";
import type { FormEvent } from "react";
import { useId, useState } from "react";

import {
	AlertDialog,
	AlertDialogClose,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogPopup,
	AlertDialogTitle,
} from "#/components/coss/alert-dialog";
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/coss/table";
import { toastManager } from "#/components/coss/toast";
import {
	deletePasskey,
	getPasskeys,
	passkeyRegistrationOptions,
	registerPasskey,
	renamePasskey,
} from "#/lib/api/auth";
import type { Passkey } from "#/lib/api/auth";
import { formatDate } from "#/lib/utils/date";

const PASSKEYS_QUERY_KEY = ["auth", "passkeys"] as const;

type AuthTypeIcon = "DEVICE" | "KEY" | "UNKNOWN";

const AUTH_TYPE_ICON = {
	DEVICE: MonitorSmartphoneIcon,
	KEY: KeyRoundIcon,
	UNKNOWN: CircleHelpIcon,
} satisfies Record<AuthTypeIcon, typeof CircleHelpIcon>;

const AUTH_TYPE_LABEL = {
	DEVICE: "Device passkey",
	KEY: "Security key",
	UNKNOWN: "Unknown passkey type",
} satisfies Record<AuthTypeIcon, string>;

function getAuthTypeIcon(device: string[], deviceType: string): AuthTypeIcon {
	const normalizedDeviceType = deviceType.toLowerCase();
	const isDevice =
		device.includes("platform") ||
		device.includes("internal") ||
		normalizedDeviceType === "multidevice";
	const isKey =
		normalizedDeviceType === "singledevice" ||
		device.some((transport) =>
			["usb", "nfc", "ble"].includes(transport.toLowerCase()),
		);

	if (isDevice) return "DEVICE";
	if (isKey) return "KEY";
	return "UNKNOWN";
}

export function AuthTabContent() {
	const [editingPasskey, setEditingPasskey] = useState<Passkey | null>(null);
	const [deletingPasskey, setDeletingPasskey] = useState<Passkey | null>(null);
	const {
		data: passkeys = [],
		isError,
		isPending,
	} = useQuery({
		queryKey: PASSKEYS_QUERY_KEY,
		queryFn: getPasskeys,
	});

	return (
		<section className="flex flex-col gap-4">
			<div className="flex items-center justify-between gap-2">
				<div>
					<h2 className="font-heading text-xl font-semibold tracking-tight">
						Web authentication
					</h2>
					<p className="text-sm text-muted-foreground">
						Manage your passkeys for passwordless sign-in.
					</p>
				</div>
				<CreatePasskeyDialog onCreated={setEditingPasskey} />
			</div>

			<EditPasskeyDialog
				onOpenChange={(open) => !open && setEditingPasskey(null)}
				passkey={editingPasskey}
			/>
			<DeletePasskeyDialog
				onOpenChange={(open) => !open && setDeletingPasskey(null)}
				passkey={deletingPasskey}
			/>

			<div className="rounded-lg border">
				<Table>
					<TableHeader>
						<TableRow className="hover:bg-transparent">
							<TableHead>Name</TableHead>
							<TableHead>Created</TableHead>
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
						) : isError ? (
							<TableRow>
								<TableCell className="h-24 text-center" colSpan={4}>
									Failed to load passkeys.
								</TableCell>
							</TableRow>
						) : passkeys.length === 0 ? (
							<TableRow>
								<TableCell className="h-24 text-center" colSpan={4}>
									No passkeys found.
								</TableCell>
							</TableRow>
						) : (
							passkeys.map((passkey) => {
								const authType = getAuthTypeIcon(
									passkey.transports,
									passkey.deviceType,
								);
								const AuthIcon = AUTH_TYPE_ICON[authType];

								return (
								<TableRow key={passkey.id}>
									<TableCell className="font-medium">
										<div className="flex items-center gap-2">
											<AuthIcon
												aria-label={AUTH_TYPE_LABEL[authType]}
												className="size-4 text-muted-foreground"
											/>
											{passkey.name.trim() || (
												<span className="text-muted-foreground">
													Unnamed passkey
												</span>
											)}
										</div>
									</TableCell>
									<TableCell>
										<time dateTime={passkey.createdAt}>
											{formatDate(passkey.createdAt)}
										</time>
									</TableCell>
									<TableCell className="max-w-72 truncate font-mono text-xs text-muted-foreground">
										{passkey.id}
									</TableCell>
									<TableCell className="w-0">
										<div className="flex justify-end gap-1">
											<Button
												aria-label={`Rename ${passkey.name || "passkey"}`}
												onClick={() => setEditingPasskey(passkey)}
												size="icon-xs"
												type="button"
												variant="ghost"
											>
												<PencilIcon />
											</Button>
											<Button
												aria-label={`Delete ${passkey.name || "passkey"}`}
												onClick={() => setDeletingPasskey(passkey)}
												size="icon-xs"
												type="button"
												variant="ghost"
											>
												<Trash2Icon />
											</Button>
										</div>
									</TableCell>
								</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
			</div>
		</section>
	);
}

function CreatePasskeyDialog({
	onCreated,
}: {
	onCreated: (passkey: Passkey) => void;
}) {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const { isPending, mutateAsync: createPasskey } = useMutation({
		mutationFn: async () => {
			const optionsJSON = await passkeyRegistrationOptions();
			const attResp = await startRegistration({ optionsJSON });
			return registerPasskey(attResp);
		},
	});

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		event.stopPropagation();

		try {
			const createdPasskey = await createPasskey();
			await queryClient.invalidateQueries({ queryKey: PASSKEYS_QUERY_KEY });
			setOpen(false);
			onCreated(createdPasskey);
		} catch (error) {
			showError("Passkey registration failed", error);
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button />}>
				<PlusIcon />
				Create passkey
			</DialogTrigger>
			<DialogPopup className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Create passkey</DialogTitle>
					<DialogDescription>
						Your browser will ask you to choose a device or authenticator.
					</DialogDescription>
				</DialogHeader>
				<Form className="contents" onSubmit={handleSubmit}>
					<DialogPanel>
						<p className="text-sm text-muted-foreground">
							After creation, you&apos;ll name the passkey.
						</p>
					</DialogPanel>
					<DialogFooter>
						<DialogClose render={<Button type="button" variant="outline" />}>
							Cancel
						</DialogClose>
						<Button disabled={isPending} loading={isPending} type="submit">
							Create
						</Button>
					</DialogFooter>
				</Form>
			</DialogPopup>
		</Dialog>
	);
}

function EditPasskeyDialog({
	onOpenChange,
	passkey,
}: {
	onOpenChange: (open: boolean) => void;
	passkey: Passkey | null;
}) {
	const queryClient = useQueryClient();
	const nameId = useId();
	const { isPending, mutateAsync: editPasskey } = useMutation({
		mutationFn: renamePasskey,
	});

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		event.stopPropagation();
		if (!passkey) return;

		const name = new FormData(event.currentTarget).get("name");
		const nextName = typeof name === "string" ? name.trim() : "";
		if (!nextName) return;

		try {
			await editPasskey({ id: passkey.id, name: nextName });
			await queryClient.invalidateQueries({ queryKey: PASSKEYS_QUERY_KEY });
			onOpenChange(false);
		} catch (error) {
			showError("Passkey rename failed", error);
		}
	}

	return (
		<Dialog open={!!passkey} onOpenChange={onOpenChange}>
			<DialogPopup className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>
						{passkey?.name.trim() ? "Rename passkey" : "Name passkey"}
					</DialogTitle>
					<DialogDescription>
						{passkey?.name.trim()
							? "Give this passkey a name you recognize."
							: "Add a name so you can recognize this passkey later."}
					</DialogDescription>
				</DialogHeader>
				<Form className="contents" onSubmit={handleSubmit}>
					<DialogPanel>
						<Field name="name">
							<FieldLabel htmlFor={nameId}>Name</FieldLabel>
							<Input
								autoComplete="off"
								defaultValue={passkey?.name ?? ""}
								id={nameId}
								key={passkey?.id}
								name="name"
								required
							/>
						</Field>
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

function DeletePasskeyDialog({
	onOpenChange,
	passkey,
}: {
	onOpenChange: (open: boolean) => void;
	passkey: Passkey | null;
}) {
	const queryClient = useQueryClient();
	const { isPending, mutateAsync: removePasskey } = useMutation({
		mutationFn: deletePasskey,
	});

	async function handleDelete() {
		if (!passkey) return;

		try {
			await removePasskey(passkey.id);
			await queryClient.invalidateQueries({ queryKey: PASSKEYS_QUERY_KEY });
			onOpenChange(false);
		} catch (error) {
			showError("Passkey delete failed", error);
		}
	}

	return (
		<AlertDialog open={!!passkey} onOpenChange={onOpenChange}>
			<AlertDialogPopup className="sm:max-w-sm">
				<AlertDialogHeader>
					<AlertDialogTitle>Delete passkey?</AlertDialogTitle>
					<AlertDialogDescription>
						This removes {passkey?.name || "this passkey"} from your account.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogClose
						render={
							<Button disabled={isPending} type="button" variant="outline" />
						}
					>
						Cancel
					</AlertDialogClose>
					<Button
						disabled={isPending}
						loading={isPending}
						onClick={handleDelete}
						type="button"
						variant="destructive"
					>
						Delete
					</Button>
				</AlertDialogFooter>
			</AlertDialogPopup>
		</AlertDialog>
	);
}

function showError(title: string, error: unknown) {
	toastManager.add({
		description: error instanceof Error ? error.message : undefined,
		title,
		type: "error",
	});
}
