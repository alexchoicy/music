import { Link } from "@tanstack/react-router";
import type { components } from "@/data/APIschema";
import { Badge } from "./shadcn/badge";
import { Card } from "./shadcn/card";

type AlbumCardProps = {
	album: components["schemas"]["AlbumListItemModel"];
};

export function AlbumCard({ album }: AlbumCardProps) {
	return (
		<Link to="/albums/$id" params={{ id: album.albumId.toString() }}>
			<Card className="relative mx-auto w-full max-w-96 pt-0">
				{album.coverVariants ? (
					<div className="relative aspect-square overflow-hidden bg-muted">
						<img
							src={album.coverVariants?.[0]?.url}
							alt={`${album.title} album cover`}
							className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
						/>
						<Badge className="absolute right-2 top-2 bg-black/60 backdrop-blur-sm">
							{album.type}
						</Badge>
					</div>
				) : (
					<div></div>
				)}
				<div className="space-y-2 pl-4">
					<h3 className="line-clamp-2 text-balance font-semibold leading-tight">
						{album.title}
					</h3>
					<p className="text-sm text-muted-foreground line-clamp-3">
						{album.artists.map((artist) => artist.name).join(", ")}
					</p>
					<p className="text-xs text-muted-foreground">
						{album.trackCount} songs
					</p>
				</div>
			</Card>
		</Link>
	);
}
