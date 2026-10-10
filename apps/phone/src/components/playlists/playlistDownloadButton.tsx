import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useShallow } from "zustand/react/shallow";

import { confirm } from "@/components/ui/confirmDialog";
import { Icon } from "@/components/ui/icon";
import type { PlaylistDetails } from "@/lib/schema";
import {
	downloadPlaylist,
	NoPlaylistTracksError,
	removePlaylistDownloads,
	retryPlaylistDownload,
} from "@/offline/downloads";
import {
	getPlaylistDownloadStats,
	useOfflineStore,
} from "@/offline/offlineStore";
import { fetchAlbum } from "@/queries/albums";
import { showToast } from "@/store/toastStore";

function confirmRemove(playlistId: string, isActive: boolean) {
	confirm({
		title: isActive ? "Cancel download?" : "Remove download?",
		message: isActive
			? "Tracks downloaded so far will be deleted, except ones saved while playing or used by albums and other playlists."
			: "You won't be able to play this playlist offline. Tracks saved while playing or used by albums and other playlists stay downloaded.",
		confirmLabel: isActive ? "Cancel download" : "Remove",
		cancelLabel: isActive ? "Keep downloading" : "Cancel",
		onConfirm: () => removePlaylistDownloads([playlistId]),
	});
}

/** Downloads the playlist, shows progress, and retries or removes the download. */
export function PlaylistDownloadButton({
	playlist,
}: {
	playlist: PlaylistDetails;
}) {
	const playlistId = String(playlist.playlistId);
	// Albums are fetched before any track is queued.
	const [isStarting, setIsStarting] = useState(false);
	const queryClient = useQueryClient();
	const { isDownloaded, total, downloaded, failed } = useOfflineStore(
		useShallow((state) => {
			const saved = state.playlists[playlistId];
			return {
				isDownloaded: !!saved,
				...getPlaylistDownloadStats(saved ?? { entries: [] }, state.tracks),
			};
		}),
	);

	if (!isDownloaded && playlist.entries.length === 0) return null;

	const isActive = isStarting || (isDownloaded && downloaded + failed < total);
	const hasFailed = isDownloaded && !isActive && failed > 0;
	// Its tracks were removed, or none has playable audio; new ones download as they are added.
	const isEmpty = isDownloaded && !isActive && total === 0;

	function start() {
		setIsStarting(true);
		downloadPlaylist(playlist, (albumId) => fetchAlbum(queryClient, albumId))
			.catch((error: unknown) =>
				showToast(
					error instanceof NoPlaylistTracksError
						? "This playlist has no tracks that can be downloaded."
						: "Couldn't download the playlist.",
				),
			)
			.finally(() => setIsStarting(false));
	}

	const label = isStarting
		? "Preparing download"
		: !isDownloaded
			? "Download"
			: isActive
				? `Downloading ${downloaded} of ${total}, cancel download`
				: hasFailed
					? `${failed} of ${total} tracks failed to download, retry`
					: isEmpty
						? "Downloaded, no tracks available offline, remove download"
						: "Downloaded, remove download";
	const status =
		isActive && !isStarting
			? `${downloaded}/${total}`
			: hasFailed
				? `${failed} failed`
				: isEmpty
					? "No tracks"
					: null;

	return (
		<Pressable
			accessibilityLabel={label}
			accessibilityRole="button"
			accessibilityState={{ disabled: isStarting }}
			className="h-11 min-w-11 flex-row items-center justify-center gap-1.5 rounded-full px-1 active:opacity-60"
			disabled={isStarting}
			onPress={() =>
				!isDownloaded
					? start()
					: hasFailed
						? retryPlaylistDownload(playlistId)
						: confirmRemove(playlistId, isActive)
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
