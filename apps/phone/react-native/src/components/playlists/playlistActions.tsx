import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PlaylistNameSheet } from "@/components/playlists/playlistNameSheet";
import { confirm } from "@/components/ui/confirmDialog";
import { Sheet, SheetAction } from "@/components/ui/sheet";
import { ApiError } from "@/lib/api";
import type { PlaylistListItem } from "@/lib/schema";
import { removePlaylistDownloads } from "@/offline/downloads";
import { useIsOnline } from "@/offline/offlineStore";
import { playlistMutations } from "@/queries/playlists";
import { showToast } from "@/store/toastStore";

type PlaylistTarget = Pick<PlaylistListItem, "playlistId" | "name" | "version">;

type PlaylistActionsProps = {
	/** The playlist the sheet is open for, or null when closed. */
	playlist: PlaylistTarget | null;
	onClose: () => void;
	onDeleted?: () => void;
};

/** Rename and Delete for a playlist, from its page or a long press on its card. */
export function PlaylistActions({
	playlist,
	onClose,
	onDeleted,
}: PlaylistActionsProps) {
	const [renaming, setRenaming] = useState(false);
	// Keeps the content while the sheet animates closed.
	const [shown, setShown] = useState(playlist);
	if (playlist && playlist !== shown) setShown(playlist);
	const isOnline = useIsOnline();
	const queryClient = useQueryClient();

	const remove = useMutation({
		mutationFn: (target: PlaylistTarget) => playlistMutations.delete(target),
		onSuccess: (_, deleted) => {
			removePlaylistDownloads([String(deleted.playlistId)]);
			showToast(`Deleted ${deleted.name}`);
			onDeleted?.();
		},
		onError: (error) =>
			showToast(
				error instanceof ApiError && error.status === 409
					? "The playlist changed elsewhere. Try again."
					: "Couldn't delete the playlist.",
			),
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: ["playlists", "list"] }),
	});

	function confirmDelete(target: PlaylistTarget) {
		onClose();
		confirm({
			title: `Delete ${target.name}?`,
			message: "This can't be undone.",
			confirmLabel: "Delete",
			onConfirm: () => remove.mutate(target),
		});
	}

	return (
		<>
			<Sheet
				description={isOnline ? undefined : "Connect to change playlists."}
				onClose={onClose}
				open={!!playlist && !renaming}
				title={shown?.name ?? ""}
			>
				{shown && (
					<>
						<SheetAction
							disabled={!isOnline}
							icon="edit"
							label="Rename"
							onPress={() => setRenaming(true)}
						/>
						<SheetAction
							destructive
							disabled={!isOnline || remove.isPending}
							icon="delete"
							label="Delete playlist"
							onPress={() => confirmDelete(shown)}
						/>
					</>
				)}
			</Sheet>
			<PlaylistNameSheet
				onClose={() => {
					setRenaming(false);
					onClose();
				}}
				open={!!playlist && renaming}
				playlist={shown ?? undefined}
			/>
		</>
	);
}
