import clsx from "clsx";
import {
	ListMusic,
	Music,
	Pause,
	Play,
	Repeat,
	Repeat1,
	Shuffle,
	SkipBack,
	SkipForward,
} from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import {
	useAudioPlayerActions,
	useAudioPlayerAvailability,
	useAudioPlayerRefs,
	useAudioPlayerStatus,
} from "@/contexts/audioPlayerContext";
import { getMMSSFromMs } from "@/lib/utils/display";
import { Button } from "../shadcn/button";

const AUDIO_TIME_EVENTS = [
	"timeupdate",
	"loadedmetadata",
	"durationchange",
	"seeking",
	"seeked",
	"ended",
] as const;

function AudioPlayerTimeToggle({ durationInMs }: { durationInMs: number }) {
	// turn out do it in DOM is the correct way
	const { audioRef } = useAudioPlayerRefs();
	const showRemainingTimeRef = useRef(false);
	const minusRef = useRef<HTMLSpanElement | null>(null);
	const labelRef = useRef<HTMLSpanElement | null>(null);

	const refreshTimeLabel = useCallback(() => {
		const currentTimeInMs = (audioRef.current?.currentTime ?? 0) * 1000;
		const remainingTimeInMs = Math.max(durationInMs - currentTimeInMs, 0);

		if (minusRef.current) {
			minusRef.current.style.opacity = showRemainingTimeRef.current ? "1" : "0";
		}

		if (labelRef.current) {
			labelRef.current.textContent = showRemainingTimeRef.current
				? getMMSSFromMs(remainingTimeInMs)
				: getMMSSFromMs(currentTimeInMs);
		}
	}, [audioRef, durationInMs]);

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

	return (
		<button
			type="button"
			className={clsx(
				"tabular-nums text-right justify-self-end cursor-pointer select-none transition-colors",
			)}
			onClick={() => {
				showRemainingTimeRef.current = !showRemainingTimeRef.current;
				refreshTimeLabel();
			}}
		>
			<span className="inline-flex items-center justify-end">
				<span className="inline-block w-[1ch] text-center" ref={minusRef}>
					-
				</span>
				<span ref={labelRef}>{getMMSSFromMs(0)}</span>
			</span>
		</button>
	);
}

export function AudioPlayer() {
	const { waveContainerRef } = useAudioPlayerRefs();
	const { currentTrack, shouldHidePlayer, hasPrev, hasNext } =
		useAudioPlayerAvailability();
	const { isPlaying, repeatMode } = useAudioPlayerStatus();
	const { goPrev, goNext, toggle, toggleRepeat } = useAudioPlayerActions();

	return (
		<div
			className={clsx("w-full bg-background/95 p-2 border-t", {
				hidden: shouldHidePlayer,
			})}
		>
			<div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-4 items-center">
				{/*album info*/}
				<div className="flex items-center gap-3 min-w-0 hover:bg-accent p-2">
					<div className="relative w-14 h-14 shrink-0 rounded bg-muted">
						{currentTrack?.albumCoverUrl ? (
							<img
								src={currentTrack.albumCoverUrl}
								alt={currentTrack.albumTitle}
								className="w-full h-full object-cover rounded"
							/>
						) : (
							<Music className="w-full h-full object-cover" />
						)}
					</div>
					<div className="min-w-0 flex-1">
						<p className="font-medium text-base truncate">
							{currentTrack?.trackTitle ?? "No track selected"}
						</p>
						<p className="text-sm text-muted-foreground truncate">
							{currentTrack?.artists.join(", ") ?? "-"}
						</p>
						<p className="text-sm text-muted-foreground truncate">
							{currentTrack?.albumTitle ?? "-"}
						</p>
					</div>
				</div>

				{/*audio control*/}
				<div className="flex flex-col gap-2">
					<div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
						<div className="tabular-nums justify-self-start">
							{getMMSSFromMs(currentTrack?.durationInMs ?? 0)}
						</div>
						<div className="flex items-center justify-center">
							<Button variant="ghost" size="icon" className="h-8 w-8">
								<Shuffle className="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								disabled={!hasPrev}
								onClick={goPrev}
							>
								<SkipBack className="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								disabled={!currentTrack}
								onClick={toggle}
							>
								{isPlaying ? (
									<Pause className="h-4 w-4" />
								) : (
									<Play className="h-4 w-4" />
								)}
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								disabled={!hasNext}
								onClick={goNext}
							>
								<SkipForward className="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={toggleRepeat}
							>
								{repeatMode === "off" ? (
									<Repeat className="h-4 w-4 text-muted-foreground" />
								) : repeatMode === "all" ? (
									<Repeat className="h-4 w-4 text-primary" />
								) : (
									<Repeat1 className="h-4 w-4 text-primary" />
								)}
							</Button>
						</div>
						<AudioPlayerTimeToggle
							durationInMs={currentTrack?.durationInMs ?? 0}
						/>
					</div>
					<div className="w-full mx-auto" ref={waveContainerRef}></div>
				</div>

				{/* settings */}
				<div className="flex items-center justify-end gap-2">
					<Button variant="ghost" size="icon" className="h-16 w-16">
						<ListMusic className="h-16 w-16 " />
					</Button>
				</div>
			</div>
		</div>
	);
}
