import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "#/components/coss/alert";
import { Button } from "#/components/coss/button";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "#/components/coss/dialog";
import { Field, FieldLabel } from "#/components/coss/field";
import { Input } from "#/components/coss/input";
import { Separator } from "#/components/coss/separator";
import { toastManager } from "#/components/coss/toast";
import { useUserInfo } from "#/context/UserInfoContext";
import {
	playlistActions,
	playlistQueries,
} from "#/lib/queries/playlist.queries";
import type {
	PlaylistListItem,
	PlaylistTrackRequest,
} from "#/lib/queries/playlist.queries";

export function AddToPlaylistDialog({
	tracks,
	onClose,
}: {
	tracks: PlaylistTrackRequest[];
	onClose: () => void;
}) {
	const user = useUserInfo();
	const queryClient = useQueryClient();
	const playlists = useQuery(playlistQueries.list(user.id));
	const [name, setName] = useState("");
	const mutation = useMutation({
		mutationFn: async (selected: PlaylistListItem | null) => {
			const playlist =
				selected ?? (await playlistActions.create({ name: name.trim() }));
			if (!selected) {
				setName("");
				await queryClient.invalidateQueries({
					queryKey: ["playlists", user.id],
				});
			}
			await playlistActions.add(playlist.playlistId, {
				version: playlist.version,
				tracks,
			});
			return playlist.name;
		},
		onSuccess: (playlistName) => {
			toastManager.add({
				title: "Added to playlist",
				description: playlistName,
			});
			onClose();
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
						Add {tracks.length === 1 ? "track" : "tracks"} to playlist
					</DialogTitle>
					<DialogDescription className="sr-only">
						Choose a personal playlist for {tracks.length} track
						{tracks.length === 1 ? "" : "s"}.
					</DialogDescription>
				</DialogHeader>
				<Separator />
				<DialogPanel>
					<div className="grid gap-4">
						{playlists.isPending && (
							<p role="status" className="text-sm text-muted-foreground">
								Loading playlists…
							</p>
						)}
						{playlists.error && (
							<Alert variant="error">
								<AlertDescription>
									{playlists.error.message}{" "}
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => void playlists.refetch()}
									>
										Retry
									</Button>
								</AlertDescription>
							</Alert>
						)}
						{playlists.data?.length === 0 && (
							<p className="text-sm text-muted-foreground">
								Create your first playlist below.
							</p>
						)}
						<div className="grid gap-1">
							{playlists.data?.map((playlist) => (
								<Button
									key={playlist.playlistId}
									className="w-full justify-start"
									variant="ghost"
									size="lg"
									type="button"
									disabled={mutation.isPending}
									onClick={() => mutation.mutate(playlist)}
								>
									<span className="min-w-0 truncate">{playlist.name}</span>
									<span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
										{playlist.trackCount}{" "}
										{playlist.trackCount === 1 ? "entry" : "entries"}
									</span>
								</Button>
							))}
						</div>
						<form
							className="flex items-end gap-2"
							onSubmit={(event) => {
								event.preventDefault();
								if (name.trim() && !mutation.isPending) mutation.mutate(null);
							}}
						>
							<Field className="min-w-0 flex-1">
								<FieldLabel className="sr-only">New playlist name</FieldLabel>
								<Input
									type="text"
									placeholder="New playlist name"
									required
									maxLength={200}
									disabled={mutation.isPending}
									value={name}
									onChange={(event) => setName(event.target.value)}
								/>
							</Field>
							<Button
								type="submit"
								disabled={!name.trim() || mutation.isPending}
							>
								<PlusIcon aria-hidden="true" />
								Create
							</Button>
						</form>
						{mutation.isPending && (
							<p role="status" className="text-sm text-muted-foreground">
								Adding tracks…
							</p>
						)}
						{mutation.error && (
							<Alert variant="error">
								<AlertDescription>{mutation.error.message}</AlertDescription>
							</Alert>
						)}
					</div>
				</DialogPanel>
			</DialogPopup>
		</Dialog>
	);
}
