import type { Ref } from "react";

import { AlbumCard } from "#/components/AlbumCard";
import type { components } from "#/data/APIschema";

type Album = components["schemas"]["AlbumListItem"];

type AlbumGridProps = {
	albums: Album[];
	ref?: Ref<HTMLDivElement>;
	variant?: "grid" | "preview";
};

export const albumGridClassName =
	"grid min-w-0 grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 min-[112.5rem]:grid-cols-7 min-[131.25rem]:grid-cols-8";

const previewAlbumClasses = [
	"block",
	"block",
	"hidden md:block",
	"hidden lg:block",
	"hidden xl:block",
	"hidden 2xl:block",
	"hidden min-[112.5rem]:block",
	"hidden min-[131.25rem]:block",
];

export function AlbumGrid({ albums, ref, variant = "grid" }: AlbumGridProps) {
	if (albums.length === 0) return null;
	const displayedAlbums =
		variant === "preview"
			? albums.slice(0, previewAlbumClasses.length)
			: albums;

	return (
		<div className={albumGridClassName} ref={ref}>
			{displayedAlbums.map((album, index) => (
				<AlbumCard
					album={album}
					className={
						variant === "preview" ? previewAlbumClasses[index] : undefined
					}
					key={album.albumId}
				/>
			))}
		</div>
	);
}
