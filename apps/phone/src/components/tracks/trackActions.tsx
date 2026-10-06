import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";
import { create } from "zustand";

import { PlaylistCover } from "@/components/playlists/playlistCover";
import { PlaylistNameSheet } from "@/components/playlists/playlistNameSheet";
import { ListRow } from "@/components/ui/listRow";
import { Loading } from "@/components/ui/loading";
import { Sheet, SheetAction } from "@/components/ui/sheet";
import { ApiError } from "@/lib/api";
import { plural } from "@/lib/format";
import { openPage } from "@/lib/navigation";
import { queryClient } from "@/lib/queryClient";
import type {
	PlaylistDetails,
	PlaylistEntry,
	PlaylistListItem,
} from "@/lib/schema";
import { usePlayerStore } from "@/player/playerStore";
import type { PlayerTrack } from "@/player/track";
import { playlistMutations, playlistQueries } from "@/queries/playlists";
import { showToast } from "@/store/toastStore";

type TrackActionsTarget = {
	track: PlayerTrack;
	/** Set when the track was opened from a playlist, to offer removing it. */
	playlist?: { details: PlaylistDetails; entry: PlaylistEntry };
	/** Hides Go to album on the album's own page. */
	onAlbumPage?: boolean;
	/** Opened from Now Playing or the queue, which close before navigating. */
	fromPlayer?: boolean;
};

const useTrackActionsStore = create<{ target: TrackActionsTarget | null }>()(
	() => ({ target: null }),
);

/** Opens the actions sheet for a track, e.g. Play next or Add to playlist. */
export function openTrackActions(target: TrackActionsTarget) {
	useTrackActionsStore.setState({ target });
}

function close() {
	useTrackActionsStore.setState({ target: null });
}

/** The one actions sheet; mounted once for the signed-in app. */
export function TrackActionsHost() {
	const target = useTrackActionsStore((state) => state.target);
	// The last target stays rendered while the sheet animates closed.
	const [shown, setShown] = useState(target);
	const [view, setView] = useState<"actions" | "playlists" | "create">(
		"actions",
	);
	if (target && target !== shown) {
		setShown(target);
		setView("actions");
	}

	return (
		<>
			<Sheet
				description={
					shown
						? [
								shown.track.artists.map((artist) => artist.name).join(", "),
								shown.track.albumTitle,
							]
								.filter(Boolean)
								.join(" · ")
						: undefined
				}
				onClose={close}
				open={!!target && view !== "create"}
				title={
					view === "playlists" ? "Add to playlist" : (shown?.track.title ?? "")
				}
			>
				{shown &&
					(view === "actions" ? (
						<Actions
							onAddToPlaylist={() => setView("playlists")}
							target={shown}
						/>
					) : (
						<PlaylistPicker
							onCreate={() => setView("create")}
							track={shown.track}
						/>
					))}
			</Sheet>
			<PlaylistNameSheet
				onClose={close}
				onCreated={(playlist) => {
					if (shown) void addToPlaylist(playlist, shown.track);
				}}
				open={!!target && view === "create"}
			/>
		</>
	);
}

function Actions({
	target,
	onAddToPlaylist,
}: {
	target: TrackActionsTarget;
	onAddToPlaylist: () => void;
}) {
	const { track, playlist, onAlbumPage, fromPlayer } = target;
	const playNext = usePlayerStore((state) => state.playNext);
	const addToQueue = usePlayerStore((state) => state.addToQueue);
	const remove = useMutation({
		mutationFn: () =>
			playlistMutations.removeEntry(playlist!.details, playlist!.entry),
		onSuccess: close,
		onError: (error) =>
			showToast(
				error instanceof ApiError && error.status === 409
					? "The playlist changed elsewhere. Try again."
					: "Couldn't remove the track.",
			),
		onSettled: () => queryClient.invalidateQueries({ queryKey: ["playlists"] }),
	});

	function run(action: () => void) {
		close();
		action();
	}

	return (
		<View>
			<SheetAction
				icon="playNext"
				label="Play next"
				onPress={() =>
					run(() => {
						playNext([track]);
						showToast("Plays next");
					})
				}
			/>
			<SheetAction
				icon="queueAdd"
				label="Add to queue"
				onPress={() =>
					run(() => {
						addToQueue([track]);
						showToast("Added to queue");
					})
				}
			/>
			<SheetAction
				icon="playlistAdd"
				label="Add to playlist…"
				onPress={onAddToPlaylist}
			/>
			{playlist && (
				<SheetAction
					destructive
					disabled={remove.isPending}
					icon="playlistRemove"
					label="Remove from this playlist"
					onPress={() => remove.mutate()}
				/>
			)}
			{!onAlbumPage && (
				<SheetAction
					icon="album"
					label="Go to album"
					onPress={() =>
						run(() => openPage("album", track.albumId, fromPlayer))
					}
				/>
			)}
			{track.artists.map((artist) => (
				<SheetAction
					icon="person"
					key={artist.partyId}
					label={`Go to ${artist.name}`}
					onPress={() =>
						run(() => openPage("party", artist.partyId, fromPlayer))
					}
				/>
			))}
		</View>
	);
}

async function addToPlaylist(
	playlist: Pick<PlaylistListItem, "playlistId" | "version" | "name">,
	track: PlayerTrack,
) {
	try {
		await playlistMutations.addTrack(playlist, {
			albumDiscId: track.albumDiscId,
			trackId: track.trackId,
		});
		showToast(`Added to ${playlist.name}`);
	} catch (error) {
		showToast(
			error instanceof ApiError && error.status === 409
				? "The playlist changed elsewhere. Try again."
				: "Couldn't add the track.",
		);
	} finally {
		void queryClient.invalidateQueries({ queryKey: ["playlists"] });
	}
}

function PlaylistPicker({
	track,
	onCreate,
}: {
	track: PlayerTrack;
	onCreate: () => void;
}) {
	const playlists = useQuery(playlistQueries.list());

	return (
		<View className="gap-1">
			<SheetAction icon="add" label="New playlist…" onPress={onCreate} />
			{playlists.isPending ? (
				<View className="h-24">
					<Loading />
				</View>
			) : playlists.isError ? (
				<Text className="py-3 text-sm text-destructive">
					Couldn't load playlists.
				</Text>
			) : (
				playlists.data.map((playlist) => (
					<PlaylistOption
						key={playlist.playlistId}
						onPress={() => {
							close();
							void addToPlaylist(playlist, track);
						}}
						playlist={playlist}
					/>
				))
			)}
		</View>
	);
}

function PlaylistOption({
	playlist,
	onPress,
}: {
	playlist: PlaylistListItem;
	onPress: () => void;
}) {
	const details = useQuery({
		...playlistQueries.detail(playlist.playlistId),
		enabled: Number(playlist.trackCount) > 0,
	});

	return (
		<ListRow
			accessibilityRole="button"
			leading={
				<PlaylistCover entries={details.data?.entries ?? []} size={48} />
			}
			onPress={onPress}
			subtitle={plural(playlist.trackCount, "track")}
			title={playlist.name}
		/>
	);
}
