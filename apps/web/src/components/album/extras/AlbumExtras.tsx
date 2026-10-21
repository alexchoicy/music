import type * as API from "@music/api";
import {
	CircleAlertIcon,
	ClockIcon,
	FileIcon,
	FilmIcon,
	ImageIcon,
	MusicIcon,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "#/components/base/badge";
import { FilterChips } from "#/components/library/FilterChips";
import { EXTRA_CATEGORY } from "#/enums/extraEnums";
import type { ExtraDetails } from "#/lib/queries/extra.queries";

import { formatFileCount, getExtraStatusLabel } from "./extraAssets";
import { ExtraCover } from "./ExtraCover";
import { ExtraViewerDialog } from "./ExtraViewerDialog";

type ExtraCategory = API.ExtraCategory;

const CATEGORY_ORDER = Object.keys(EXTRA_CATEGORY) as ExtraCategory[];

export function AlbumExtras({ extras }: { extras: ExtraDetails[] }) {
	const [categories, setCategories] = useState<ExtraCategory[]>([]);
	const [viewingId, setViewingId] = useState<string | null>(null);

	if (extras.length === 0) return null;

	const counts = new Map<ExtraCategory, number>();
	for (const extra of extras)
		counts.set(extra.category, (counts.get(extra.category) ?? 0) + 1);
	const presentCategories = CATEGORY_ORDER.filter((category) =>
		counts.has(category),
	);
	const activeCategories = categories.filter((category) =>
		counts.has(category),
	);
	const visibleExtras =
		activeCategories.length === 0
			? extras
			: extras.filter((extra) => activeCategories.includes(extra.category));
	const viewing = extras.find((extra) => extra.extraId === viewingId);

	return (
		<section aria-labelledby="album-extras" className="flex flex-col gap-4">
			<div className="flex items-baseline gap-3">
				<h2 className="text-xl font-semibold tracking-tight" id="album-extras">
					Extras
				</h2>
				<span className="text-xs text-muted-foreground tabular-nums">
					{extras.length} {extras.length === 1 ? "extra" : "extras"}
				</span>
			</div>

			{presentCategories.length > 1 && (
				<FilterChips
					allCount={extras.length}
					hideLabel
					label="Category"
					onValueChange={setCategories}
					options={presentCategories.map((category) => ({
						count: counts.get(category),
						label: EXTRA_CATEGORY[category],
						value: category,
					}))}
					value={activeCategories}
				/>
			)}

			<ul className="-mx-2 grid grid-cols-2 gap-x-2 gap-y-1 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
				{visibleExtras.map((extra) => (
					<li className="min-w-0" key={extra.extraId}>
						<ExtraTile
							extra={extra}
							onOpen={() => setViewingId(extra.extraId)}
						/>
					</li>
				))}
			</ul>

			{viewing && (
				<ExtraViewerDialog
					extra={viewing}
					key={viewing.extraId}
					onClose={() => setViewingId(null)}
				/>
			)}
		</section>
	);
}

function getCountIcon(extra: ExtraDetails) {
	const types = new Set((extra.assets ?? []).map((asset) => asset.fileType));
	if (types.size !== 1) return FileIcon;
	if (types.has("Image")) return ImageIcon;
	if (types.has("Video")) return FilmIcon;
	if (types.has("Audio")) return MusicIcon;
	return FileIcon;
}

function ExtraTile({
	extra,
	onOpen,
}: {
	extra: ExtraDetails;
	onOpen: () => void;
}) {
	const fileCount = extra.assets?.length ?? 0;
	const statusLabel = getExtraStatusLabel(extra);
	const CountIcon = getCountIcon(extra);
	const StatusIcon = statusLabel === "Failed" ? CircleAlertIcon : ClockIcon;

	return (
		<button
			className="group/extra flex w-full flex-col gap-2 rounded-2xl p-2 text-left outline-none hover:bg-popover focus-visible:ring-2 focus-visible:ring-ring"
			onClick={onOpen}
			type="button"
		>
			<span className="relative block transition-transform duration-150 ease-out group-hover/extra:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover/extra:translate-y-0">
				<ExtraCover extra={extra} />
				{statusLabel ? (
					<span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-background/70 px-2 text-center text-[13px] text-foreground">
						<StatusIcon aria-hidden="true" className="size-5" />
						{statusLabel}
					</span>
				) : (
					fileCount > 0 && (
						<Badge
							aria-hidden="true"
							className="absolute right-2 bottom-2"
							size="tag"
							variant="artwork"
						>
							<CountIcon aria-hidden="true" />
							{fileCount}
						</Badge>
					)
				)}
			</span>
			<span className="flex min-w-0 flex-col gap-1 px-1">
				<span className="truncate text-sm font-semibold" title={extra.title}>
					{extra.title}
				</span>
				<span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
					<Badge size="sm" variant="outline">
						{EXTRA_CATEGORY[extra.category]}
					</Badge>
					<span className="tabular-nums">{formatFileCount(fileCount)}</span>
				</span>
			</span>
		</button>
	);
}
