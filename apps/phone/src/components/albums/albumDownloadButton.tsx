import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useShallow } from "zustand/react/shallow";

import { confirm } from "@/components/ui/confirmDialog";
import { Icon } from "@/components/ui/icon";
import type { AlbumDetails } from "@/lib/schema";
import {
	downloadAlbum,
	removeAlbumDownloads,
	retryAlbumDownload,
} from "@/offline/downloads";
import { useOfflineStore } from "@/offline/offlineStore";

function confirmRemove(albumId: string, isActive: boolean) {
	confirm({
		title: isActive ? "Cancel download?" : "Remove download?",
		message: isActive
			? "Tracks downloaded so far will be deleted."
			: "You won't be able to play this album offline.",
		confirmLabel: isActive ? "Cancel download" : "Remove",
		cancelLabel: isActive ? "Keep downloading" : "Cancel",
		onConfirm: () => removeAlbumDownloads([albumId]),
	});
}

/** Downloads the album, shows progress, and retries or removes the download. */
export function AlbumDownloadButton({ album }: { album: AlbumDetails }) {
	const albumId = String(album.albumId);
	const { isSaved, total, downloaded, failed } = useOfflineStore(
		useShallow((state) => {
			const tracks = Object.values(state.tracks).filter(
				(track) => track?.albumId === albumId,
			);
			return {
				// Albums with only played tracks saved can still be downloaded whole.
				isSaved: state.albums[albumId]?.kind === "album",
				total: tracks.length,
				downloaded: tracks.filter((track) => track?.status === "downloaded")
					.length,
				failed: tracks.filter((track) => track?.status === "failed").length,
			};
		}),
	);

	const hasAudio = album.discs.some((disc) =>
		disc.tracks.some((track) => track.audios.length > 0),
	);
	// A saved album without track downloads, e.g. its audio was removed, is not downloaded.
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
		? `${downloaded}/${total}`
		: hasFailed
			? `${failed} failed`
			: null;

	return (
		<Pressable
			accessibilityLabel={label}
			accessibilityRole="button"
			className="h-11 min-w-11 flex-row items-center justify-center gap-1.5 rounded-full px-1 active:opacity-60"
			onPress={() =>
				!isDownloaded
					? downloadAlbum(album)
					: hasFailed
						? retryAlbumDownload(albumId)
						: confirmRemove(albumId, isActive)
			}
		>
			{isActive ? (
				<ActivityIndicator colorClassName="accent-primary" />
			) : (
				<Icon
					className={
						hasFailed
							? "accent-destructive"
							: isDownloaded
								? "accent-primary"
								: "accent-foreground"
					}
					name={hasFailed ? "error" : isDownloaded ? "downloaded" : "download"}
					size={28}
				/>
			)}
			{status && (
				<View
					// The button label already says this.
					accessibilityElementsHidden
					importantForAccessibility="no-hide-descendants"
				>
					<Text className="text-xs font-medium text-muted-foreground tabular-nums">
						{status}
					</Text>
				</View>
			)}
		</Pressable>
	);
}
