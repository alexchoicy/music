import { Badge } from "#/components/base/badge";
import type { QualityTier } from "#/components/player/playbackQuality";

const TIER_VARIANT = {
	"Hi-Res": "warning",
	Lossless: "success",
	Original: "secondary",
	"Opus 96": "outline",
} as const satisfies Record<QualityTier, string>;

export function QualityBadge({
	className,
	tier,
}: {
	className?: string;
	tier: QualityTier;
}) {
	return (
		<Badge className={className} variant={TIER_VARIANT[tier]}>
			{tier}
		</Badge>
	);
}
