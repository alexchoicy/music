import { Badge } from "#/components/coss/badge";
import { EXTRA_CATEGORY } from "#/enums/extraEnums";
import type { ExtraDetails } from "#/lib/queries/extra.queries";

import { ExtraCover } from "./ExtraCover";
import {
	getAssetStatusLabel,
	getAssetThumbnailUrl,
	getExtraCover,
} from "./extraUtils";

export function ExtraCard({
	extra,
	onOpen,
}: {
	extra: ExtraDetails;
	onOpen: () => void;
}) {
	const cover = getExtraCover(extra);
	const assets = extra.assets ?? [];
	const statusLabel =
		assets.map(getAssetStatusLabel).find((label) => label !== null) ?? null;

	return (
		<button
			className="group grid content-start gap-2 rounded-2xl p-2 text-left outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
			data-testid="extra-card"
			onClick={onOpen}
			type="button"
		>
			<ExtraCover
				alt={`${extra.title} cover`}
				className="aspect-square w-full"
				croppedArea={cover?.croppedArea}
				height={Number(cover?.asset.original?.height ?? 1)}
				src={cover ? getAssetThumbnailUrl(cover.asset) : undefined}
				width={Number(cover?.asset.original?.width ?? 1)}
			/>
			<div className="grid gap-1 px-1">
				<span className="truncate font-medium">{extra.title}</span>
				<div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
					<Badge size="sm" variant="secondary">
						{EXTRA_CATEGORY[extra.category]}
					</Badge>
					<span>
						{assets.length} file{assets.length === 1 ? "" : "s"}
					</span>
					{statusLabel && (
						<Badge
							size="sm"
							variant={statusLabel === "Failed" ? "error" : "warning"}
						>
							{statusLabel}
						</Badge>
					)}
				</div>
			</div>
		</button>
	);
}
