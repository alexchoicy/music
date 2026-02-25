import type { components } from "@/data/APIschema";
import { AlbumCard } from "../albumCard";

export type AlbumDisplayTabProps = {
	albums: components["schemas"]["AlbumListItemModel"][];
};

export function AlbumDisplayTab({ albums }: AlbumDisplayTabProps) {
	return (
		<div className="grid p-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
			{albums.map((album) => (
				<AlbumCard key={album.albumId} album={album} />
			))}
		</div>
	);
}
