import { Badge } from "@/components/ui/badge";
import type { IconName } from "@/components/ui/icon";
import type { AlbumType } from "@/lib/schema";

export const albumTypeIcons: Record<AlbumType, IconName> = {
	Album: "album",
	Single: "musicNote",
	Compilation: "albums",
	Live: "mic",
	Soundtrack: "film",
	Remix: "nowPlaying",
	Other: "more",
};

type AlbumTypeBadgeProps = {
	type: AlbumType;
	surface?: "page" | "artwork";
	/** Small tiles keep the icon and accessible label without the text. */
	iconOnly?: boolean;
	className?: string;
};

export function AlbumTypeBadge({
	type,
	surface = "page",
	iconOnly,
	className,
}: AlbumTypeBadgeProps) {
	return (
		<Badge
			className={className}
			icon={albumTypeIcons[type]}
			iconOnly={iconOnly}
			label={type}
			size="tag"
			variant={surface === "artwork" ? "artwork" : "secondary"}
		/>
	);
}
