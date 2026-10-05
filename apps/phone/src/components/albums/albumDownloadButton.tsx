import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { useShallow } from "zustand/react/shallow";

import { Icon } from "@/components/ui/icon";
import type { AlbumDetails } from "@/lib/album";
import type { TrackDownloadRow } from "@/lib/offline/db";
import {
	downloadAlbum,
	removeAlbumDownloads,
	retryAlbumDownload,
} from "@/lib/offline/downloads";
import { useOfflineStore } from "@/store/offlineStore";

function confirmRemove(albumId: string, isActive: boolean) {
	Alert.alert(
		isActive ? "Cancel download?" : "Remove download?",
		isActive
			? "Tracks downloaded so far will be deleted."
			: "You won't be able to play this album offline.",
		[
			{ text: isActive ? "Keep downloading" : "Cancel", style: "cancel" },
			{
				text: isActive ? "Cancel download" : "Remove",
				style: "destructive",
				onPress: () => removeAlbumDownloads([albumId]),
			},
		],
	);
}

/** Spotify-style download toggle shown under the album title. */
export function AlbumDownloadButton({ album }: { album: AlbumDetails }) {
	const albumId = String(album.albumId);
	const { isSaved, total, downloaded, failed } = useOfflineStore(
		useShallow((state) => {
			const tracks = Object.values(state.tracks).filter(
				(track): track is TrackDownloadRow => track?.albumId === albumId,
			);
			return {
				// Albums with only played tracks saved can still be downloaded whole.
				isSaved: state.albums[albumId]?.kind === "album",
				total: tracks.length,
				downloaded: tracks.filter((track) => track.status === "downloaded")
					.length,
				failed: tracks.filter((track) => track.status === "failed").length,
			};
		}),
	);

	const hasAudio = album.discs.some((disc) =>
		disc.tracks.some((track) => track.audios.length > 0),
	);
	// A saved album with no track downloads (e.g. its audio was removed) is not "downloaded".
	const isDownloaded = isSaved && total > 0;
	if (!isDownloaded && !hasAudio) return null;

	const isActive = isDownloaded && downloaded + failed < total;
	const hasFailed = isDownloaded && !isActive && failed > 0;

	const label = !isDownloaded
		? "Download"
		: isActive
			? `Downloading ${downloaded} of ${total}, cancel download`
			: hasFailed
				? `${failed} of ${total} tracks failed to download, retry`
				: "Downloaded, remove download";
	const status = isActive
		? `${downloaded} of ${total}`
		: hasFailed
			? `${failed} failed`
			: null;

	return (
		<View className="flex-row justify-center">
			<Pressable
				accessibilityLabel={label}
				accessibilityRole="button"
				// The status text is inside so the whole visible control is tappable.
				className="min-h-11 min-w-11 flex-row items-center justify-center gap-1 rounded-full px-2 active:opacity-60"
				onPress={() =>
					!isDownloaded
						? downloadAlbum(album)
						: hasFailed
							? retryAlbumDownload(albumId)
							: confirmRemove(albumId, isActive)
				}
			>
				{isActive ? (
					<ActivityIndicator colorClassName="accent-foreground" />
				) : isDownloaded && !hasFailed ? (
					// A solid circle so "downloaded" reads differently from the outline icon.
					<View className="size-7 items-center justify-center rounded-full bg-foreground">
						<Icon
							className="accent-background"
							name={{
								ios: "arrow.down",
								android: "arrow_downward",
								web: "arrow_downward",
							}}
							size={18}
						/>
					</View>
				) : (
					<Icon
						className={hasFailed ? "accent-destructive" : "accent-foreground"}
						name={
							hasFailed
								? {
										ios: "exclamationmark.circle",
										android: "error",
										web: "error",
									}
								: {
										ios: "arrow.down.circle",
										android: "arrow_circle_down",
										web: "arrow_circle_down",
									}
						}
						size={28}
					/>
				)}
				{status && (
					<Text
						// The button label already includes this.
						accessibilityElementsHidden
						className="text-xs text-muted-foreground tabular-nums"
						importantForAccessibility="no-hide-descendants"
					>
						{status}
					</Text>
				)}
			</Pressable>
		</View>
	);
}
