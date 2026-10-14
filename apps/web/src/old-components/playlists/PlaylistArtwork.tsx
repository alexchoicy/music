import { ListMusicIcon } from "lucide-react";

import { cn } from "#/lib/utils/styles";

export function PlaylistArtwork({
	coverUrls,
	className,
}: {
	coverUrls: (string | null)[];
	className?: string;
}) {
	const tiles =
		coverUrls.length > 1
			? Array.from(
					{ length: 4 },
					(_, index) => coverUrls[index % coverUrls.length],
				)
			: [coverUrls[0]];
	return (
		<div
			aria-hidden="true"
			className={cn(
				"grid aspect-square overflow-hidden bg-muted",
				tiles.length > 1 && "grid-cols-2 grid-rows-2",
				className,
			)}
		>
			{tiles.map((url, index) => (
				<div key={index} className="flex min-h-0 items-center justify-center">
					{url ? (
						<img
							alt=""
							src={url}
							loading="lazy"
							className="size-full object-cover"
						/>
					) : (
						<ListMusicIcon className="size-1/3 max-h-12 max-w-12 text-muted-foreground" />
					)}
				</div>
			))}
		</div>
	);
}
