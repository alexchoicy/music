import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Alert, AlertDescription } from "#/components/coss/alert";
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
} from "#/components/coss/dialog";
import { Field, FieldLabel } from "#/components/coss/field";
import { Input } from "#/components/coss/input";
import { useUserInfo } from "#/context/UserInfoContext";
import { playlistActions } from "#/lib/queries/playlist.queries";
import type { PlaylistDetails } from "#/lib/queries/playlist.queries";

export function PlaylistNameDialog({
	playlist,
	onClose,
	onCreated,
}: {
	playlist?: Pick<PlaylistDetails, "playlistId" | "name" | "version">;
	onClose: () => void;
	onCreated?: (id: PlaylistDetails["playlistId"]) => void;
}) {
	const [name, setName] = useState(playlist?.name ?? "");
	const user = useUserInfo();
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: async () => {
			if (playlist) {
				await playlistActions.rename(playlist.playlistId, {
					name: name.trim(),
					version: playlist.version,
				});
				return playlist.playlistId;
			}
			return (await playlistActions.create({ name: name.trim() })).playlistId;
		},
		onSuccess: (id) => {
			onClose();
			if (!playlist) onCreated?.(id);
		},
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: ["playlists", user.id] }),
	});
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !mutation.isPending) onClose();
			}}
		>
			<DialogPopup showCloseButton={!mutation.isPending}>
				<DialogHeader>
					<DialogTitle>
						{playlist ? "Rename playlist" : "Create playlist"}
					</DialogTitle>
					<DialogDescription>
						Give your personal playlist a name.
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
									autoFocus
									required
									maxLength={200}
									value={name}
									disabled={mutation.isPending}
									onChange={(event) => setName(event.target.value)}
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
							Cancel
						</DialogClose>
						<Button type="submit" disabled={!name.trim() || mutation.isPending}>
							{mutation.isPending ? "Saving…" : playlist ? "Save" : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogPopup>
		</Dialog>
	);
}
