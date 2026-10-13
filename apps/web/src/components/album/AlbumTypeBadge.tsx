import {
	AudioLinesIcon,
	ClapperboardIcon,
	Disc3Icon,
	EllipsisIcon,
	LibraryIcon,
	MicIcon,
	Music2Icon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "#/components/base/badge";
import type { components } from "#/data/APIschema";

type AlbumType = components["schemas"]["AlbumType"];

export const ALBUM_TYPE_ICON: Record<AlbumType, LucideIcon> = {
	Album: Disc3Icon,
	Single: Music2Icon,
	Compilation: LibraryIcon,
	Live: MicIcon,
	Soundtrack: ClapperboardIcon,
	Remix: AudioLinesIcon,
	Other: EllipsisIcon,
};

type AlbumTypeBadgeProps = {
	type: AlbumType;
	className?: string;
	surface?: "page" | "artwork";
};

export function AlbumTypeBadge({
	type,
	className,
	surface = "page",
}: AlbumTypeBadgeProps) {
	const Icon = ALBUM_TYPE_ICON[type];

	return (
		<Badge
			className={className}
			size="tag"
			variant={surface === "artwork" ? "artwork" : "secondary"}
		>
			<Icon aria-hidden="true" />
			<span className="truncate" data-slot="badge-label">
				{type}
			</span>
		</Badge>
	);
}
