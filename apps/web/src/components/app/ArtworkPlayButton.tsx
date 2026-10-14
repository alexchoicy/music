import { PlayIcon } from "lucide-react";

import { Button } from "#/components/base/button";

// Revealed by hovering or focusing anything in the parent `group/tile`,
// including the tile's stretched title link; always shown without hover.
export function ArtworkPlayButton({
	label,
	onPlay,
}: {
	label: string;
	onPlay: () => void;
}) {
	return (
		<span className="pointer-events-auto absolute right-2 bottom-2 z-10 opacity-0 transition-[opacity,translate] duration-150 group-focus-within/tile:opacity-100 group-hover/tile:opacity-100 motion-safe:translate-y-1 motion-safe:group-focus-within/tile:translate-y-0 motion-safe:group-hover/tile:translate-y-0 [@media(hover:none)]:opacity-100 motion-safe:[@media(hover:none)]:translate-y-0">
			<Button aria-label={label} onClick={onPlay} size="icon-xl" variant="play">
				<PlayIcon aria-hidden="true" className="size-4" />
			</Button>
		</span>
	);
}
