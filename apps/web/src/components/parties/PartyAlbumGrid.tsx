import { AlbumCard } from "#/components/AlbumCard";
import type { components } from "#/data/APIschema";

type PartyAlbum = components["schemas"]["AlbumListItem"];

type PartyAlbumGridProps = {
	albums: PartyAlbum[];
	variant?: "grid" | "preview";
};

export function PartyAlbumGrid({
	albums,
	variant = "grid",
}: PartyAlbumGridProps) {
	if (albums.length === 0) return null;

	if (variant === "preview") {
		return (
			<div className="flex h-[410px] flex-row flex-wrap justify-center gap-4 overflow-hidden p-3">
				{albums.map((album) => {
					return (
						<AlbumCard
							album={album}
							className="h-[385px] w-[250px]"
							key={album.albumId}
						/>
					);
				})}
			</div>
		);
	}

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
			{albums.map((album) => {
				return <AlbumCard album={album} key={album.albumId} />;
			})}
		</div>
	);
}
