import { ListMusicIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "#/lib/utils/styles";

export function PlaylistArtwork({
	coverUrls,
	className,
	fallbackIcon,
}: {
	coverUrls: (string | null)[];
	className?: string;
	fallbackIcon?: ReactNode;
}) {
	const tiles =
		coverUrls.length > 1
			? Array.from(
					{ length: 4 },
					(_, index) => coverUrls[index % coverUrls.length],
				)
			: [coverUrls[0] ?? null];

	return (
		<div
			aria-hidden="true"
			className={cn(
				"artwork-edge relative grid aspect-square overflow-hidden rounded-xl bg-muted shadow-card",
				tiles.length > 1 && "grid-cols-2 grid-rows-2",
				className,
			)}
		>
			{tiles.map((url, index) => (
				<div
					className="flex min-h-0 items-center justify-center text-muted-foreground"
					key={index}
				>
					{url ? (
						<img
							alt=""
							className="size-full object-cover"
							loading="lazy"
							src={url}
						/>
					) : (
						(fallbackIcon ?? (
							<ListMusicIcon className="size-1/3 max-h-12 max-w-12" />
						))
					)}
				</div>
			))}
		</div>
	);
}
