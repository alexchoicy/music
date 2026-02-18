import {
	ListMusic,
	Music,
	Pause,
	Play,
	RepeatIcon,
	Shuffle,
	SkipBack,
	SkipForward,
} from "lucide-react";
import { useAudioPlayer } from "@/contexts/audioPlayerContext";
import { Button } from "../shadcn/button";

export function AudioPlayer() {
	const {
		waveContainerRef,
		currentTrack,
		isPrev,
		isNext,
		isPlaying,
		goPrev,
		goNext,
		toggle,
	} = useAudioPlayer();

	return (
		<div className="w-full bg-background/95 p-2 border-t">
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
					<div className="flex items-center justify-center gap-2">
						<Button variant="ghost" size="icon" className="h-8 w-8">
							<Shuffle className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							disabled={!isPrev}
							onClick={goPrev}
						>
							<SkipBack className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							disabled={!currentTrack}
							onClick={() => {
								void toggle();
							}}
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
							disabled={!isNext}
							onClick={goNext}
						>
							<SkipForward className="h-4 w-4" />
						</Button>
						<Button variant="ghost" size="icon" className="h-8 w-8">
							<RepeatIcon className="h-4 w-4" />
						</Button>
					</div>
					<div className="w-full mx-auto" ref={waveContainerRef}></div>
				</div>

				{/* settings */}
				<div className="flex items-center justify-end gap-2">
					<Button variant="ghost" size="icon" className="h-16 w-16">
						<ListMusic className="h-16 w-16 " />
						{isPlaying && (
							<div className="absolute top-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}
