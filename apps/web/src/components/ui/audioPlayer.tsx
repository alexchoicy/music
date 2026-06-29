import { useHotkey } from "@tanstack/react-hotkeys";
import type { UseHotkeyOptions } from "@tanstack/react-hotkeys";
import { Link } from "@tanstack/react-router";
import {
	Music2Icon,
	PauseIcon,
	PlayIcon,
	Repeat1Icon,
	RepeatIcon,
	SettingsIcon,
	ShuffleIcon,
	SkipBackIcon,
	SkipForwardIcon,
	ListMusicIcon,
} from "lucide-react";
import {
	useCallback,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from "react";
import WaveSurfer from "wavesurfer.js";

import { Button } from "#/components/coss/button";
import { Label } from "#/components/coss/label";
import {
	Popover,
	PopoverPopup,
	PopoverTrigger,
} from "#/components/coss/popover";
import { Radio, RadioGroup } from "#/components/coss/radio-group";
import {
	Sheet,
	SheetDescription,
	SheetHeader,
	SheetPanel,
	SheetPopup,
	SheetTitle,
	SheetTrigger,
} from "#/components/coss/sheet";
import { Switch } from "#/components/coss/switch";
import { Toggle } from "#/components/coss/toggle";
import { VolumeControl } from "#/components/VolumeControl";
import { formatMsToTimer } from "#/lib/utils/music";
import { cn } from "#/lib/utils/styles";
import {
	AUDIO_PLAYER_IDLE_DURATION,
	AUDIO_PLAYER_IDLE_PEAKS,
	autoSelectPlaybackQuality,
	useAudioPlayerStore,
} from "#/store/audioPlayer/audioPlayerStore";
import type {
	AudioPlayerState,
	AudioPlayerTrack,
} from "#/store/audioPlayer/audioPlayerType";

const AUDIO_TIME_EVENTS = ["timeupdate", "loadedmetadata", "seeking", "seeked"];
type PlaybackQuality = AudioPlayerState["playbackQuality"];

function formatSampleRate(
	value: null | number | string | undefined,
): string | null {
	if (value === null || value === undefined) return null;

	const sampleRate = Number(value);
	if (!Number.isFinite(sampleRate)) return null;

	if (sampleRate >= 1000) return `${sampleRate / 1000} kHz`;
	return `${sampleRate} Hz`;
}

function formatBitrate(
	value: null | number | string | undefined,
): string | null {
	if (value === null || value === undefined) return null;

	const bitrate = Number(value);
	if (!Number.isFinite(bitrate)) return null;

	return `${Math.round(bitrate / 1000)} kbps`;
}

function formatBitsPerSample(
	value: null | number | string | undefined,
): string | null {
	if (!value) return null;
	return `${value}-bit`;
}

function formatCodec(value: null | string | undefined): string | null {
	if (!value) return null;
	const codec = value.trim();
	if (!codec) return null;
	if (codec.length <= 4) return codec.toUpperCase();
	return codec[0]?.toUpperCase() + codec.slice(1);
}

function formatPlaybackQuality(
	track: AudioPlayerTrack,
	playbackQuality: PlaybackQuality,
): string | null {
	const selectedQuality =
		playbackQuality === "Auto" ? autoSelectPlaybackQuality() : playbackQuality;
	const originalExtension = track.audio.file.original.extension.toLowerCase();
	const needsPlayableFallback = originalExtension === "dsf";
	const file =
		selectedQuality === "Opus96" || needsPlayableFallback
			? (track.audio.file.opus96 ?? track.audio.file.original)
			: track.audio.file.original;
	const label =
		(selectedQuality === "Opus96" || needsPlayableFallback) &&
		track.audio.file.opus96
			? "Opus 96"
			: (formatCodec(file.codec) ?? "Original");
	const parts = [
		label,
		formatSampleRate(file.audioSampleRate),
		formatBitsPerSample(file.bitsPerSample),
		formatBitrate(file.bitrate),
	].filter((part) => part !== null);

	return parts.length > 0 ? parts.join(" • ") : null;
}

type TrackInfoProps = {
	track?: AudioPlayerTrack;
};

function TrackInfo({ track }: TrackInfoProps) {
	if (!track) {
		return (
			<div className="flex min-w-0 items-center gap-2 rounded-md p-1 sm:gap-3 sm:p-2">
				<div className="relative size-11 shrink-0 rounded-md bg-muted text-muted-foreground sm:size-14">
					<div className="flex h-full w-full items-center justify-center">
						<Music2Icon aria-hidden="true" className="size-6" />
					</div>
				</div>
				<div className="min-w-0 flex-1 text-left" dir="ltr">
					<p className="truncate text-sm font-medium sm:text-base">
						No track selected
					</p>
					<p className="truncate text-sm text-muted-foreground">-</p>
					<p className="hidden truncate text-sm text-muted-foreground sm:block">
						-
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-w-0 items-center gap-2 p-1 text-foreground sm:gap-3 sm:p-2">
			<Link
				className="relative size-11 shrink-0 overflow-hidden rounded-md bg-muted text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background sm:size-14"
				params={{ id: track.albumId }}
				to="/albums/$id"
			>
				{track.albumCoverUrl ? (
					<img
						alt={track.albumTitle}
						className="h-full w-full rounded-md object-cover"
						src={track.albumCoverUrl}
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center">
						<Music2Icon aria-hidden="true" className="size-6" />
					</div>
				)}
			</Link>
			<div className="min-w-0 flex-1 text-left" dir="ltr">
				<Link
					className="block truncate rounded-sm text-sm font-medium outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background sm:text-base"
					params={{ id: track.albumId }}
					search={{ track: track.trackId }}
					to="/albums/$id"
				>
					{track.title}
				</Link>
				<div className="truncate text-sm text-muted-foreground">
					{track.party.length > 0
						? track.party.map((party, partyIndex) => (
								<span key={party.partyId}>
									{partyIndex > 0 && ", "}
									<Link
										className="rounded-sm outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
										params={{ id: party.partyId }}
										to="/parties/$id"
									>
										{party.name}
									</Link>
								</span>
							))
						: "-"}
				</div>
				<p className="hidden truncate text-sm text-muted-foreground sm:block">
					<Link
						className="block truncate rounded-sm outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
						params={{ id: track.albumId }}
						to="/albums/$id"
					>
						{track.albumTitle}
					</Link>
				</p>
			</div>
		</div>
	);
}

type QueueSheetProps = {
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	index: number;
	queue: AudioPlayerTrack[];
	queueLength: number;
	playQueueTrack: (index: number) => void;
};

function QueueSheet({
	isOpen,
	onOpenChange,
	index,
	queue,
	queueLength,
	playQueueTrack,
}: QueueSheetProps) {
	return (
		<Sheet open={isOpen} onOpenChange={onOpenChange}>
			<SheetTrigger
				render={<Button aria-label="Queue" size="icon-sm" variant="ghost" />}
			>
				<ListMusicIcon aria-hidden="true" />
			</SheetTrigger>
			<SheetPopup side="right">
				<SheetHeader>
					<SheetTitle>Queue</SheetTitle>
					<SheetDescription>
						{queueLength === 0
							? "No tracks queued."
							: `${queueLength} track${queueLength === 1 ? "" : "s"} queued.`}
					</SheetDescription>
				</SheetHeader>
				<SheetPanel className="flex flex-col gap-1 px-3">
					{queueLength === 0 ? (
						<div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center text-muted-foreground">
							<ListMusicIcon aria-hidden="true" className="size-6" />
							<p className="text-sm">Your queue is empty.</p>
						</div>
					) : (
						queue.map((track, trackIndex) => (
							<button
								className={cn(
									"flex min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
									trackIndex === index && "bg-accent text-foreground",
								)}
								key={`${track.trackId}-${trackIndex}`}
								onClick={() => {
									playQueueTrack(trackIndex);
								}}
								type="button"
							>
								<div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
									{track.albumCoverUrl ? (
										<img
											alt=""
											className="h-full w-full object-cover"
											src={track.albumCoverUrl}
										/>
									) : (
										<Music2Icon aria-hidden="true" className="size-5" />
									)}
								</div>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium">{track.title}</p>
									<p className="truncate text-xs text-muted-foreground">
										{track.party.length > 0
											? track.party.map((party) => party.name).join(", ")
											: track.albumTitle}
									</p>
								</div>
								<span className="shrink-0 text-xs text-muted-foreground tabular-nums">
									{formatMsToTimer(track.durationInMs)}
								</span>
							</button>
						))
					)}
				</SheetPanel>
			</SheetPopup>
		</Sheet>
	);
}

type PlaybackQualitySettingsProps = {
	playTalkTrack: boolean;
	playbackQuality: PlaybackQuality;
	setPlayTalkTrack: (playTalkTrack: boolean) => void;
	setPlaybackQuality: (quality: PlaybackQuality) => void;
	playInstrumental: boolean;
	setPlayInstrumental: (playInstrumental: boolean) => void;
};

function PlaybackQualitySettings({
	playTalkTrack,
	playbackQuality,
	setPlayTalkTrack,
	setPlaybackQuality,
	playInstrumental,
	setPlayInstrumental,
}: PlaybackQualitySettingsProps) {
	return (
		<Popover>
			<PopoverTrigger
				render={<Button aria-label="Settings" size="icon-sm" variant="ghost" />}
			>
				<SettingsIcon aria-hidden="true" />
			</PopoverTrigger>
			<PopoverPopup align="end" className="w-64" side="top" sideOffset={8}>
				<div className="flex flex-col gap-3">
					<div className="flex flex-col gap-1">
						<p className="text-sm font-medium">Playback quality</p>
						<p className="text-xs text-muted-foreground">
							Choose which audio source to use when loading tracks.
						</p>
					</div>
					<RadioGroup
						aria-label="Playback quality"
						onValueChange={(value) => {
							if (
								value === "Auto" ||
								value === "Original" ||
								value === "Opus96"
							) {
								setPlaybackQuality(value);
							}
						}}
						value={playbackQuality}
					>
						<Label className="items-start gap-3">
							<Radio value="Auto" />
							<span className="flex flex-col gap-1">
								<span>Auto</span>
								<span className="text-xs font-normal text-muted-foreground">
									Use Opus 96 when phone(GuEsS), otherwise original.
								</span>
							</span>
						</Label>
						<Label className="items-start gap-3">
							<Radio value="Original" />
							<span className="flex flex-col gap-1">
								<span>Original</span>
								<span className="text-xs font-normal text-muted-foreground">
									Use the original uploaded file.
								</span>
							</span>
						</Label>
						<Label className="items-start gap-3">
							<Radio value="Opus96" />
							<span className="flex flex-col gap-1">
								<span>Opus 96</span>
								<span className="text-xs font-normal text-muted-foreground">
									Use the smaller Opus stream when available.
								</span>
							</span>
						</Label>
					</RadioGroup>
					<Label className="flex items-center justify-between gap-3 border-t pt-3">
						<span className="flex flex-col gap-1">
							<span>Play Talk track</span>
							<span className="text-xs font-normal text-muted-foreground">
								Include Talk tracks during playback.
							</span>
						</span>
						<Switch
							checked={playTalkTrack}
							onCheckedChange={setPlayTalkTrack}
						/>
					</Label>
					<Label className="flex items-center justify-between gap-3 border-t pt-3">
						<span className="flex flex-col gap-1">
							<span>Play Instrumental track</span>
							<span className="text-xs font-normal text-muted-foreground">
								Include Instrumental tracks during playback.
							</span>
						</span>
						<Switch
							checked={playInstrumental}
							onCheckedChange={setPlayInstrumental}
						/>
					</Label>
				</div>
			</PopoverPopup>
		</Popover>
	);
}

export function AudioPlayer() {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const waveContainerRef = useRef<HTMLDivElement | null>(null);
	const showRemainingRef = useRef(false);
	const rightMinusRef = useRef<HTMLSpanElement | null>(null);
	const rightLabelRef = useRef<HTMLSpanElement | null>(null);

	const [isOpenQueue, setIsOpenQueue] = useState(false);

	const bindWaveSurfer = useAudioPlayerStore((state) => state.bindWaveSurfer);
	const reloadAudio = useAudioPlayerStore((state) => state.reloadAudio);
	const currentTrack = useAudioPlayerStore((state) =>
		state.queue.at(state.index),
	);
	const index = useAudioPlayerStore((state) => state.index);
	const playbackQuality = useAudioPlayerStore((state) => state.playbackQuality);
	const playTalkTrack = useAudioPlayerStore((state) => state.playTalkTrack);
	const playInstrumental = useAudioPlayerStore(
		(state) => state.playInstrumental,
	);
	const queueLength = useAudioPlayerStore((state) => state.queue.length);
	const repeatMode = useAudioPlayerStore((state) => state.repeatMode);
	const queue = useAudioPlayerStore((state) => state.queue);
	const shuffle = useAudioPlayerStore((state) => state.shuffle);
	const status = useAudioPlayerStore((state) => state.status);
	const muted = useAudioPlayerStore((state) => state.muted);
	const volume = useAudioPlayerStore((state) => state.volume);
	const hidden = useAudioPlayerStore((state) => state.hidden);
	const playNext = useAudioPlayerStore((state) => state.playNext);
	const playPrev = useAudioPlayerStore((state) => state.playPrev);
	const playQueueTrack = useAudioPlayerStore((state) => state.playQueueTrack);
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

	const setVolume = useAudioPlayerStore((state) => state.setVolume);
	const togglePlay = useAudioPlayerStore((state) => state.togglePlay);
	const toggleMute = useAudioPlayerStore((state) => state.toggleMute);
	const toggleRepeatMode = useAudioPlayerStore(
		(state) => state.toggleRepeatMode,
	);
	const toggleShuffle = useAudioPlayerStore((state) => state.toggleShuffle);

	const markReady = useAudioPlayerStore((state) => state.markReady);
	const markPlaying = useAudioPlayerStore((state) => state.markPlaying);
	const markFinished = useAudioPlayerStore((state) => state.markFinished);
	const isLoading = status === "loading";
	const isPlaying = status === "playing";
	const hasPrev = queueLength > 1 && (index > 0 || repeatMode === "all");
	const hasNext =
		queueLength > 1 &&
		(shuffle || index < queueLength - 1 || repeatMode === "all");
	const qualityLabel = currentTrack
		? formatPlaybackQuality(currentTrack, playbackQuality)
		: null;

	const onReady = useEffectEvent(() => {
		markReady();
	});

	const onPlay = useEffectEvent(() => {
		markPlaying(true);
	});

	const onPause = useEffectEvent(() => {
		markPlaying(false);
	});

	const onFinish = useEffectEvent(() => {
		markFinished();
	});

	const onStalled = useEffectEvent((event: Event) => {
		console.log("audio stalled", event);
		void reloadAudio();
	});

	const refreshTimeLabel = useCallback(() => {
		const currentTimeInMs = (audioRef.current?.currentTime ?? 0) * 1000;
		const duration = currentTrack?.durationInMs ?? 0;
		const remainingTimeInMs = Math.max(duration - currentTimeInMs, 0);

		if (rightMinusRef.current) {
			rightMinusRef.current.style.opacity = showRemainingRef.current
				? "1"
				: "0";
		}

		if (rightLabelRef.current) {
			rightLabelRef.current.textContent = showRemainingRef.current
				? formatMsToTimer(remainingTimeInMs)
				: formatMsToTimer(currentTimeInMs);
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
	}, [audioRef, refreshTimeLabel]);

	const onMediaSessionPlay = useEffectEvent(() => {
		if (status === "playing" || status === "loading") return;
		void togglePlay();
	});

	const onMediaSessionPause = useEffectEvent(() => {
		pause();
	});

	const onMediaSessionPreviousTrack = useEffectEvent(() => {
		playPrev();
	});

	const onMediaSessionNextTrack = useEffectEvent(() => {
		playNext();
	});

	useEffect(() => {
		if (!("mediaSession" in navigator)) return;

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
	}, [currentTrack, status]);

	useEffect(() => {
		if (!("mediaSession" in navigator)) return;

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

			navigator.mediaSession.metadata = null;
			navigator.mediaSession.playbackState = "none";
		};
	}, [hasNext, hasPrev]);

	useEffect(() => {
		const audio = audioRef.current;
		const container = waveContainerRef.current;

		if (!audio || !container) return;

		const player = WaveSurfer.create({
			container,
			media: audio,

			height: 32,
			cursorWidth: 0,
			duration: AUDIO_PLAYER_IDLE_DURATION,
			interact: false,
			normalize: true,
			peaks: AUDIO_PLAYER_IDLE_PEAKS,
			dragToSeek: true,
			barWidth: 2,
			barGap: 2,
		});

		bindWaveSurfer(player);

		const unsubscribeReady = player.on("ready", () => {
			onReady();
		});

		const unsubscribePlay = player.on("play", () => {
			onPlay();
		});

		const unsubscribePause = player.on("pause", () => {
			onPause();
		});

		const unsubscribeFinish = player.on("finish", () => {
			onFinish();
		});

		const handleStalled = (event: Event) => onStalled(event);

		audio.addEventListener("stalled", handleStalled);

		return () => {
			unsubscribeReady();
			unsubscribePlay();
			unsubscribePause();
			unsubscribeFinish();
			audio.removeEventListener("stalled", handleStalled);
			bindWaveSurfer(null);

			player.destroy();
		};
	}, [bindWaveSurfer]);

	const hotkeyConfig: UseHotkeyOptions = {
		enabled: !hidden,
		conflictBehavior: "allow",
	};

	useHotkey(
		"Space",
		() => {
			void togglePlay();
		},
		hotkeyConfig,
	);

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

	useHotkey(
		"Control+ArrowLeft",
		() => {
			playPrev();
		},
		hotkeyConfig,
	);

	useHotkey(
		"Control+ArrowRight",
		() => {
			playNext();
		},
		hotkeyConfig,
	);

	useHotkey(
		"ArrowDown",
		() => {
			setVolume(volume - 0.05);
		},
		hotkeyConfig,
	);

	useHotkey(
		"ArrowUp",
		() => {
			setVolume(volume + 0.05);
		},
		hotkeyConfig,
	);

	useHotkey(
		"Q",
		() => {
			setIsOpenQueue(!isOpenQueue);
		},
		hotkeyConfig,
	);

	return (
		<div
			className={cn(
				"pointer-events-none z-20 shrink-0 px-2 pb-2 sm:px-3",
				hidden && "hidden",
			)}
		>
			<audio className="hidden" ref={audioRef} preload="metadata" />
			<div className="pointer-events-auto grid min-h-16 grid-cols-1 items-center gap-x-2 gap-y-1 rounded-lg border bg-background/95 px-2 py-1.5 shadow-lg/5 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-3 sm:px-3 sm:py-2 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,2fr)_minmax(8rem,1fr)]">
				<TrackInfo track={currentTrack} />

				<div className="flex min-w-0 flex-col gap-1 sm:col-span-2 sm:gap-2 lg:col-span-1">
					<div className="hidden grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:grid">
						<div />
						<div className="flex items-center justify-center gap-1">
							<Toggle
								aria-label="Shuffle"
								className="hidden size-8 text-muted-foreground data-pressed:bg-primary/10 data-pressed:text-primary data-pressed:hover:bg-primary/15 sm:inline-flex sm:size-7"
								disabled={queueLength === 0}
								onPressedChange={() => toggleShuffle()}
								pressed={shuffle}
							>
								<ShuffleIcon aria-hidden="true" />
							</Toggle>
							<Button
								aria-label="Previous track"
								disabled={!hasPrev || isLoading}
								onClick={playPrev}
								size="icon-sm"
								variant="ghost"
							>
								<SkipBackIcon aria-hidden="true" />
							</Button>
							<Button
								aria-label={isPlaying ? "Pause" : "Play"}
								className="text-foreground"
								disabled={!currentTrack || isLoading}
								loading={isLoading}
								onClick={() => {
									void togglePlay();
								}}
								size="icon"
								variant="ghost"
							>
								{isPlaying ? (
									<PauseIcon aria-hidden="true" />
								) : (
									<PlayIcon aria-hidden="true" />
								)}
							</Button>
							<Button
								aria-label="Next track"
								disabled={!hasNext || isLoading}
								onClick={playNext}
								size="icon-sm"
								variant="ghost"
							>
								<SkipForwardIcon aria-hidden="true" />
							</Button>
							<Button
								aria-label={`Repeat: ${repeatMode}`}
								className={cn(
									"hidden sm:inline-flex",
									repeatMode === "off"
										? "text-muted-foreground"
										: "bg-primary/10 text-primary hover:bg-primary/15",
								)}
								disabled={queueLength === 0}
								onClick={toggleRepeatMode}
								size="icon-sm"
								variant="ghost"
							>
								{repeatMode === "one" ? (
									<Repeat1Icon aria-hidden="true" />
								) : (
									<RepeatIcon aria-hidden="true" />
								)}
							</Button>
						</div>
						<div className="hidden min-w-0 text-right text-[11px] text-muted-foreground lg:block">
							{qualityLabel && <span className="truncate">{qualityLabel}</span>}
						</div>
					</div>
					<div className="relative flex min-h-8 w-full items-center gap-2 sm:min-h-10">
						{currentTrack && (
							<button
								type="button"
								className="shrink-0 cursor-pointer text-right text-xs text-muted-foreground tabular-nums transition-colors select-none"
								onClick={() => {
									showRemainingRef.current = !showRemainingRef.current;
									refreshTimeLabel();
								}}
							>
								<span className="inline-flex items-center justify-end">
									<span
										className="inline-block w-[1ch] text-center"
										ref={rightMinusRef}
									>
										-
									</span>
									<span ref={rightLabelRef}>{formatMsToTimer(0)}</span>
								</span>
							</button>
						)}
						<div className="relative min-h-8 flex-1 sm:min-h-10">
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
						<span className="shrink-0 text-xs text-muted-foreground tabular-nums">
							{currentTrack
								? formatMsToTimer(currentTrack.durationInMs)
								: formatMsToTimer(0)}
						</span>
					</div>
				</div>

				<div className="flex items-center justify-center gap-1 text-muted-foreground sm:col-start-2 sm:row-start-1 sm:justify-end lg:col-start-auto lg:row-start-auto">
					<div className="mr-auto hidden min-w-0 pl-2 text-[11px] text-muted-foreground sm:block lg:hidden">
						{qualityLabel && <span className="truncate">{qualityLabel}</span>}
					</div>
					<Toggle
						aria-label="Shuffle"
						className="size-8 text-muted-foreground data-pressed:bg-primary/10 data-pressed:text-primary data-pressed:hover:bg-primary/15 sm:hidden"
						disabled={queueLength === 0}
						onPressedChange={() => toggleShuffle()}
						pressed={shuffle}
					>
						<ShuffleIcon aria-hidden="true" />
					</Toggle>
					<Button
						aria-label="Previous track"
						disabled={!hasPrev || isLoading}
						onClick={playPrev}
						size="icon-sm"
						variant="ghost"
						className="sm:hidden"
					>
						<SkipBackIcon aria-hidden="true" />
					</Button>
					<Button
						aria-label={isPlaying ? "Pause" : "Play"}
						className="text-foreground sm:hidden"
						disabled={!currentTrack || isLoading}
						loading={isLoading}
						onClick={() => {
							void togglePlay();
						}}
						size="icon"
						variant="ghost"
					>
						{isPlaying ? (
							<PauseIcon aria-hidden="true" />
						) : (
							<PlayIcon aria-hidden="true" />
						)}
					</Button>
					<Button
						aria-label="Next track"
						disabled={!hasNext || isLoading}
						onClick={playNext}
						size="icon-sm"
						variant="ghost"
						className="sm:hidden"
					>
						<SkipForwardIcon aria-hidden="true" />
					</Button>
					<Button
						aria-label={`Repeat: ${repeatMode}`}
						className={cn(
							"sm:hidden",
							repeatMode === "off"
								? "text-muted-foreground"
								: "bg-primary/10 text-primary hover:bg-primary/15",
						)}
						disabled={queueLength === 0}
						onClick={toggleRepeatMode}
						size="icon-sm"
						variant="ghost"
					>
						{repeatMode === "one" ? (
							<Repeat1Icon aria-hidden="true" />
						) : (
							<RepeatIcon aria-hidden="true" />
						)}
					</Button>
					<VolumeControl
						buttonClassName="hidden sm:inline-flex"
						muted={muted}
						setVolume={setVolume}
						toggleMute={toggleMute}
						volume={volume}
					/>
					<QueueSheet
						isOpen={isOpenQueue}
						onOpenChange={setIsOpenQueue}
						index={index}
						playQueueTrack={playQueueTrack}
						queue={queue}
						queueLength={queueLength}
					/>
					<PlaybackQualitySettings
						playTalkTrack={playTalkTrack}
						playbackQuality={playbackQuality}
						playInstrumental={playInstrumental}
						setPlayTalkTrack={setPlayTalkTrack}
						setPlaybackQuality={setPlaybackQuality}
						setPlayInstrumental={setPlayInstrumental}
					/>
				</div>
			</div>
		</div>
	);
}
