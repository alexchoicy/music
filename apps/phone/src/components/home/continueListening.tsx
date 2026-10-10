import { useQueryClient } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { Artwork } from "@/components/ui/artwork";
import { SectionHeader } from "@/components/ui/header";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/iconButton";
import { formatTimeAgo, formatTrackDuration } from "@/lib/format";
import { getCover, joinNames } from "@/lib/music";
import { getActiveSession, movePlaybackHere } from "@/lib/playbackDevices";
import type { ContinueListeningItem } from "@/lib/schema";
import { useArtworkUri } from "@/offline/offlineStore";
import { usePlayerStore } from "@/player/playerStore";
import { toPlayerTracks } from "@/player/track";
import { fetchAlbum } from "@/queries/albums";
import { usePlaybackDeviceStore } from "@/store/playbackDeviceStore";
import { showToast } from "@/store/toastStore";

const maxItems = 3;

/** Playback saved by the user's other devices, to pick up here. */
export function ContinueListening({
	items,
}: {
	items: ContinueListeningItem[];
}) {
	const deviceId = usePlaybackDeviceStore((state) => state.deviceId);
	const activeTrackId = usePlayerStore((state) =>
		state.status === "playing" || state.status === "loading"
			? state.queue.at(state.index)?.trackId
			: null,
	);

	// Playback already running on this phone needs no card.
	const visible = items
		.filter(
			(item) =>
				item.deviceId !== deviceId && String(item.trackId) !== activeTrackId,
		)
		.slice(0, maxItems);
	if (visible.length === 0) return null;

	return (
		<View className="gap-2 px-4">
			<SectionHeader title="Continue listening" />
			<View className="gap-3">
				{visible.map((item) => (
					<ContinueCard item={item} key={item.deviceId} />
				))}
			</View>
		</View>
	);
}

function ContinueCard({ item }: { item: ContinueListeningItem }) {
	const queryClient = useQueryClient();
	const playTracks = usePlayerStore((state) => state.playTracks);
	const transfer = usePlaybackDeviceStore((state) => state.transfer);
	const liveSession = usePlaybackDeviceStore((state) => {
		const device = state.devices.find(
			(candidate) => candidate.deviceId === item.deviceId,
		);
		const session = device ? getActiveSession(device.sessions) : undefined;
		// Only a session that played since connecting holds real progress; a restored queue sits at 0:00.
		const resumable =
			session !== undefined &&
			session.activatedAt > 0 &&
			(session.state?.status === "playing" ||
				session.state?.status === "paused") &&
			session.state.track?.trackId === String(item.trackId);
		return resumable ? session : undefined;
	});
	const [resuming, setResuming] = useState(false);

	const album = item.album;
	const coverUri = useArtworkUri(
		getCover(album.discCovers?.at(0)?.variants) ??
			getCover(album.coverVariants),
	);
	const durationMs = Number(item.durationInMs);
	const positionMs = Math.min(Number(item.positionMs), durationMs);
	const progress = durationMs > 0 ? positionMs / durationMs : 0;
	const artists = joinNames(album.artists) || "Unknown artist";
	const isMoving =
		transfer !== null && transfer.sessionId === liveSession?.sessionId;
	const busy = resuming || isMoving;
	const status =
		liveSession?.state?.status === "playing"
			? "Playing now"
			: liveSession
				? "Paused"
				: formatTimeAgo(item.updatedAt);

	async function resume() {
		// A device that is still online hands over its own queue and position, then stops.
		if (liveSession) {
			movePlaybackHere(item.deviceId, liveSession.sessionId);
			return;
		}

		setResuming(true);
		try {
			const tracks = toPlayerTracks(
				await fetchAlbum(queryClient, album.albumId),
			);
			const index = tracks.findIndex(
				(track) => track.trackId === String(item.trackId),
			);
			if (index === -1) {
				showToast("Couldn't resume. This track has no playable audio.");
				return;
			}
			playTracks(tracks, index, { position: positionMs / 1000 });
		} catch {
			showToast("Couldn't resume. Check your connection and try again.");
		} finally {
			setResuming(false);
		}
	}

	return (
		<View className="flex-row items-center gap-3 rounded-2xl bg-surface p-3">
			<Link
				asChild
				href={{
					pathname: "/album/[id]",
					params: { id: String(album.albumId) },
				}}
				push
			>
				<Pressable
					accessibilityLabel={`Open ${album.title}`}
					accessibilityRole="link"
					className="active:opacity-70"
				>
					<Artwork
						recyclingKey={String(album.albumId)}
						size={64}
						uri={coverUri}
					/>
				</Pressable>
			</Link>

			<View className="flex-1 gap-1">
				<View>
					<Text
						className="text-sm font-semibold text-foreground"
						numberOfLines={1}
					>
						{item.trackTitle}
					</Text>
					<Text className="text-xs text-muted-foreground" numberOfLines={1}>
						{album.title} · {artists}
					</Text>
				</View>
				<View className="flex-row items-center gap-1">
					<Icon
						className={
							liveSession?.state?.status === "playing"
								? "accent-primary"
								: "accent-muted-foreground"
						}
						name="devices"
						size={12}
					/>
					<Text
						className="flex-1 text-xs text-muted-foreground"
						numberOfLines={1}
					>
						{item.deviceName} · {status}
					</Text>
				</View>
				<View
					accessibilityLabel={`${formatTrackDuration(positionMs)} of ${formatTrackDuration(durationMs)} played`}
					accessible
					className="flex-row items-center gap-2"
				>
					<View className="h-1 flex-1 overflow-hidden rounded-full bg-surface-strong">
						<View
							className="h-full rounded-full bg-primary"
							style={{ width: `${progress * 100}%` }}
						/>
					</View>
					<Text className="text-[11px] text-muted-foreground tabular-nums">
						{formatTrackDuration(positionMs)} /{" "}
						{formatTrackDuration(durationMs)}
					</Text>
				</View>
			</View>

			{busy ? (
				<View className="size-11 items-center justify-center">
					<ActivityIndicator />
				</View>
			) : (
				<IconButton
					disabled={transfer !== null}
					icon={liveSession ? "moveHere" : "play"}
					label={
						liveSession
							? `Move ${item.trackTitle} from ${item.deviceName} to this phone`
							: `Resume ${item.trackTitle} from ${item.deviceName}`
					}
					onPress={() => void resume()}
					variant="primary"
				/>
			)}
		</View>
	);
}
