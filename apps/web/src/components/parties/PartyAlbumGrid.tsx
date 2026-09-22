import { AlbumCard } from "#/components/AlbumCard";
import type { components } from "#/data/APIschema";
import { cn } from "#/lib/utils/styles";

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

	return (
		<div
			className={cn(
				"grid min-w-0 grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
				variant === "preview" &&
					"[&>*:nth-child(n+3)]:hidden md:[&>*:nth-child(n+3)]:block md:[&>*:nth-child(n+4)]:hidden lg:[&>*:nth-child(n+4)]:block lg:[&>*:nth-child(n+5)]:hidden xl:[&>*:nth-child(n+5)]:block",
			)}
		>
			{albums.map((album) => {
				return <AlbumCard album={album} key={album.albumId} />;
			})}
		</div>
	);
}
