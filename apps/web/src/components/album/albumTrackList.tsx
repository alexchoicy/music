import { Clock } from "lucide-react";
import type { components } from "@/data/APIschema";
import { AlbumTrackListItem } from "./AlbumTrackListItem";

type AlbumTrackListProps = {
	album: components["schemas"]["AlbumDetailsModel"];
};

export function AlbumTrackList({ album }: AlbumTrackListProps) {
	return (
		<div>
			<div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-3 border-b text-sm font-medium text-muted-foreground">
				<div className="w-8 text-center">#</div>
				<div>Title</div>
				<div className="hidden sm:block">Time</div>
				<div className="w-8"></div>
			</div>

			<div>
				{album.discs.map((disc) => {
					return (
						<div key={disc.discNumber}>
							<div className="flex items-center gap-2 p-3">
								<div className="h-px flex-1 bg-border" />
								<span className="text-base text-muted-foreground tracking-wider">
									Disc {disc.discNumber} {disc.subtitle && `- ${disc.subtitle}`}
								</span>
								<div className="h-px flex-1 bg-border" />
							</div>

							{disc.tracks.map((track) => (
								<AlbumTrackListItem key={track.trackId} track={track} />
							))}
						</div>
					);
				})}
			</div>
		</div>
	);
}
