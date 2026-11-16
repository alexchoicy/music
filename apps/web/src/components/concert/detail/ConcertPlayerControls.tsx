import {
	CaptionsIcon,
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
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { Button } from "#/components/base/button";
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
import type { useConcertCaptions } from "#/components/concert/detail/useConcertCaptions";
import type { AudioTrack } from "#/components/concert/detail/useShakaPlayer";
import { VolumeControl } from "#/components/player/VolumeControl";
import { formatMsToMMSSOrHMMSS } from "#/lib/utils/music";
import { cn } from "#/lib/utils/styles";
import { useConcertPlayerStore } from "#/store/concertPlayerStore";

type ConcertPlayerControlsProps = {
	videoRef: RefObject<HTMLVideoElement | null>;
	hidden: boolean;
	isPlaying: boolean;
	isFullscreen: boolean;
	isTheaterMode: boolean;
	volume: number;
	muted: boolean;
	audioTracks: AudioTrack[];
	captions: ReturnType<typeof useConcertCaptions>;
	portalProps?: { container: RefObject<HTMLDivElement | null> };
	setVolume: (volume: number) => void;
	toggleMute: () => void;
	onTogglePlayback: () => void;
	onToggleTheaterMode: () => void;
	onToggleFullscreen: () => void;
	onSelectAudioTrack: (track: AudioTrack) => void;
	onReload: () => void;
	onHeightChange: (height: number) => void;
};

function useVideoTime(videoRef: RefObject<HTMLVideoElement | null>) {
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);

	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;
		const syncTime = () => setCurrentTime(video.currentTime);
		const syncDuration = () =>
			setDuration(Number.isFinite(video.duration) ? video.duration : 0);
		const reset = () => {
			setCurrentTime(0);
			setDuration(0);
		};
		video.addEventListener("timeupdate", syncTime);
		video.addEventListener("seeking", syncTime);
		video.addEventListener("durationchange", syncDuration);
		video.addEventListener("emptied", reset);
		return () => {
			video.removeEventListener("timeupdate", syncTime);
			video.removeEventListener("seeking", syncTime);
			video.removeEventListener("durationchange", syncDuration);
			video.removeEventListener("emptied", reset);
		};
	}, [videoRef]);

	return { currentTime, duration, setCurrentTime };
}

export function ConcertPlayerControls({
	videoRef,
	hidden,
	isPlaying,
	isFullscreen,
	isTheaterMode,
	volume,
	muted,
	audioTracks,
	captions,
	portalProps,
	setVolume,
	toggleMute,
	onTogglePlayback,
	onToggleTheaterMode,
	onToggleFullscreen,
	onSelectAudioTrack,
	onReload,
	onHeightChange,
}: ConcertPlayerControlsProps) {
	const autoplay = useConcertPlayerStore((state) => state.autoplay);
	const setAutoplay = useConcertPlayerStore((state) => state.setAutoplay);
	const ambientLight = useConcertPlayerStore((state) => state.ambientLight);
	const setAmbientLight = useConcertPlayerStore(
		(state) => state.setAmbientLight,
	);
	const { currentTime, duration, setCurrentTime } = useVideoTime(videoRef);
	const [dragTime, setDragTime] = useState<number | null>(null);
	const shownTime = dragTime ?? (duration === 0 ? 0 : currentTime);
	const controlsRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const controls = controlsRef.current;
		if (!controls) return;
		const observer = new ResizeObserver(() => {
			const paddingTop = Number.parseFloat(
				getComputedStyle(controls).paddingTop,
			);
			onHeightChange(controls.offsetHeight - paddingTop);
		});
		observer.observe(controls);
		return () => observer.disconnect();
	}, [onHeightChange]);

	const audioOptions = audioTracks.map((track, index) => ({
		label: track.label || track.language || `Audio ${index + 1}`,
		track,
		value: String(index),
	}));
	const currentAudioOption = audioOptions.find((option) => option.track.active);

	return (
		<div
			ref={controlsRef}
			className={cn(
				"absolute inset-x-0 bottom-0 flex cursor-default flex-col gap-1.5 bg-linear-to-t from-background/95 to-transparent px-4 pt-12 pb-3 transition-opacity motion-reduce:transition-none",
				hidden && "pointer-fine:pointer-events-none pointer-fine:opacity-0",
			)}
			onClick={(event) => event.stopPropagation()}
		>
			<Slider
				aria-label="Seek"
				className="[&_[data-slot=slider-control]]:cursor-pointer"
				disabled={duration === 0}
				max={duration || 1}
				min={0}
				onValueChange={(next) => {
					if (typeof next === "number") setDragTime(next);
				}}
				onValueCommitted={(next) => {
					if (typeof next === "number" && videoRef.current) {
						videoRef.current.currentTime = next;
						setCurrentTime(next);
					}
					setDragTime(null);
				}}
				step={1}
				value={shownTime}
			/>
			<div className="flex flex-wrap items-center gap-1">
				<Button
					aria-label={isPlaying ? "Pause" : "Play"}
					onClick={onTogglePlayback}
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
					toggleMute={toggleMute}
					volume={volume}
				/>
				<span className="ms-1 text-xs font-medium tabular-nums">
					{formatMsToMMSSOrHMMSS(shownTime * 1000)} /{" "}
					{formatMsToMMSSOrHMMSS(duration * 1000)}
				</span>
				<span className="grow" />

				{captions.options.length > 0 && (
					<Menu>
						<MenuTrigger
							render={
								<Button aria-label="Subtitles" size="icon" variant="player" />
							}
						>
							<CaptionsIcon aria-hidden="true" />
						</MenuTrigger>
						<MenuPopup align="end" portalProps={portalProps} side="top">
							<MenuGroup>
								<MenuGroupLabel>Subtitles</MenuGroupLabel>
								<MenuRadioGroup
									onValueChange={(value) =>
										captions.select(value === "off" ? null : String(value))
									}
									value={captions.selectedKey ?? "off"}
								>
									<MenuRadioItem value="off">Off</MenuRadioItem>
									{captions.options.map((option) => (
										<MenuRadioItem key={option.key} value={option.key}>
											{option.label}
										</MenuRadioItem>
									))}
								</MenuRadioGroup>
							</MenuGroup>
						</MenuPopup>
					</Menu>
				)}

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
									if (option) onSelectAudioTrack(option.track);
								}}
								value={currentAudioOption?.value}
							>
								{audioOptions.map((option) => (
									<MenuRadioItem key={option.value} value={option.value}>
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
							<MenuItem onClick={onReload}>
								<RefreshCwIcon aria-hidden="true" />
								Reload video
							</MenuItem>
						</MenuGroup>
					</MenuPopup>
				</Menu>

				<Button
					aria-label={isTheaterMode ? "Exit theater mode" : "Theater mode"}
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
					onClick={onToggleFullscreen}
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
	);
}
