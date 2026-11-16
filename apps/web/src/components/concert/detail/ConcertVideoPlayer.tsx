import type * as API from "@music/api";
import { useHotkey } from "@tanstack/react-hotkeys";
import type { UseHotkeyOptions } from "@tanstack/react-hotkeys";
import { PauseIcon, PlayIcon, RefreshCwIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "#/components/base/button";
import {
	ContextMenu,
	ContextMenuCheckboxItem,
	ContextMenuItem,
	ContextMenuPopup,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "#/components/base/context-menu";
import { ConcertAmbientLight } from "#/components/concert/detail/ConcertAmbientLight";
import { ConcertPlayerControls } from "#/components/concert/detail/ConcertPlayerControls";
import { useConcertCaptions } from "#/components/concert/detail/useConcertCaptions";
import { useConcertMediaSession } from "#/components/concert/detail/useConcertMediaSession";
import { useShakaPlayer } from "#/components/concert/detail/useShakaPlayer";
import { handlePlayerSpace } from "#/lib/utils/browser";
import { cn } from "#/lib/utils/styles";
import { useAudioPlayerStore } from "#/store/audioPlayer/audioPlayerStore";
import { useConcertPlayerStore } from "#/store/concertPlayerStore";

type ConcertFile = API.ConcertFileDetails;

const CONTROLS_IDLE_MS = 3000;

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
	const idleTimerRef = useRef<number | undefined>(undefined);
	const hasFile = currentFile !== null;

	const [isPlaying, setIsPlaying] = useState(false);
	const [muted, setMuted] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [isIdle, setIsIdle] = useState(false);
	const [controlsHeight, setControlsHeight] = useState(0);
	const autoplay = useConcertPlayerStore((state) => state.autoplay);
	const setAutoplay = useConcertPlayerStore((state) => state.setAutoplay);
	const ambientLight = useConcertPlayerStore((state) => state.ambientLight);
	const setAmbientLight = useConcertPlayerStore(
		(state) => state.setAmbientLight,
	);
	const volume = useConcertPlayerStore((state) => state.volume);
	const setStoredVolume = useConcertPlayerStore((state) => state.setVolume);
	const { playerRef, loadId, audioTracks, selectAudioTrack, reload } =
		useShakaPlayer(videoRef, containerRef, currentFile);
	const captions = useConcertCaptions(playerRef, currentFile, loadId);
	const controlsHidden = isPlaying && isIdle;

	useEffect(() => {
		setAudioPlayerHidden(hasFile);
		if (hasFile) pauseAudioPlayer();
	}, [hasFile, pauseAudioPlayer, setAudioPlayerHidden]);

	useEffect(() => {
		return () => {
			setAudioPlayerHidden(false);
			window.clearTimeout(idleTimerRef.current);
		};
	}, [setAudioPlayerHidden]);

	useEffect(() => {
		if (videoRef.current) videoRef.current.volume = volume;
	}, [volume]);

	useEffect(() => {
		const syncFullscreen = () => {
			setIsFullscreen(document.fullscreenElement === containerRef.current);
		};
		document.addEventListener("fullscreenchange", syncFullscreen);
		return () => {
			document.removeEventListener("fullscreenchange", syncFullscreen);
		};
	}, []);

	const hasOpenPopup = () =>
		containerRef.current?.querySelector("[data-popup-open]") != null;

	const showControls = () => {
		setIsIdle(false);
		window.clearTimeout(idleTimerRef.current);
		idleTimerRef.current = window.setTimeout(() => {
			if (hasOpenPopup()) showControls();
			else setIsIdle(true);
		}, CONTROLS_IDLE_MS);
	};

	const seekBy = (seconds: number) => {
		const video = videoRef.current;
		if (!video || !hasFile || !Number.isFinite(video.duration)) return;
		video.currentTime = Math.min(
			Math.max(video.currentTime + seconds, 0),
			video.duration,
		);
		showControls();
	};

	const setVolume = (next: number) => {
		setStoredVolume(next);
		if (next > 0) setMuted(false);
		showControls();
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

	useConcertMediaSession({
		videoRef,
		file: currentFile,
		isPlaying,
		enabled: audioPlayerHidden,
		seekBy,
	});

	const hotkeyConfig: UseHotkeyOptions = {
		enabled: hasFile,
		conflictBehavior: "allow",
	};
	useHotkey("Space", togglePlayback, hotkeyConfig);
	useHotkey("ArrowLeft", () => seekBy(-1), hotkeyConfig);
	useHotkey("ArrowRight", () => seekBy(1), hotkeyConfig);
	useHotkey("ArrowDown", () => setVolume(volume - 0.05), hotkeyConfig);
	useHotkey("ArrowUp", () => setVolume(volume + 0.05), hotkeyConfig);

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
					onKeyDown={(event) => {
						showControls();
						handlePlayerSpace(event, togglePlayback);
					}}
					onPointerDown={showControls}
					onPointerLeave={() => {
						if (hasOpenPopup()) return;
						window.clearTimeout(idleTimerRef.current);
						setIsIdle(true);
					}}
					onPointerMove={showControls}
					ref={containerRef}
					render={
						<div
							className={cn(
								"group/player relative flex aspect-video w-full cursor-pointer overflow-hidden rounded-2xl bg-black shadow-pop",
								isTheaterMode && "max-h-[calc(100svh-8rem)]",
								isFullscreen && "rounded-none",
								controlsHidden && "pointer-fine:cursor-none",
							)}
							data-controls-hidden={controlsHidden || undefined}
							data-slot="concert-player"
							style={
								{
									"--controls-height": `${controlsHeight}px`,
								} as React.CSSProperties
							}
						/>
					}
				>
					<video
						className="size-full"
						muted={muted}
						onEnded={playNextFile}
						onPause={() => {
							setIsPlaying(false);
							onPlayingChange(false);
						}}
						onPlay={() => {
							setIsPlaying(true);
							onPlayingChange(true);
							showControls();
						}}
						playsInline
						poster={posterUrl}
						ref={videoRef}
					/>
					<span className="artwork-edge pointer-events-none absolute inset-0 rounded-[inherit]" />

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
						<ConcertPlayerControls
							audioTracks={audioTracks}
							captions={captions}
							hidden={controlsHidden}
							isFullscreen={isFullscreen}
							isPlaying={isPlaying}
							isTheaterMode={isTheaterMode}
							key={currentFile.concertFileId}
							muted={muted}
							onHeightChange={setControlsHeight}
							onReload={reload}
							onSelectAudioTrack={selectAudioTrack}
							onToggleFullscreen={toggleFullscreen}
							onTogglePlayback={togglePlayback}
							onToggleTheaterMode={onToggleTheaterMode}
							portalProps={portalProps}
							setVolume={setVolume}
							toggleMute={() => setMuted((value) => !value)}
							videoRef={videoRef}
							volume={volume}
						/>
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
					<ContextMenuItem disabled={!hasFile} onClick={reload}>
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
