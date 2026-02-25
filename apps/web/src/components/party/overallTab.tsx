import { ChevronRight } from "lucide-react";
import type { components } from "@/data/APIschema";
import type { TabValue } from "@/routes/_authed/parties/$id";
import { AlbumCard } from "../albumCard";
import { Button } from "../shadcn/button";

export type OverallTabProps = {
	albums: components["schemas"]["AlbumListItemModel"][];
	single: components["schemas"]["AlbumListItemModel"][];
	featured: components["schemas"]["AlbumListItemModel"][];
	onViewClick: (type: TabValue) => void;
};

export function OverallTab({
	albums,
	single,
	featured,
	onViewClick,
}: OverallTabProps) {
	return (
		<div className="flex flex-col gap-10 p-6 md:p-8">
			{albums.length > 0 && (
				<div>
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-semibold text-foreground">Albums</h2>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onViewClick("albums")}
							className="text-muted-foreground hover:text-foreground gap-1"
						>
							View All
							<ChevronRight className="size-4" />
						</Button>
					</div>
					<div className="flex flex-row justify-center gap-4 flex-wrap overflow-hidden p-3 h-[410px]">
						{albums.map((album) => (
							<AlbumCard
								key={album.albumId}
								album={album}
								className="h-[385px] w-[250px]"
							/>
						))}
					</div>
				</div>
			)}
			{single.length > 0 && (
				<div>
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-semibold text-foreground">Single</h2>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onViewClick("single")}
							className="text-muted-foreground hover:text-foreground gap-1"
						>
							View All
							<ChevronRight className="size-4" />
						</Button>
					</div>
					<div className="flex flex-row justify-center gap-4 flex-wrap overflow-hidden p-3 h-[410px]">
						{single.map((album) => (
							<AlbumCard
								key={album.albumId}
								album={album}
								className="h-[385px] w-[250px]"
							/>
						))}
					</div>
				</div>
			)}
			{featured.length > 0 && (
				<div>
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-semibold text-foreground">
							Featured In
						</h2>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onViewClick("featured")}
							className="text-muted-foreground hover:text-foreground gap-1"
						>
							View All
							<ChevronRight className="size-4" />
						</Button>
					</div>
					<div className="flex flex-row justify-center gap-4 flex-wrap overflow-hidden p-3 h-[410px]">
						{featured.map((album) => (
							<AlbumCard
								key={album.albumId}
								album={album}
								className="h-[385px] w-[250px]"
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
