import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "#/components/coss/alert";
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
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "#/components/coss/menu";
import { PlaylistNameDialog } from "#/components/playlists/PlaylistNameDialog";
import { useUserInfo } from "#/context/UserInfoContext";
import {
	playlistActions,
	playlistQueries,
} from "#/lib/queries/playlist.queries";
import type { PlaylistDetails } from "#/lib/queries/playlist.queries";

export function PlaylistActionsMenu({
	playlist,
	disabled,
	onDeleted,
}: {
	playlist: Pick<PlaylistDetails, "playlistId" | "name" | "version">;
	disabled?: boolean;
	onDeleted?: () => Promise<void>;
}) {
	const user = useUserInfo();
	const queryClient = useQueryClient();
	const [renaming, setRenaming] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const mutation = useMutation({
		mutationFn: () =>
			playlistActions.delete(playlist.playlistId, playlist.version),
		onSuccess: async () => {
			setDeleting(false);
			await onDeleted?.();
			queryClient.removeQueries({
				queryKey: playlistQueries.detail(user.id, playlist.playlistId).queryKey,
			});
		},
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: ["playlists", user.id] }),
	});
	return (
		<>
			<Menu>
				<MenuTrigger
					render={
						<Button
							type="button"
							size="icon-sm"
							variant="ghost"
							disabled={disabled || mutation.isPending}
							aria-label={`Playlist actions for ${playlist.name}`}
						/>
					}
				>
					<MoreHorizontalIcon aria-hidden="true" />
				</MenuTrigger>
				<MenuPopup align="end">
					<MenuItem onClick={() => setRenaming(true)}>
						<PencilIcon aria-hidden="true" />
						Rename playlist
					</MenuItem>
					<MenuItem
						variant="destructive"
						onClick={() => {
							mutation.reset();
							setDeleting(true);
						}}
					>
						<Trash2Icon aria-hidden="true" />
						Delete playlist
					</MenuItem>
				</MenuPopup>
			</Menu>
			{renaming && (
				<PlaylistNameDialog
					playlist={playlist}
					onClose={() => setRenaming(false)}
				/>
			)}
			<AlertDialog
				open={deleting}
				onOpenChange={(open) => {
					if (!mutation.isPending) setDeleting(open);
				}}
			>
				<AlertDialogPopup>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete playlist?</AlertDialogTitle>
						<AlertDialogDescription>
							Delete “{playlist.name}” from your playlists. Its library tracks
							and files will remain.
						</AlertDialogDescription>
					</AlertDialogHeader>
					{mutation.error && (
						<Alert variant="error" className="mx-6 mb-4">
							<AlertDescription>{mutation.error.message}</AlertDescription>
						</Alert>
					)}
					<AlertDialogFooter>
						<AlertDialogClose
							disabled={mutation.isPending}
							render={<Button type="button" variant="ghost" />}
						>
							Cancel
						</AlertDialogClose>
						<Button
							type="button"
							variant="destructive"
							disabled={mutation.isPending}
							onClick={() => mutation.mutate()}
						>
							{mutation.isPending ? "Deleting…" : "Delete playlist"}
						</Button>
					</AlertDialogFooter>
				</AlertDialogPopup>
			</AlertDialog>
		</>
	);
}
