import { useHotkey } from "@tanstack/react-hotkeys";
import type { UseHotkeyOptions } from "@tanstack/react-hotkeys";
import {
	Maximize2,
	MaximizeIcon,
	Minimize2,
	MinimizeIcon,
	PauseIcon,
	PlayIcon,
	RefreshCwIcon,
} from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
// import shaka from "shaka-player";
import shaka from "shaka-player/dist/shaka-player.compiled.debug";

import { Button } from "#/components/coss/button";
import {
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/coss/empty";
import {
	Select,
	SelectItem,
	SelectPopup,
	SelectTrigger,
	SelectValue,
} from "#/components/coss/select";
import { Slider } from "#/components/coss/slider";
import { VolumeControl } from "#/components/VolumeControl";
import type { components } from "#/data/APIschema";
import { formatMsToTimer } from "#/lib/utils/music";
import { cn } from "#/lib/utils/styles";
import { getPresignedUrl } from "#/store/audioPlayer/audioPlayerFunction";
import { useAudioPlayerStore } from "#/store/audioPlayer/audioPlayerStore";

type ConcertFile = components["schemas"]["ConcertFileDetails"];
type Playback = { isDash: boolean; url: string };
type AudioTrack = ReturnType<shaka.Player["getAudioTracks"]>[number];

const SHAKA_PLAYER_CONFIG = {
	abr: {
		enabled: true,
	},
	streaming: {
		bufferBehind: 30,
		bufferingGoal: 30,
		rebufferingGoal: 2,
		retryParameters: {
			backoffFactor: 2,
			baseDelay: 1000,
			fuzzFactor: 0.5,
			maxAttempts: 3,
			timeout: 30000,
		},
	},
};

type ConcertPlayerProps = {
	currentFile: ConcertFile | null;
	isTheaterMode: boolean;
	onToggleTheaterMode: () => void;
};

function getPlayback(concertFile: ConcertFile): Playback {
	if (concertFile.file.dashAV1) {
		return { isDash: true, url: concertFile.file.dashAV1.url };
	}

	if (concertFile.file.remuxedOriginal) {
		return { isDash: false, url: concertFile.file.remuxedOriginal.url };
	}

	return { isDash: false, url: concertFile.file.original.url };
}

export function ConcertPlayer({
	currentFile,
	isTheaterMode,
	onToggleTheaterMode,
}: ConcertPlayerProps) {
	const setAudioPlayerHidden = useAudioPlayerStore((state) => state.setHidden);
	const pauseAudioPlayer = useAudioPlayerStore((state) => state.pause);

	const videoRef = useRef<HTMLVideoElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const playerRef = useRef<shaka.Player | null>(null);
	const loadRequestIdRef = useRef(0);
	const hasFile = currentFile !== null;

	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolumeState] = useState(1);
	const [muted, setMuted] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);

	const logLoadedPlayer = (player: shaka.Player) => {
		console.log("[concert-player] loaded", {
			variantTracks: player.getVariantTracks(),
			textTracks: player.getTextTracks(),
			stats: player.getStats(),
		});
	};

	useEffect(() => {
		setAudioPlayerHidden(hasFile);
		if (hasFile) pauseAudioPlayer();
	}, [hasFile, pauseAudioPlayer, setAudioPlayerHidden]);

	useEffect(() => {
		const file = currentFile;
		const video = videoRef.current;
		if (!file || !video) return;

		const loadRequestId = ++loadRequestIdRef.current;

		async function loadCurrentFile(
			fileToLoad: ConcertFile,
			videoElement: HTMLVideoElement,
		) {
			setCurrentTime(0);
			setDuration(0);
			setAudioTracks([]);

			const playback = getPlayback(fileToLoad);

			if (playback.isDash) {
				let player = playerRef.current;

				if (!player) {
					videoElement.removeAttribute("src");
					videoElement.load();
					player = new shaka.Player();
					player.configure(SHAKA_PLAYER_CONFIG);
					playerRef.current = player;
					await player.attach(videoElement);
				}

				if (loadRequestId !== loadRequestIdRef.current) return;

				const manifestOrigin = new URL(playback.url, window.location.href)
					.origin;
				const networkingEngine = player.getNetworkingEngine();

				networkingEngine?.clearAllRequestFilters();
				networkingEngine?.registerRequestFilter((_type, request) => {
					const requestUrl = request.uris[0];
					if (
						requestUrl &&
						new URL(requestUrl, window.location.href).origin === manifestOrigin
					) {
						request.allowCrossSiteCredentials = true;
					}
				});

				await player.load(playback.url);
				logLoadedPlayer(player);
				setAudioTracks(player.getAudioTracks());
			} else {
				if (playerRef.current) {
					await playerRef.current.destroy();
					playerRef.current = null;
				}

				const presignedUrl = await getPresignedUrl(playback.url);

				if (!presignedUrl || loadRequestId !== loadRequestIdRef.current) return;

				videoElement.src = presignedUrl;
				videoElement.load();
			}

			if (loadRequestId !== loadRequestIdRef.current) return;

			try {
				await videoElement.play();
			} catch (error) {
				console.log("[concert-player] autoplay failed", error);
			}
		}

		void loadCurrentFile(file, video);

		return () => {
			loadRequestIdRef.current++;
		};
	}, [currentFile]);

	useEffect(() => {
		return () => {
			setAudioPlayerHidden(false);
			void playerRef.current?.destroy();
		};
	}, [setAudioPlayerHidden]);

	useEffect(() => {
		const syncFullscreen = () => {
			setIsFullscreen(document.fullscreenElement === containerRef.current);
		};

		document.addEventListener("fullscreenchange", syncFullscreen);
		return () => {
			document.removeEventListener("fullscreenchange", syncFullscreen);
		};
	}, []);

	const seekTo = (time: number) => {
		setCurrentTime(time);
		if (videoRef.current) {
			videoRef.current.currentTime = time;
		}
	};

	const seekBy = (seconds: number) => {
		const video = videoRef.current;
		if (!video || !hasFile) return;

		seekTo(Math.min(Math.max(video.currentTime + seconds, 0), duration));
	};

	const changeVolume = (amount: number) => {
		const video = videoRef.current;
		if (!video || !hasFile) return;

		const nextVolume = Math.min(Math.max(volume + amount, 0), 1);
		setVolumeState(nextVolume);
		video.volume = nextVolume;
		if (nextVolume > 0) setMuted(false);
	};

	const togglePlayback = () => {
		const video = videoRef.current;
		if (!video || !currentFile) return;

		if (video.paused) {
			void video.play();
		} else {
			video.pause();
		}
	};

	const reloadPlayback = () => {
		const file = currentFile;
		const video = videoRef.current;
		if (!file || !video) return;

		const loadRequestId = ++loadRequestIdRef.current;
		const playback = getPlayback(file);

		const resumeTime = video.currentTime;
		const wasPaused = video.paused;

		void (async () => {
			if (playback.isDash) {
				const player = playerRef.current;
				if (!player) return;

				await player.load(playback.url, resumeTime);
				if (loadRequestId !== loadRequestIdRef.current) return;

				setAudioTracks(player.getAudioTracks());
				if (!wasPaused) void video.play();
				return;
			}

			const presignedUrl = await getPresignedUrl(playback.url);
			if (!presignedUrl || loadRequestId !== loadRequestIdRef.current) return;

			video.addEventListener(
				"loadedmetadata",
				() => {
					if (loadRequestId !== loadRequestIdRef.current) return;
					video.currentTime = Math.min(
						resumeTime,
						video.duration || resumeTime,
					);
					if (!wasPaused) void video.play();
				},
				{ once: true },
			);
			video.src = presignedUrl;
			video.load();
		})();
	};

	const toggleFullscreen = () => {
		const container = containerRef.current;
		if (!container) return;

		if (document.fullscreenElement) {
			void document.exitFullscreen();
			return;
		}

		void container.requestFullscreen();
	};

	const onMediaSessionPlay = useEffectEvent(() => {
		if (!currentFile) return;
		void videoRef.current?.play();
	});

	const onMediaSessionPause = useEffectEvent(() => {
		videoRef.current?.pause();
	});

	const onMediaSessionSeekBackward = useEffectEvent(
		(details: MediaSessionActionDetails) => {
			seekBy(-(details.seekOffset ?? 10));
		},
	);

	const onMediaSessionSeekForward = useEffectEvent(
		(details: MediaSessionActionDetails) => {
			seekBy(details.seekOffset ?? 10);
		},
	);

	const onMediaSessionSeekTo = useEffectEvent(
		(details: MediaSessionActionDetails) => {
			if (details.seekTime === undefined) return;

			const video = videoRef.current;
			if (details.fastSeek && video?.fastSeek) {
				video.fastSeek(details.seekTime);
				return;
			}

			seekTo(details.seekTime);
		},
	);

	useEffect(() => {
		if (!("mediaSession" in navigator)) return;

		const artwork = currentFile
			? (currentFile.file.attachedPicture?.url ??
				currentFile.file.thumbnail640x360?.url)
			: null;

		navigator.mediaSession.metadata = currentFile
			? new MediaMetadata({
					artwork: artwork ? [{ src: artwork }] : undefined,
					title: currentFile.title,
				})
			: null;

		navigator.mediaSession.playbackState = currentFile
			? isPlaying
				? "playing"
				: "paused"
			: "none";
	}, [currentFile, isPlaying]);

	useEffect(() => {
		if (!("mediaSession" in navigator) || !currentFile || duration <= 0) return;

		try {
			navigator.mediaSession.setPositionState({
				duration,
				playbackRate: videoRef.current?.playbackRate ?? 1,
				position: Math.min(currentTime, duration),
			});
		} catch {}
	}, [currentFile, currentTime, duration]);

	useEffect(() => {
		if (!("mediaSession" in navigator) || !hasFile) return;

		const actions: [MediaSessionAction, MediaSessionActionHandler][] = [
			["play", onMediaSessionPlay],
			["pause", onMediaSessionPause],
			["seekbackward", onMediaSessionSeekBackward],
			["seekforward", onMediaSessionSeekForward],
			["seekto", onMediaSessionSeekTo],
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
	}, [hasFile]);

	const showPlayButton = hasFile && !isPlaying;
	const showControls = hasFile;
	const audioOptions = audioTracks.map((track, index) => ({
		label: track.label || `Audio ${index + 1}`,
		track,
		value: String(index),
	}));
	const currentAudioOption = audioOptions.find((option) => option.track.active);

	const hotkeyConfig: UseHotkeyOptions = {
		enabled: hasFile,
		conflictBehavior: "allow",
	};

	useHotkey(
		"Space",
		() => {
			togglePlayback();
		},
		hotkeyConfig,
	);

	useHotkey("ArrowLeft", () => seekBy(-1), hotkeyConfig);
	useHotkey("ArrowRight", () => seekBy(1), hotkeyConfig);
	useHotkey("ArrowDown", () => changeVolume(-0.05), hotkeyConfig);
	useHotkey("ArrowUp", () => changeVolume(0.05), hotkeyConfig);

	return (
		<div
			className={cn(
				"group relative flex aspect-video w-full overflow-hidden rounded-3xl border border-border/60 bg-black shadow-sm",
				hasFile && "cursor-pointer",
				isTheaterMode && "max-h-[calc(100svh-8rem)]",
				isFullscreen && "rounded-none border-none",
			)}
			onClick={togglePlayback}
			data-slot="concert-player"
			ref={containerRef}
		>
			<video
				className="h-full w-full"
				muted={muted}
				onLoadedMetadata={(event) => {
					setDuration(event.currentTarget.duration || 0);
				}}
				onPause={() => {
					setIsPlaying(false);
				}}
				onPlay={() => {
					setIsPlaying(true);
				}}
				onTimeUpdate={(event) => {
					setCurrentTime(event.currentTarget.currentTime);
				}}
				ref={videoRef}
			/>

			{showPlayButton && (
				<div className="absolute inset-0 flex items-center justify-center">
					<Button
						aria-label="Play"
						className="text-white hover:bg-white/10"
						size="icon-lg"
						variant="ghost"
					>
						<PlayIcon aria-hidden="true" />
					</Button>
				</div>
			)}

			{!hasFile && (
				<Empty className="absolute inset-0 text-white">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<PlayIcon aria-hidden="true" />
						</EmptyMedia>
						<EmptyTitle>Select a file to start playing</EmptyTitle>
					</EmptyHeader>
				</Empty>
			)}

			{showControls && (
				<div
					className={cn(
						"absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-linear-to-t from-black/80 via-black/40 to-transparent p-3 transition-opacity",
						isPlaying && "opacity-0 group-hover:opacity-100",
					)}
					onClick={(event) => event.stopPropagation()}
				>
					<Slider
						aria-label="Seek"
						disabled={duration === 0}
						max={duration}
						min={0}
						onValueChange={(next) => {
							if (typeof next === "number") seekTo(next);
						}}
						step={1}
						value={currentTime}
					/>
					<div className="flex items-center gap-1 text-white">
						<Button
							aria-label={isPlaying ? "Pause" : "Play"}
							className="text-white hover:bg-white/10 hover:text-white"
							onClick={togglePlayback}
							size="icon-sm"
							variant="ghost"
						>
							{isPlaying ? (
								<PauseIcon aria-hidden="true" />
							) : (
								<PlayIcon aria-hidden="true" />
							)}
						</Button>

						<VolumeControl
							buttonClassName="text-white hover:bg-white/10 hover:text-white"
							muted={muted}
							setVolume={(next) => {
								setVolumeState(next);
								if (videoRef.current) videoRef.current.volume = next;
							}}
							toggleMute={() => setMuted((value) => !value)}
							volume={volume}
						/>

						<span className="ml-1 text-xs tabular-nums">
							{formatMsToTimer(currentTime * 1000)} /{" "}
							{formatMsToTimer(duration * 1000)}
						</span>

						<div className="ml-auto flex items-center gap-1">
							<Button
								aria-label="Reload media"
								className="text-white hover:bg-white/10 hover:text-white"
								onClick={reloadPlayback}
								size="icon-sm"
								variant="ghost"
							>
								<RefreshCwIcon aria-hidden="true" />
							</Button>
							{audioOptions.length > 1 && (
								<Select
									items={audioOptions}
									onValueChange={(option) => {
										if (!option || !playerRef.current) return;

										playerRef.current.selectAudioTrack(option.track);
										setAudioTracks(playerRef.current.getAudioTracks());
									}}
									value={currentAudioOption}
								>
									<SelectTrigger
										aria-label="Select audio track"
										className="hidden max-w-52 min-w-40 border-white/15 bg-black/20 text-white hover:bg-white/10 sm:inline-flex"
										size="sm"
									>
										<SelectValue />
									</SelectTrigger>
									<SelectPopup align="end">
										{audioOptions.map((option) => (
											<SelectItem key={option.value} value={option}>
												{option.label}
											</SelectItem>
										))}
									</SelectPopup>
								</Select>
							)}
							<Button
								aria-label="Toggle theater mode"
								className="text-white hover:bg-white/10 hover:text-white"
								onClick={onToggleTheaterMode}
								size="icon-sm"
								variant="ghost"
							>
								{isTheaterMode ? <Minimize2 /> : <Maximize2 />}
							</Button>
							<Button
								aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
								className="text-white hover:bg-white/10 hover:text-white"
								onClick={toggleFullscreen}
								size="icon-sm"
								variant="ghost"
							>
								{isFullscreen ? (
									<MinimizeIcon aria-hidden="true" />
								) : (
									<MaximizeIcon aria-hidden="true" />
								)}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
