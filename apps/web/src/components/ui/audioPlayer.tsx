import {
	ListMusic,
	Music,
	Play,
	RepeatIcon,
	Shuffle,
	SkipBack,
	SkipForward,
} from "lucide-react";
import { useAudioPlayer } from "@/contexts/audioPlayerContext";
import { Button } from "../shadcn/button";

export function AudioPlayer() {
	const { waveContainerRef } = useAudioPlayer();

	return (
		<div className="w-full bg-background/95 p-2 border-t">
			<div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-4 items-center">
				{/*album info*/}
				<div className="flex items-center gap-3 min-w-0 hover:bg-accent p-2">
					<div className="relative w-14 h-14 shrink-0 rounded bg-muted">
						{/*<img
							src=""
							alt="Album Art"
							className="w-full h-full object-cover"
						/>*/}
						<Music className="w-full h-full object-cover" />
					</div>
					<div className="min-w-0 flex-1">
						<p className="font-medium text-base truncate">title</p>
						<p className="text-sm text-muted-foreground truncate">artists</p>
						<p className="text-sm text-muted-foreground truncate">album</p>
					</div>
				</div>

				{/*audio control*/}
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-center gap-2">
						<Button variant="ghost" size="icon" className="h-8 w-8">
							<Shuffle className="h-4 w-4" />
						</Button>
						<Button variant="ghost" size="icon" className="h-8 w-8">
							<SkipBack className="h-4 w-4" />
						</Button>
						<Button variant="ghost" size="icon" className="h-8 w-8">
							<Play className="h-4 w-4" />
						</Button>
						<Button variant="ghost" size="icon" className="h-8 w-8">
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
					</Button>
				</div>
			</div>
		</div>
	);
}
