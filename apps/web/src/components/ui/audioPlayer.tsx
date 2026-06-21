import { useHotkey } from "@tanstack/react-hotkeys";
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
	Volume1Icon,
	Volume2Icon,
	VolumeIcon,
	VolumeXIcon,
} from "lucide-react";
import { useCallback, useEffect, useEffectEvent, useRef } from "react";
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
import { Slider } from "#/components/coss/slider";
import { Toggle } from "#/components/coss/toggle";
import { formatMsToTimer } from "#/lib/utils/music";
import { cn } from "#/lib/utils/styles";
import {
	AUDIO_PLAYER_IDLE_DURATION,
	AUDIO_PLAYER_IDLE_PEAKS,
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
	const file =
		playbackQuality === "Opus96"
			? (track.audio.file.opus96 ?? track.audio.file.original)
			: track.audio.file.original;
	const label =
		playbackQuality === "Opus96" && track.audio.file.opus96
			? "Opus 96"
			: (formatCodec(file.codec) ?? "Original");
	const parts = [
		label,
		formatSampleRate(file.audioSampleRate),
		formatBitrate(file.bitrate),
	].filter((part) => part !== null);

	return parts.length > 0 ? parts.join(" • ") : null;
}

function getVolumeIcon(muted: boolean, volume: number) {
	if (muted) return VolumeXIcon;
	if (volume === 0) return VolumeIcon;
	if (volume < 0.5) return Volume1Icon;
	return Volume2Icon;
}

type TrackInfoProps = {
	track?: AudioPlayerTrack;
};

function TrackInfo({ track }: TrackInfoProps) {
	if (!track) {
		return (
			<div className="flex min-w-0 items-center gap-3 rounded-md p-2">
				<div className="relative size-14 shrink-0 rounded-md bg-muted text-muted-foreground">
					<div className="flex h-full w-full items-center justify-center">
						<Music2Icon aria-hidden="true" className="size-6" />
					</div>
				</div>
				<div className="min-w-0 flex-1">
					<p className="truncate text-base font-medium">No track selected</p>
					<p className="truncate text-sm text-muted-foreground">-</p>
					<p className="truncate text-sm text-muted-foreground">-</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-w-0 items-center gap-3 p-2 text-foreground">
			<Link
				className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
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
			<div className="min-w-0 flex-1">
				<Link
					className="truncate rounded-sm text-base font-medium outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
					params={{ id: track.albumId }}
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
				<p className="truncate text-sm text-muted-foreground">
					<Link
						className="rounded-sm outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
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

type VolumeControlProps = {
	muted: boolean;
	volume: number;
	setVolume: (volume: number) => void;
	toggleMute: () => void;
};

function VolumeControl({
	muted,
	volume,
	setVolume,
	toggleMute,
}: VolumeControlProps) {
	const VolumeIconComponent = getVolumeIcon(muted, volume);

	return (
		<Popover>
			<PopoverTrigger
				closeDelay={150}
				delay={0}
				openOnHover
				render={
					<Button
						aria-label={muted ? "Unmute" : "Mute"}
						onClick={(event) => {
							event.preventDefault();
							toggleMute();
						}}
						size="icon-sm"
						variant="ghost"
					/>
				}
			>
				<VolumeIconComponent aria-hidden="true" />
			</PopoverTrigger>
			<PopoverPopup
				align="center"
				className="w-auto"
				side="top"
				sideOffset={8}
				tooltipStyle
			>
				<Slider
					aria-label="Volume level"
					className="h-20 [&_[data-slot=slider-control]]:min-h-20"
					max={1}
					min={0}
					onValueChange={(nextValue) => {
						if (typeof nextValue === "number") {
							setVolume(nextValue);
						}
					}}
					orientation="vertical"
					step={0.01}
					value={muted ? 0 : volume}
				/>
			</PopoverPopup>
		</Popover>
	);
}

type QueueSheetProps = {
	index: number;
	queue: AudioPlayerTrack[];
	queueLength: number;
	playQueueTrack: (index: number) => void;
};

function QueueSheet({
	index,
	queue,
	queueLength,
	playQueueTrack,
}: QueueSheetProps) {
	return (
		<Sheet>
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
	playbackQuality: PlaybackQuality;
	setPlaybackQuality: (quality: PlaybackQuality) => void;
};

function PlaybackQualitySettings({
	playbackQuality,
	setPlaybackQuality,
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
							if (value === "Original" || value === "Opus96") {
								setPlaybackQuality(value);
							}
						}}
						value={playbackQuality}
					>
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

	const bindWaveSurfer = useAudioPlayerStore((state) => state.bindWaveSurfer);
	const currentTrack = useAudioPlayerStore((state) =>
		state.queue.at(state.index),
	);
	const index = useAudioPlayerStore((state) => state.index);
	const playbackQuality = useAudioPlayerStore((state) => state.playbackQuality);
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
	const setPlaybackQuality = useAudioPlayerStore(
		(state) => state.setPlaybackQuality,
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

	useEffect(() => {
		const audio = audioRef.current;
		const container = waveContainerRef.current;

		if (!audio || !container) return;

		const player = WaveSurfer.create({
			container,
			media: audio,

			height: 40,
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

		return () => {
			unsubscribeReady();
			unsubscribePlay();
			unsubscribePause();
			unsubscribeFinish();

			bindWaveSurfer(null);

			player.destroy();
		};
	}, [bindWaveSurfer]);

	useHotkey(
		"Space",
		() => {
			if (hidden) return;
			void togglePlay();
		},
		{ conflictBehavior: "allow" },
	);

	useHotkey(
		"ArrowLeft",
		() => {
			if (hidden || !audioRef.current) return;
			audioRef.current.currentTime = Math.max(
				audioRef.current.currentTime - 1,
				0,
			);
		},
		{ conflictBehavior: "allow" },
	);

	useHotkey(
		"ArrowRight",
		() => {
			if (hidden || !audioRef.current) return;
			audioRef.current.currentTime = Math.min(
				audioRef.current.currentTime + 1,
				audioRef.current.duration || audioRef.current.currentTime + 1,
			);
		},
		{ conflictBehavior: "allow" },
	);

	useHotkey(
		"ArrowDown",
		() => {
			if (hidden) return;
			setVolume(volume - 0.05);
		},
		{ conflictBehavior: "allow" },
	);

	useHotkey(
		"ArrowUp",
		() => {
			if (hidden) return;
			setVolume(volume + 0.05);
		},
		{ conflictBehavior: "allow" },
	);

	return (
		<div
			className={cn(
				"pointer-events-none absolute inset-x-0 bottom-0 z-20 p-2 sm:px-3",
				hidden && "hidden",
			)}
		>
			<audio className="hidden" ref={audioRef} preload="metadata" />
			<div className="pointer-events-auto grid min-h-16 grid-cols-1 items-center gap-3 rounded-lg border bg-background/95 px-2 py-2 shadow-lg/5 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,2fr)_minmax(8rem,1fr)]">
				<TrackInfo track={currentTrack} />

				<div className="flex min-w-0 flex-col gap-2">
					<div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
						<div />
						<div className="flex items-center justify-center gap-1">
							<Toggle
								aria-label="Shuffle"
								className="size-8 text-muted-foreground data-pressed:bg-primary/10 data-pressed:text-primary data-pressed:hover:bg-primary/15 sm:size-7"
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
						<div className="min-w-0 text-right text-[11px] text-muted-foreground">
							{qualityLabel && <span className="truncate">{qualityLabel}</span>}
						</div>
					</div>
					<div className="relative flex min-h-10 w-full items-center gap-2">
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
						<div className="relative min-h-10 flex-1">
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

				<div className="flex items-center justify-end gap-1 text-muted-foreground">
					<VolumeControl
						muted={muted}
						setVolume={setVolume}
						toggleMute={toggleMute}
						volume={volume}
					/>
					<QueueSheet
						index={index}
						playQueueTrack={playQueueTrack}
						queue={queue}
						queueLength={queueLength}
					/>
					<PlaybackQualitySettings
						playbackQuality={playbackQuality}
						setPlaybackQuality={setPlaybackQuality}
					/>
				</div>
			</div>
		</div>
	);
}
