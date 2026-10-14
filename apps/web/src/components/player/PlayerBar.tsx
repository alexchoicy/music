import { useHotkey } from "@tanstack/react-hotkeys";
import type { UseHotkeyOptions } from "@tanstack/react-hotkeys";
import { useQueryClient } from "@tanstack/react-query";
import {
	ChevronDownIcon,
	ChevronUpIcon,
	PauseIcon,
	PlayIcon,
	RadioIcon,
	Repeat1Icon,
	RepeatIcon,
	Share2Icon,
	ShuffleIcon,
	SkipBackIcon,
	SkipForwardIcon,
} from "lucide-react";
import {
	useCallback,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from "react";
import WaveSurfer from "wavesurfer.js";
import Hover from "wavesurfer.js/plugins/hover";

import { Button } from "#/components/base/button";
import { toastManager } from "#/components/base/toast";
import { Toggle } from "#/components/base/toggle";
import { PlaybackDevices } from "#/components/player/PlaybackDevices";
import { getNowPlayingQuality } from "#/components/player/playbackQuality";
import { PlaybackQualitySettings } from "#/components/player/PlaybackSettings";
import { PlayerTrackInfo } from "#/components/player/PlayerTrackInfo";
import { QualityBadge } from "#/components/player/QualityBadge";
import { QueueSheet } from "#/components/player/QueueSheet";
import { VolumeControl } from "#/components/player/VolumeControl";
import { albumQueries } from "#/lib/queries/album.queries";
import { shareUrl } from "#/lib/utils/browser";
import { formatMsToMMSSOrHMMSS } from "#/lib/utils/music";
import { cn } from "#/lib/utils/styles";
import {
	AUDIO_PLAYER_IDLE_DURATION,
	AUDIO_PLAYER_IDLE_PEAKS,
	useAudioPlayerStore,
} from "#/store/audioPlayer/audioPlayerStore";

const AUDIO_TIME_EVENTS = ["timeupdate", "loadedmetadata", "seeking", "seeked"];

// Theme colours for the waveform canvas, which can't read CSS variables.
function readWaveformColors() {
	const styles = getComputedStyle(document.documentElement);
	const read = (name: string) => styles.getPropertyValue(name).trim();
	const foreground = read("--foreground");
	const withAlpha = (hex: string, alpha: string) =>
		/^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${alpha}` : hex;
	return {
		popover: read("--popover"),
		primary: read("--primary"),
		foreground,
		unplayed: withAlpha(foreground, "33"),
	};
}

export function PlayerBar() {
	const queryClient = useQueryClient();
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const waveContainerRef = useRef<HTMLDivElement | null>(null);
	const showRemainingRef = useRef(false);
	const elapsedLabelRef = useRef<HTMLSpanElement | null>(null);

	const [isQueueOpen, setIsQueueOpen] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);

	const bindWaveSurfer = useAudioPlayerStore((state) => state.bindWaveSurfer);
	const reloadAudio = useAudioPlayerStore((state) => state.reloadAudio);
	const currentTrack = useAudioPlayerStore((state) =>
		state.queue.at(state.index),
	);
	const index = useAudioPlayerStore((state) => state.index);
	const queue = useAudioPlayerStore((state) => state.queue);
	const queueLength = queue.length;
	const playbackQuality = useAudioPlayerStore((state) => state.playbackQuality);
	const playTalkTrack = useAudioPlayerStore((state) => state.playTalkTrack);
	const playInstrumental = useAudioPlayerStore(
		(state) => state.playInstrumental,
	);
	const stopAfterMusicCount = useAudioPlayerStore(
		(state) => state.stopAfterMusicCount,
	);
	const repeatMode = useAudioPlayerStore((state) => state.repeatMode);
	const shuffle = useAudioPlayerStore((state) => state.shuffle);
	const radio = useAudioPlayerStore((state) => state.radio);
	const status = useAudioPlayerStore((state) => state.status);
	const volume = useAudioPlayerStore((state) => state.volume);
	const muted = useAudioPlayerStore((state) => state.muted);
	const toggleMute = useAudioPlayerStore((state) => state.toggleMute);
	const hidden = useAudioPlayerStore((state) => state.hidden);
	const playNext = useAudioPlayerStore((state) => state.playNext);
	const playPrev = useAudioPlayerStore((state) => state.playPrev);
	const playQueueTrack = useAudioPlayerStore((state) => state.playQueueTrack);
	const removeFromQueue = useAudioPlayerStore((state) => state.removeFromQueue);
	const moveQueueTrack = useAudioPlayerStore((state) => state.moveQueueTrack);
	const clearQueue = useAudioPlayerStore((state) => state.clearQueue);
	const pause = useAudioPlayerStore((state) => state.pause);
	const setPlaybackQuality = useAudioPlayerStore(
		(state) => state.setPlaybackQuality,
	);
	const setPlayTalkTrack = useAudioPlayerStore(
		(state) => state.setPlayTalkTrack,
	);
	const setPlayInstrumental = useAudioPlayerStore(
		(state) => state.setPlayInstrumental,
	);
	const setStopAfterMusicCount = useAudioPlayerStore(
		(state) => state.setStopAfterMusicCount,
	);
	const setVolume = useAudioPlayerStore((state) => state.setVolume);
	const togglePlay = useAudioPlayerStore((state) => state.togglePlay);
	const toggleRepeatMode = useAudioPlayerStore(
		(state) => state.toggleRepeatMode,
	);
	const toggleShuffle = useAudioPlayerStore((state) => state.toggleShuffle);
	const toggleRadio = useAudioPlayerStore((state) => state.toggleRadio);
	const markReady = useAudioPlayerStore((state) => state.markReady);
	const markPlaying = useAudioPlayerStore((state) => state.markPlaying);
	const markFinished = useAudioPlayerStore((state) => state.markFinished);
	const hasPrev = useAudioPlayerStore((state) =>
		state.shuffle
			? state.shuffleHistoryIndex > 0
			: state.queue.length > 0 &&
				(state.index > 0 || state.repeatMode === "all"),
	);
	const hasNext = useAudioPlayerStore(
		(state) =>
			state.queue.length > 0 &&
			(state.radio ||
				state.repeatMode === "all" ||
				(state.shuffle
					? state.shuffleHistoryIndex < state.shuffleHistory.length - 1 ||
						state.shuffleRemaining.length > 0
					: state.index < state.queue.length - 1)),
	);
	const isLoading = status === "loading";
	const isPlaying = status === "playing";

	const onReady = useEffectEvent(() => markReady());
	const onPlay = useEffectEvent(() => markPlaying(true));
	const onPause = useEffectEvent(() => markPlaying(false));
	const onFinish = useEffectEvent(() => markFinished());
	const onStalled = useEffectEvent((event: Event) => {
		console.log("audio stalled", event);
		void reloadAudio({ autoplay: status === "playing" });
	});
	const onMediaError = useEffectEvent((event: Event) => {
		console.log("audio error", event);
		void reloadAudio({ autoplay: status === "playing" });
	});

	const refreshTimeLabel = useCallback(() => {
		const currentTimeInMs = (audioRef.current?.currentTime ?? 0) * 1000;
		const duration = currentTrack?.durationInMs ?? 0;
		const remainingTimeInMs = Math.max(duration - currentTimeInMs, 0);

		if (elapsedLabelRef.current) {
			elapsedLabelRef.current.textContent = showRemainingRef.current
				? `-${formatMsToMMSSOrHMMSS(remainingTimeInMs)}`
				: formatMsToMMSSOrHMMSS(currentTimeInMs);
		}
	}, [currentTrack?.durationInMs]);

	useEffect(() => {
		refreshTimeLabel();

		const audioElement = audioRef.current;
		if (!audioElement) return;

		for (const eventName of AUDIO_TIME_EVENTS) {
			audioElement.addEventListener(eventName, refreshTimeLabel);
		}
		return () => {
			for (const eventName of AUDIO_TIME_EVENTS) {
				audioElement.removeEventListener(eventName, refreshTimeLabel);
			}
		};
	}, [refreshTimeLabel]);

	const onMediaSessionPlay = useEffectEvent(() => {
		if (status === "playing" || status === "loading") return;
		void togglePlay();
	});
	const onMediaSessionPause = useEffectEvent(() => pause());
	const onMediaSessionPreviousTrack = useEffectEvent(() => playPrev());
	const onMediaSessionNextTrack = useEffectEvent(() => playNext());

	// While other media owns playback (hidden), it also owns the media session.
	useEffect(() => {
		if (!("mediaSession" in navigator) || hidden) return;

		navigator.mediaSession.metadata = currentTrack
			? new MediaMetadata({
					album: currentTrack.albumTitle,
					artist: currentTrack.party.map((party) => party.name).join(", "),
					artwork: currentTrack.albumCoverUrl
						? [{ src: currentTrack.albumCoverUrl }]
						: undefined,
					title: currentTrack.title,
				})
			: null;

		navigator.mediaSession.playbackState = currentTrack
			? status === "playing"
				? "playing"
				: "paused"
			: "none";
	}, [currentTrack, hidden, status]);

	useEffect(() => {
		if (!("mediaSession" in navigator) || hidden) return;

		const actions: [MediaSessionAction, MediaSessionActionHandler | null][] = [
			["play", onMediaSessionPlay],
			["pause", onMediaSessionPause],
			["previoustrack", hasPrev ? onMediaSessionPreviousTrack : null],
			["nexttrack", hasNext ? onMediaSessionNextTrack : null],
		];

		for (const [action, handler] of actions) {
			try {
				navigator.mediaSession.setActionHandler(action, handler);
			} catch {}
		}
		return () => {
			for (const [action] of actions) {
				try {
					navigator.mediaSession.setActionHandler(action, null);
				} catch {}
			}
		};
	}, [hasNext, hasPrev, hidden]);

	useEffect(() => {
		return () => {
			if (!("mediaSession" in navigator)) return;
			navigator.mediaSession.metadata = null;
			navigator.mediaSession.playbackState = "none";
		};
	}, []);

	useEffect(() => {
		const audio = audioRef.current;
		const container = waveContainerRef.current;
		if (!audio || !container) return;

		const colors = readWaveformColors();
		const player = WaveSurfer.create({
			container,
			media: audio,
			height: 28,
			cursorWidth: 0,
			duration: AUDIO_PLAYER_IDLE_DURATION,
			interact: false,
			normalize: true,
			peaks: AUDIO_PLAYER_IDLE_PEAKS,
			dragToSeek: true,
			barWidth: 2,
			barGap: 2,
			barRadius: 1,
			waveColor: colors.unplayed,
			progressColor: colors.primary,
			plugins: [
				Hover.create({
					formatTimeCallback: (seconds: number) =>
						formatMsToMMSSOrHMMSS(seconds * 1000),
					labelBackground: colors.popover,
					labelColor: colors.foreground,
					labelSize: "11px",
					lineColor: colors.primary,
					lineWidth: 1,
				}),
			],
		});

		bindWaveSurfer(player);

		const unsubscribeReady = player.on("ready", () => onReady());
		const unsubscribePlay = player.on("play", () => onPlay());
		const unsubscribePause = player.on("pause", () => onPause());
		const unsubscribeFinish = player.on("finish", () => onFinish());
		const handleStalled = (event: Event) => onStalled(event);
		const handleMediaError = (event: Event) => onMediaError(event);

		audio.addEventListener("error", handleMediaError);
		audio.addEventListener("stalled", handleStalled);

		return () => {
			unsubscribeReady();
			unsubscribePlay();
			unsubscribePause();
			unsubscribeFinish();
			audio.removeEventListener("error", handleMediaError);
			audio.removeEventListener("stalled", handleStalled);
			bindWaveSurfer(null);
			player.destroy();
		};
	}, [bindWaveSurfer]);

	async function shareCurrentTrack() {
		if (!currentTrack) return;

		let shareLink: string;
		try {
			const album = await queryClient.query(
				albumQueries.getAlbum(currentTrack.albumId),
			);
			shareLink = album.shareUrl;
		} catch {
			toastManager.add({
				title: "Could not share",
				description: "The share link could not be loaded.",
				type: "error",
			});
			return;
		}
		const url = new URL(shareLink);
		url.searchParams.set("track", currentTrack.trackId);

		const result = await shareUrl({
			title: currentTrack.title,
			text: `${currentTrack.title} from ${currentTrack.albumTitle}`,
			url: url.toString(),
		});

		if (result === "copied") {
			toastManager.add({
				title: "Link copied",
				description: `${currentTrack.title} share link copied.`,
			});
		}
	}

	const hotkeyConfig: UseHotkeyOptions = {
		enabled: !hidden,
		conflictBehavior: "allow",
	};

	useHotkey("Space", () => void togglePlay(), hotkeyConfig);
	useHotkey(
		"ArrowLeft",
		() => {
			if (!audioRef.current) return;
			audioRef.current.currentTime = Math.max(
				audioRef.current.currentTime - 1,
				0,
			);
		},
		hotkeyConfig,
	);
	useHotkey(
		"ArrowRight",
		() => {
			if (!audioRef.current) return;
			audioRef.current.currentTime = Math.min(
				audioRef.current.currentTime + 1,
				audioRef.current.duration || audioRef.current.currentTime + 1,
			);
		},
		hotkeyConfig,
	);
	useHotkey("Control+ArrowLeft", () => playPrev(), hotkeyConfig);
	useHotkey("Control+ArrowRight", () => playNext(), hotkeyConfig);
	useHotkey("ArrowDown", () => setVolume(volume - 0.05), hotkeyConfig);
	useHotkey("ArrowUp", () => setVolume(volume + 0.05), hotkeyConfig);
	useHotkey("Q", () => setIsQueueOpen(!isQueueOpen), hotkeyConfig);

	const nowPlaying = currentTrack
		? getNowPlayingQuality(currentTrack, playbackQuality)
		: null;

	const playButton = (className?: string) => (
		<Button
			aria-label={isPlaying ? "Pause" : "Play"}
			className={className}
			disabled={!currentTrack || isLoading}
			loading={isLoading}
			onClick={() => void togglePlay()}
			size="icon-xl"
			variant="play"
		>
			{isPlaying ? (
				<PauseIcon aria-hidden="true" className="size-4.5" />
			) : (
				<PlayIcon aria-hidden="true" className="size-4.5" />
			)}
		</Button>
	);

	// The transport row appears twice: centred above the seek bar from sm up,
	// and inside the action row on phones.
	const transportControls = (className?: string) => (
		<>
			<Toggle
				aria-label="Shuffle"
				className={className}
				disabled={queueLength === 0}
				onPressedChange={() => toggleShuffle()}
				pressed={shuffle}
				size="player"
				variant="player"
			>
				<ShuffleIcon aria-hidden="true" />
			</Toggle>
			<Button
				aria-label="Previous track"
				className={className}
				disabled={!hasPrev || isLoading}
				onClick={playPrev}
				size="icon-lg"
				variant="player"
			>
				<SkipBackIcon aria-hidden="true" />
			</Button>
			{playButton(className)}
			<Button
				aria-label="Next track"
				className={className}
				disabled={!hasNext || isLoading}
				onClick={playNext}
				size="icon-lg"
				variant="player"
			>
				<SkipForwardIcon aria-hidden="true" />
			</Button>
			<Toggle
				aria-label={`Repeat: ${repeatMode}`}
				className={className}
				disabled={queueLength === 0}
				onPressedChange={() => toggleRepeatMode()}
				pressed={repeatMode !== "off"}
				size="player"
				variant="player"
			>
				{repeatMode === "one" ? (
					<Repeat1Icon aria-hidden="true" />
				) : (
					<RepeatIcon aria-hidden="true" />
				)}
			</Toggle>
			<Toggle
				aria-label="Radio"
				className={className}
				onPressedChange={() => toggleRadio()}
				pressed={radio}
				size="player"
				title="Radio: keep playing random music after the queue ends"
				variant="player"
			>
				<RadioIcon aria-hidden="true" />
			</Toggle>
		</>
	);

	return (
		<div className={cn("px-2 pb-2 sm:px-4 sm:pb-4", hidden && "hidden")}>
			<audio className="hidden" preload="metadata" ref={audioRef} />
			<div
				aria-label="Player"
				className="rounded-4xl bg-popover/85 shadow-player backdrop-blur-xl backdrop-saturate-150"
				role="region"
				data-slot="player-bar"
			>
				<div className="flex items-center gap-1 px-2 py-1.5 sm:hidden">
					<div className="min-w-0 flex-1">
						<PlayerTrackInfo track={currentTrack} />
					</div>
					{!isExpanded && playButton()}
					<PlaybackDevices />
					<Button
						aria-controls="player-controls"
						aria-expanded={isExpanded}
						aria-label={isExpanded ? "Collapse player" : "Expand player"}
						onClick={() => setIsExpanded((expanded) => !expanded)}
						size="icon-lg"
						variant="player"
					>
						{isExpanded ? (
							<ChevronDownIcon aria-hidden="true" />
						) : (
							<ChevronUpIcon aria-hidden="true" />
						)}
					</Button>
				</div>

				<div
					className={cn(
						"grid min-h-16 grid-cols-1 items-center gap-x-2 gap-y-1 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-3 sm:px-4 lg:min-h-20 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,2fr)_minmax(8rem,1fr)]",
						!isExpanded && "max-sm:hidden",
					)}
					id="player-controls"
				>
					<div className="hidden min-w-0 sm:block">
						<PlayerTrackInfo track={currentTrack} />
					</div>

					<div className="flex min-w-0 flex-col gap-1 sm:col-span-2 lg:col-span-1">
						<div className="hidden grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:grid">
							<div />
							<div className="flex items-center justify-center gap-1">
								{transportControls()}
							</div>
							<div className="hidden justify-end lg:flex">
								{nowPlaying && <QualityBadge tier={nowPlaying.tier} />}
							</div>
						</div>
						<div className="flex min-h-8 w-full items-center gap-2">
							<button
								aria-label="Toggle elapsed and remaining time"
								className="min-w-10 shrink-0 cursor-pointer rounded-xs text-right text-xs text-muted-foreground tabular-nums outline-none select-none focus-visible:ring-2 focus-visible:ring-ring"
								disabled={!currentTrack}
								onClick={() => {
									showRemainingRef.current = !showRemainingRef.current;
									refreshTimeLabel();
								}}
								type="button"
							>
								<span ref={elapsedLabelRef}>{formatMsToMMSSOrHMMSS(0)}</span>
							</button>
							<div className="relative h-8 min-w-0 flex-1">
								{status === "idle" && (
									<div
										aria-hidden="true"
										className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border"
									/>
								)}
								<div
									className={cn("w-full", status === "idle" && "opacity-0")}
									ref={waveContainerRef}
								/>
							</div>
							<span className="min-w-10 shrink-0 text-xs text-muted-foreground tabular-nums">
								{formatMsToMMSSOrHMMSS(currentTrack?.durationInMs ?? 0)}
							</span>
						</div>
					</div>

					<div className="flex flex-wrap items-center justify-center gap-1 sm:col-start-2 sm:row-start-1 sm:flex-nowrap sm:justify-end lg:col-start-auto lg:row-start-auto">
						<div className="me-auto hidden ps-2 sm:flex lg:hidden">
							{nowPlaying && <QualityBadge tier={nowPlaying.tier} />}
						</div>
						{transportControls("sm:hidden")}
						<VolumeControl
							buttonClassName="hidden sm:inline-flex"
							muted={muted}
							setVolume={setVolume}
							toggleMute={toggleMute}
							volume={volume}
						/>
						<QueueSheet
							clearQueue={clearQueue}
							index={index}
							isOpen={isQueueOpen}
							moveQueueTrack={moveQueueTrack}
							onOpenChange={setIsQueueOpen}
							playQueueTrack={playQueueTrack}
							queue={queue}
							queueLength={queueLength}
							removeFromQueue={removeFromQueue}
						/>
						<PlaybackDevices className="max-sm:hidden" />
						<Button
							aria-label="Share current track"
							disabled={!currentTrack}
							onClick={() => void shareCurrentTrack()}
							size="icon-lg"
							variant="player"
						>
							<Share2Icon aria-hidden="true" />
						</Button>
						<PlaybackQualitySettings
							index={index}
							nowPlaying={nowPlaying}
							playInstrumental={playInstrumental}
							playTalkTrack={playTalkTrack}
							playbackQuality={playbackQuality}
							queue={queue}
							setPlayInstrumental={setPlayInstrumental}
							setPlayTalkTrack={setPlayTalkTrack}
							setPlaybackQuality={setPlaybackQuality}
							setStopAfterMusicCount={setStopAfterMusicCount}
							stopAfterMusicCount={stopAfterMusicCount}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
