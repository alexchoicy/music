import { useHotkey } from "@tanstack/react-hotkeys";
import type { UseHotkeyOptions } from "@tanstack/react-hotkeys";
import {
	ChevronDownIcon,
	MaximizeIcon,
	MinimizeIcon,
	PauseIcon,
	PlayIcon,
	RectangleHorizontalIcon,
	RefreshCwIcon,
	Settings2Icon,
	SquareIcon,
} from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import shaka from "shaka-player/dist/shaka-player.compiled.debug";

import { Button } from "#/components/base/button";
import {
	ContextMenu,
	ContextMenuCheckboxItem,
	ContextMenuItem,
	ContextMenuPopup,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "#/components/base/context-menu";
import {
	Menu,
	MenuCheckboxItem,
	MenuGroup,
	MenuGroupLabel,
	MenuItem,
	MenuPopup,
	MenuRadioGroup,
	MenuRadioItem,
	MenuTrigger,
} from "#/components/base/menu";
import { Slider } from "#/components/base/slider";
import { ConcertAmbientLight } from "#/components/concert/detail/ConcertAmbientLight";
import { VolumeControl } from "#/components/player/VolumeControl";
import type { components } from "#/data/APIschema";
import { formatMsToMMSSOrHMMSS } from "#/lib/utils/music";
import { cn } from "#/lib/utils/styles";
import { getPresignedUrl } from "#/store/audioPlayer/audioPlayerFunction";
import { useAudioPlayerStore } from "#/store/audioPlayer/audioPlayerStore";

type ConcertFile = components["schemas"]["ConcertFileDetails"];
type Playback = { isDash: boolean; url: string };
type AudioTrack = ReturnType<shaka.Player["getAudioTracks"]>[number];

const AUTOPLAY_STORAGE_KEY = "concert-autoplay";
const AMBIENT_LIGHT_STORAGE_KEY = "concert-ambient-light";

const SHAKA_PLAYER_CONFIG = {
	abr: { enabled: true },
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

function getPlayback(concertFile: ConcertFile): Playback {
	if (concertFile.file.dashAV1) {
		return { isDash: true, url: concertFile.file.dashAV1.url };
	}
	if (concertFile.file.remuxedOriginal) {
		return { isDash: false, url: concertFile.file.remuxedOriginal.url };
	}
	return { isDash: false, url: concertFile.file.original.url };
}

function useStoredSetting(key: string, defaultValue: boolean) {
	const [value, setValue] = useState(defaultValue);

	useEffect(() => {
		const stored = window.localStorage.getItem(key);
		if (stored !== null) setValue(stored === "true");
	}, [key]);

	return [
		value,
		(next: boolean) => {
			setValue(next);
			window.localStorage.setItem(key, String(next));
		},
	] as const;
}

type ConcertVideoPlayerProps = {
	files: ConcertFile[];
	currentFile: ConcertFile | null;
	coverUrl: string | null;
	isTheaterMode: boolean;
	onSelectFile: (file: ConcertFile) => void;
	onToggleTheaterMode: () => void;
	onPlayingChange: (isPlaying: boolean) => void;
};

export function ConcertVideoPlayer({
	files,
	currentFile,
	coverUrl,
	isTheaterMode,
	onSelectFile,
	onToggleTheaterMode,
	onPlayingChange,
}: ConcertVideoPlayerProps) {
	const setAudioPlayerHidden = useAudioPlayerStore((state) => state.setHidden);
	const pauseAudioPlayer = useAudioPlayerStore((state) => state.pause);
	const audioPlayerHidden = useAudioPlayerStore((state) => state.hidden);

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
	const [autoplay, setAutoplay] = useStoredSetting(AUTOPLAY_STORAGE_KEY, true);
	const [ambientLight, setAmbientLight] = useStoredSetting(
		AMBIENT_LIGHT_STORAGE_KEY,
		true,
	);

	// Video and music never play together.
	useEffect(() => {
		setAudioPlayerHidden(hasFile);
		if (hasFile) pauseAudioPlayer();
	}, [hasFile, pauseAudioPlayer, setAudioPlayerHidden]);

	useEffect(() => {
		const file = currentFile;
		const video = videoRef.current;
		if (!file || !video) return;

		const loadRequestId = ++loadRequestIdRef.current;

		async function loadFile(
			fileToLoad: ConcertFile,
			element: HTMLVideoElement,
		) {
			setCurrentTime(0);
			setDuration(0);
			setAudioTracks([]);

			const playback = getPlayback(fileToLoad);

			if (playback.isDash) {
				let player = playerRef.current;
				if (!player) {
					element.removeAttribute("src");
					element.load();
					player = new shaka.Player();
					player.configure(SHAKA_PLAYER_CONFIG);
					playerRef.current = player;
					await player.attach(element);
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
				setAudioTracks(player.getAudioTracks());
			} else {
				if (playerRef.current) {
					await playerRef.current.destroy();
					playerRef.current = null;
				}
				const presignedUrl = await getPresignedUrl(playback.url);
				if (!presignedUrl || loadRequestId !== loadRequestIdRef.current) return;
				element.src = presignedUrl;
				element.load();
			}

			if (loadRequestId !== loadRequestIdRef.current) return;
			try {
				await element.play();
			} catch {
				// Browsers can block autoplay; the play button stays available.
			}
		}

		void loadFile(file, video);

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
		if (videoRef.current) videoRef.current.currentTime = time;
	};

	const seekBy = (seconds: number) => {
		const video = videoRef.current;
		if (!video || !hasFile) return;
		seekTo(Math.min(Math.max(video.currentTime + seconds, 0), duration));
	};

	const setVolume = (next: number) => {
		setVolumeState(next);
		if (videoRef.current) videoRef.current.volume = next;
		if (next > 0) setMuted(false);
	};

	const togglePlayback = () => {
		const video = videoRef.current;
		if (!currentFile) {
			if (files[0]) onSelectFile(files[0]);
			return;
		}
		if (!video) return;
		if (video.paused) void video.play();
		else video.pause();
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

	const playNextFile = () => {
		if (!autoplay || !currentFile) return;
		const index = files.findIndex(
			(file) => file.concertFileId === currentFile.concertFileId,
		);
		const next = index === -1 ? undefined : files.at(index + 1);
		if (next) onSelectFile(next);
	};

	const onMediaSessionPlay = useEffectEvent(() => {
		if (currentFile) void videoRef.current?.play();
	});
	const onMediaSessionPause = useEffectEvent(() => {
		videoRef.current?.pause();
	});
	const onMediaSessionSeekBackward = useEffectEvent(
		(details: MediaSessionActionDetails) => seekBy(-(details.seekOffset ?? 10)),
	);
	const onMediaSessionSeekForward = useEffectEvent(
		(details: MediaSessionActionDetails) => seekBy(details.seekOffset ?? 10),
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
		} catch {
			// Some browsers reject position updates mid-load.
		}
	}, [currentFile, currentTime, duration]);

	// Claim the media keys only after the player bar has released them (it does so once hidden).
	useEffect(() => {
		if (!("mediaSession" in navigator) || !hasFile || !audioPlayerHidden)
			return;
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
			} catch {
				// Unsupported action.
			}
		}
		return () => {
			for (const [action] of actions) {
				try {
					navigator.mediaSession.setActionHandler(action, null);
				} catch {
					// Unsupported action.
				}
			}
			navigator.mediaSession.metadata = null;
			navigator.mediaSession.playbackState = "none";
		};
	}, [audioPlayerHidden, hasFile]);

	const hotkeyConfig: UseHotkeyOptions = {
		enabled: hasFile,
		conflictBehavior: "allow",
	};
	useHotkey("Space", togglePlayback, hotkeyConfig);
	useHotkey("ArrowLeft", () => seekBy(-1), hotkeyConfig);
	useHotkey("ArrowRight", () => seekBy(1), hotkeyConfig);
	useHotkey(
		"ArrowDown",
		() => setVolume(Math.max(volume - 0.05, 0)),
		hotkeyConfig,
	);
	useHotkey(
		"ArrowUp",
		() => setVolume(Math.min(volume + 0.05, 1)),
		hotkeyConfig,
	);

	const audioOptions = audioTracks.map((track, index) => ({
		label: track.label || track.language || `Audio ${index + 1}`,
		track,
		value: String(index),
	}));
	const currentAudioOption = audioOptions.find((option) => option.track.active);
	// Menus render inside the player while it is fullscreen so they stay visible.
	const portalProps = isFullscreen ? { container: containerRef } : undefined;
	const posterUrl =
		currentFile?.file.attachedPicture?.url ??
		currentFile?.file.thumbnail640x360?.url ??
		coverUrl ??
		undefined;

	return (
		<div className="relative isolate">
			{ambientLight && hasFile && !isFullscreen && (
				<ConcertAmbientLight videoRef={videoRef} />
			)}
			<ContextMenu>
				<ContextMenuTrigger
					onClick={togglePlayback}
					ref={containerRef}
					render={
						<div
							className={cn(
								"group/player relative flex aspect-video w-full cursor-pointer overflow-hidden rounded-2xl bg-black shadow-pop",
								isTheaterMode && "max-h-[calc(100svh-8rem)]",
								isFullscreen && "rounded-none",
							)}
							data-slot="concert-player"
						/>
					}
				>
					<video
						className="size-full"
						muted={muted}
						onEnded={playNextFile}
						onLoadedMetadata={(event) => {
							setDuration(event.currentTarget.duration || 0);
						}}
						onPause={() => {
							setIsPlaying(false);
							onPlayingChange(false);
						}}
						onPlay={() => {
							setIsPlaying(true);
							onPlayingChange(true);
						}}
						onTimeUpdate={(event) => {
							setCurrentTime(event.currentTarget.currentTime);
						}}
						playsInline
						poster={posterUrl}
						ref={videoRef}
					/>
					<span className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_--theme(--color-white/8%)]" />

					{!isPlaying && (
						<div className="absolute inset-0 flex items-center justify-center">
							<Button
								aria-label={hasFile ? "Play" : "Play first file"}
								disabled={!hasFile && files.length === 0}
								onClick={(event) => {
									event.stopPropagation();
									togglePlayback();
								}}
								size="icon-xl"
								variant="play"
							>
								<PlayIcon aria-hidden="true" />
							</Button>
						</div>
					)}

					{hasFile && (
						<div
							className={cn(
								"absolute inset-x-0 bottom-0 flex cursor-default flex-col gap-1.5 bg-linear-to-t from-background/95 to-transparent px-4 pt-12 pb-3 transition-opacity motion-reduce:transition-none",
								isPlaying &&
									"group-focus-within/player:opacity-100 group-hover/player:opacity-100 pointer-fine:opacity-0",
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
							<div className="flex flex-wrap items-center gap-1">
								<Button
									aria-label={isPlaying ? "Pause" : "Play"}
									onClick={togglePlayback}
									size="icon"
									variant="player"
								>
									{isPlaying ? (
										<PauseIcon aria-hidden="true" />
									) : (
										<PlayIcon aria-hidden="true" />
									)}
								</Button>
								<VolumeControl
									muted={muted}
									setVolume={setVolume}
									toggleMute={() => setMuted((value) => !value)}
									volume={volume}
								/>
								<span className="ms-1 text-xs font-medium tabular-nums">
									{formatMsToMMSSOrHMMSS(currentTime * 1000)} /{" "}
									{formatMsToMMSSOrHMMSS(duration * 1000)}
								</span>
								<span className="grow" />

								{audioOptions.length > 1 && (
									<Menu>
										<MenuTrigger
											render={
												<Button
													aria-label={`Audio track: ${currentAudioOption?.label ?? "Default"}`}
													className="hidden sm:inline-flex"
													size="sm"
													variant="player"
												/>
											}
										>
											Audio · {currentAudioOption?.label ?? "Default"}
											<ChevronDownIcon aria-hidden="true" />
										</MenuTrigger>
										<MenuPopup align="end" portalProps={portalProps} side="top">
											<MenuRadioGroup
												onValueChange={(value) => {
													const option = audioOptions.find(
														(item) => item.value === value,
													);
													if (!option || !playerRef.current) return;
													playerRef.current.selectAudioTrack(option.track);
													setAudioTracks(playerRef.current.getAudioTracks());
												}}
												value={currentAudioOption?.value}
											>
												{audioOptions.map((option) => (
													<MenuRadioItem
														key={option.value}
														value={option.value}
													>
														{option.label}
													</MenuRadioItem>
												))}
											</MenuRadioGroup>
										</MenuPopup>
									</Menu>
								)}

								<Menu>
									<MenuTrigger
										render={
											<Button
												aria-label="Player settings"
												size="icon"
												variant="player"
											/>
										}
									>
										<Settings2Icon aria-hidden="true" />
									</MenuTrigger>
									<MenuPopup align="end" portalProps={portalProps} side="top">
										<MenuGroup>
											<MenuGroupLabel>Playback</MenuGroupLabel>
											<MenuCheckboxItem
												checked={autoplay}
												onCheckedChange={setAutoplay}
												variant="switch"
											>
												Autoplay next file
											</MenuCheckboxItem>
											<MenuCheckboxItem
												checked={ambientLight}
												onCheckedChange={setAmbientLight}
												variant="switch"
											>
												Ambient light
											</MenuCheckboxItem>
											<MenuItem onClick={reloadPlayback}>
												<RefreshCwIcon aria-hidden="true" />
												Reload video
											</MenuItem>
										</MenuGroup>
									</MenuPopup>
								</Menu>

								<Button
									aria-label={
										isTheaterMode ? "Exit theater mode" : "Theater mode"
									}
									aria-pressed={isTheaterMode}
									className="max-lg:hidden"
									onClick={onToggleTheaterMode}
									size="icon"
									variant="player"
								>
									{isTheaterMode ? (
										<SquareIcon aria-hidden="true" />
									) : (
										<RectangleHorizontalIcon aria-hidden="true" />
									)}
								</Button>
								<Button
									aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
									onClick={toggleFullscreen}
									size="icon"
									variant="player"
								>
									{isFullscreen ? (
										<MinimizeIcon aria-hidden="true" />
									) : (
										<MaximizeIcon aria-hidden="true" />
									)}
								</Button>
							</div>
						</div>
					)}
				</ContextMenuTrigger>

				<ContextMenuPopup portalProps={portalProps}>
					<ContextMenuItem
						disabled={!hasFile && files.length === 0}
						onClick={togglePlayback}
					>
						{isPlaying ? (
							<PauseIcon aria-hidden="true" />
						) : (
							<PlayIcon aria-hidden="true" />
						)}
						{isPlaying ? "Pause" : "Play"}
					</ContextMenuItem>
					<ContextMenuItem disabled={!hasFile} onClick={reloadPlayback}>
						<RefreshCwIcon aria-hidden="true" />
						Reload video
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuCheckboxItem
						checked={autoplay}
						onCheckedChange={setAutoplay}
						variant="switch"
					>
						Autoplay next file
					</ContextMenuCheckboxItem>
					<ContextMenuCheckboxItem
						checked={ambientLight}
						onCheckedChange={setAmbientLight}
						variant="switch"
					>
						Ambient light
					</ContextMenuCheckboxItem>
					<ContextMenuSeparator />
					<ContextMenuItem
						className="max-lg:hidden"
						onClick={onToggleTheaterMode}
					>
						{isTheaterMode ? "Exit theater mode" : "Theater mode"}
					</ContextMenuItem>
					<ContextMenuItem onClick={toggleFullscreen}>
						{isFullscreen ? "Exit fullscreen" : "Fullscreen"}
					</ContextMenuItem>
				</ContextMenuPopup>
			</ContextMenu>
		</div>
	);
}
