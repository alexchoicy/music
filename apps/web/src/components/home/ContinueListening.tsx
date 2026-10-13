import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Disc3Icon, MonitorDownIcon, MonitorSpeakerIcon } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "#/components/base/button";
import {
	Progress,
	ProgressIndicator,
	ProgressTrack,
} from "#/components/base/progress";
import { Spinner } from "#/components/base/spinner";
import { toastManager } from "#/components/base/toast";
import { useTitleLang } from "#/hooks/use-title-lang";
import { getActiveSession, movePlaybackHere } from "#/lib/playbackDevices";
import { albumQueries } from "#/lib/queries/album.queries";
import type { ContinueListeningItem } from "#/lib/queries/home.queries";
import { getAlbumCoverUrl } from "#/lib/utils/album";
import { formatMsToMMSSOrHMMSS } from "#/lib/utils/music";
import { cn } from "#/lib/utils/styles";
import { albumDetailsToAudioPlayerTracks } from "#/store/audioPlayer/audioPlayerFunction";
import { useAudioPlayerStore } from "#/store/audioPlayer/audioPlayerStore";
import {
	readStoredDeviceId,
	usePlaybackDeviceStore,
} from "#/store/playbackDeviceStore";

const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, {
	numeric: "auto",
});

const RELATIVE_TIME_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	["day", 86_400_000],
	["hour", 3_600_000],
	["minute", 60_000],
];

function formatRelativeTime(value: string): string {
	const elapsedMs = new Date(value).getTime() - Date.now();
	for (const [unit, unitMs] of RELATIVE_TIME_UNITS) {
		if (Math.abs(elapsedMs) >= unitMs) {
			return relativeTimeFormatter.format(Math.round(elapsedMs / unitMs), unit);
		}
	}
	return "just now";
}

export function ContinueListening({
	items,
}: {
	items: ContinueListeningItem[];
}) {
	const headingId = useId();
	const storeDeviceId = usePlaybackDeviceStore((state) => state.deviceId);
	const [storedDeviceId] = useState(readStoredDeviceId);
	const deviceId = storeDeviceId ?? storedDeviceId;
	const activeTrackId = useAudioPlayerStore((state) =>
		state.status === "playing" || state.status === "loading"
			? state.queue.at(state.index)?.trackId
			: null,
	);

	// Playback already running here needs no resume row.
	const visibleItems = items.filter(
		(item) =>
			item.deviceId !== deviceId && String(item.trackId) !== activeTrackId,
	);
	if (visibleItems.length === 0) return null;

	return (
		<section aria-labelledby={headingId} className="flex flex-col gap-3">
			<h2 className="text-xl font-semibold tracking-tight" id={headingId}>
				Continue listening
			</h2>
			<ul className="grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] gap-x-6">
				{visibleItems.slice(0, 6).map((item) => (
					<ContinueListeningRow item={item} key={item.deviceId} />
				))}
			</ul>
		</section>
	);
}

function ContinueListeningRow({ item }: { item: ContinueListeningItem }) {
	const queryClient = useQueryClient();
	const playAlbum = useAudioPlayerStore((state) => state.playAlbum);
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

	const isPlayingLive = liveSession?.state?.status === "playing";
	const isMoving =
		transfer !== null && transfer.sessionId === liveSession?.sessionId;
	const busy = resuming || isMoving;

	const album = item.album;
	const titleLang = useTitleLang();
	const coverUrl = getAlbumCoverUrl(album.coverVariants);
	const durationMs = Number(item.durationInMs);
	const positionMs = Math.min(Number(item.positionMs), durationMs);
	const artistNames =
		album.artists.map((artist) => artist.name).join(", ") || "Unknown artist";
	const status = isPlayingLive
		? "Playing now"
		: liveSession
			? "Paused"
			: formatRelativeTime(item.updatedAt);

	async function resume() {
		// A live device hands over its own queue and position, then stops.
		if (liveSession) {
			movePlaybackHere(item.deviceId, liveSession.sessionId);
			return;
		}

		setResuming(true);
		try {
			const details = await queryClient.ensureQueryData(
				albumQueries.getAlbum(album.albumId),
			);
			const tracks = albumDetailsToAudioPlayerTracks(details);
			if (!tracks.some((track) => track.trackId === String(item.trackId))) {
				throw new Error("This track has no playable audio.");
			}
			playAlbum(tracks, String(item.trackId), positionMs);
		} catch (error) {
			toastManager.add({
				title: "Could not resume playback",
				description: error instanceof Error ? error.message : undefined,
				type: "error",
			});
		} finally {
			setResuming(false);
		}
	}

	return (
		<li className="min-w-0">
			<div className="flex items-center gap-4 rounded-lg p-3 transition-colors duration-100 hover:bg-accent motion-reduce:transition-none">
				<Link
					aria-label={`Open ${album.title}`}
					className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
					params={{ id: String(album.albumId) }}
					to="/albums/$id"
				>
					{coverUrl ? (
						<img
							alt=""
							className="size-full object-cover"
							loading="lazy"
							src={coverUrl}
						/>
					) : (
						<span className="flex size-full items-center justify-center text-muted-foreground">
							<Disc3Icon aria-hidden="true" className="size-7" />
						</span>
					)}
					<span className="pointer-events-none absolute inset-0 rounded-lg shadow-[inset_0_0_0_1px_--theme(--color-white/8%)]" />
				</Link>

				<div className="flex min-w-0 flex-1 flex-col gap-1.5">
					<div className="flex min-w-0 flex-col">
						<span
							className="truncate text-sm font-semibold"
							lang={titleLang(album.languageId)}
							title={item.trackTitle}
						>
							{item.trackTitle}
						</span>
						<span
							className="truncate text-xs text-muted-foreground"
							title={`${album.title} · ${artistNames}`}
						>
							<span lang={titleLang(album.languageId)}>{album.title}</span> ·{" "}
							{artistNames}
						</span>
					</div>
					<span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
						<MonitorSpeakerIcon
							aria-hidden="true"
							className={cn(
								"size-3.5 shrink-0",
								isPlayingLive && "text-primary",
							)}
						/>
						<span className="truncate">
							{item.deviceName} · {status}
						</span>
					</span>
					<div className="flex items-center gap-2.5">
						<Progress
							aria-label={`${item.trackTitle} progress`}
							className="flex-1"
							max={Math.max(durationMs, 1)}
							value={positionMs}
						>
							<ProgressTrack className="h-1">
								<ProgressIndicator />
							</ProgressTrack>
						</Progress>
						<span className="text-xs font-medium whitespace-nowrap text-muted-foreground tabular-nums">
							{formatMsToMMSSOrHMMSS(positionMs)} /{" "}
							{formatMsToMMSSOrHMMSS(durationMs)}
						</span>
					</div>
				</div>

				<Button
					aria-label={
						liveSession
							? `Move ${item.trackTitle} from ${item.deviceName} to this device`
							: `Resume ${item.trackTitle} from ${item.deviceName} on this device`
					}
					disabled={busy || (transfer !== null && !isMoving)}
					onClick={() => void resume()}
					size="icon-xl"
					variant="round"
				>
					{busy ? (
						<Spinner aria-hidden="true" />
					) : (
						<MonitorDownIcon aria-hidden="true" className="size-4" />
					)}
				</Button>
			</div>
		</li>
	);
}
