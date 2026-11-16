import { Disc3Icon, PencilIcon, TriangleAlertIcon } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { Badge } from "#/components/base/badge";
import { Button } from "#/components/base/button";
import { Checkbox } from "#/components/base/checkbox";
import { CroppedImagePreview } from "#/components/image/CroppedImagePreview";
import { formatDate } from "#/lib/utils/date";
import { formatMsToMMSSOrHMMSS } from "#/lib/utils/music";
import { cn } from "#/lib/utils/styles";
import { useAlbumUploadStore } from "#/store/albumUploadStore";
import type {
	AlbumLocalId,
	DiscLocalId,
	TrackLocalId,
} from "#/store/albumUploadStoreType";

import { DraftCredits } from "./DraftCredits";

type SelectionProps = {
	selected: ReadonlySet<TrackLocalId>;
	onSelect: (trackIds: TrackLocalId[], isSelected: boolean) => void;
};

function GroupCheckbox({
	label,
	trackIds,
	selected,
	onSelect,
}: SelectionProps & { label: string; trackIds: TrackLocalId[] }) {
	const selectedCount = trackIds.filter((id) => selected.has(id)).length;

	return (
		<Checkbox
			aria-label={label}
			checked={selectedCount > 0 && selectedCount === trackIds.length}
			indeterminate={selectedCount > 0 && selectedCount < trackIds.length}
			onCheckedChange={(checked) => onSelect(trackIds, checked)}
		/>
	);
}

function TrackDraftRow({
	trackId,
	issue,
	isSelected,
	onSelect,
	onEdit,
}: {
	trackId: TrackLocalId;
	issue: string | undefined;
	isSelected: boolean;
	onSelect: SelectionProps["onSelect"];
	onEdit: (trackId: TrackLocalId) => void;
}) {
	const track = useAlbumUploadStore((state) => state.tracksById[trackId]);

	return (
		<div
			className={cn(
				"grid grid-cols-[auto_2rem_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-accent/60",
				isSelected && "bg-accent/60",
			)}
		>
			<Checkbox
				aria-label={`Select ${track.title}`}
				checked={isSelected}
				onCheckedChange={(checked) => onSelect([trackId], checked)}
			/>
			<span className="text-center text-sm text-muted-foreground tabular-nums">
				{track.trackNumber || "–"}
			</span>
			<div className="flex min-w-0 flex-col gap-0.5">
				<div className="flex min-w-0 flex-wrap items-center gap-1.5">
					<span className="min-w-0 truncate text-sm font-medium">
						{track.title}
					</span>
					{track.contentType && track.contentType !== "Music" && (
						<Badge size="sm" variant="secondary">
							{track.contentType === "MC" ? "Talk" : track.contentType}
						</Badge>
					)}
					{track.versionType && track.versionType !== "Original" && (
						<Badge size="sm" variant="secondary">
							{track.versionType}
						</Badge>
					)}
					{issue && (
						<Badge size="sm" variant="error">
							<TriangleAlertIcon aria-hidden="true" />
							{issue}
						</Badge>
					)}
				</div>
				<div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
					<DraftCredits
						credits={track.credits}
						hasVariousArtists={false}
						unsolvedCredits={track.unsolvedCredits}
					/>
				</div>
			</div>
			<span className="text-xs text-muted-foreground tabular-nums">
				{formatMsToMMSSOrHMMSS(Number(track.durationInMs))}
			</span>
			<Button
				aria-label={`Edit ${track.title}`}
				onClick={() => onEdit(trackId)}
				size="icon-sm"
				variant="ghost"
			>
				<PencilIcon aria-hidden="true" />
			</Button>
		</div>
	);
}

function DiscDraft({
	discId,
	showHeader,
	issues,
	selected,
	onSelect,
	onEditTrack,
}: SelectionProps & {
	discId: DiscLocalId;
	showHeader: boolean;
	issues: Record<TrackLocalId, string>;
	onEditTrack: (trackId: TrackLocalId) => void;
}) {
	const disc = useAlbumUploadStore((state) => state.discsById[discId]);

	return (
		<div className="flex flex-col gap-1">
			{showHeader && (
				<div className="flex items-center gap-3 px-2 py-1 text-sm text-muted-foreground">
					<GroupCheckbox
						label={`Select disc ${disc.discNumber}`}
						onSelect={onSelect}
						selected={selected}
						trackIds={disc.trackIds}
					/>
					<span className="min-w-0 truncate font-medium">
						Disc {disc.discNumber}
						{disc.subtitle ? ` · ${disc.subtitle}` : ""}
					</span>
				</div>
			)}
			{disc.trackIds.map((trackId) => (
				<TrackDraftRow
					isSelected={selected.has(trackId)}
					issue={issues[trackId]}
					key={trackId}
					onEdit={onEditTrack}
					onSelect={onSelect}
					trackId={trackId}
				/>
			))}
		</div>
	);
}

export function AlbumDraftSection({
	albumId,
	canMerge,
	issues,
	selected,
	onSelect,
	onEdit,
	onMerge,
	onEditTrack,
}: SelectionProps & {
	albumId: AlbumLocalId;
	canMerge: boolean;
	issues: Record<TrackLocalId, string>;
	onEdit: (albumId: AlbumLocalId) => void;
	onMerge: (albumId: AlbumLocalId) => void;
	onEditTrack: (trackId: TrackLocalId) => void;
}) {
	const album = useAlbumUploadStore((state) => state.albumsById[albumId]);
	const cover = useAlbumUploadStore((state) =>
		album.coverAssetIdByHash
			? state.coverAssetsIdByHash[album.coverAssetIdByHash]
			: undefined,
	);
	const trackIds = useAlbumUploadStore(
		useShallow((state) =>
			album.discIds.flatMap((discId) => state.discsById[discId].trackIds),
		),
	);
	const hasDiscSubtitle = useAlbumUploadStore((state) =>
		album.discIds.some((discId) => state.discsById[discId].subtitle),
	);
	const removeAlbumDraft = useAlbumUploadStore(
		(state) => state.removeAlbumDraft,
	);
	const discCount = album.discIds.length;
	const metadata = [
		discCount > 1 ? `${discCount} discs` : null,
		`${trackIds.length} track${trackIds.length === 1 ? "" : "s"}`,
		album.releaseDate ? formatDate(album.releaseDate) : null,
	].filter(Boolean);

	return (
		<section className="flex flex-col gap-4">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-center">
				<div className="flex min-w-0 flex-1 items-center gap-4">
					<CroppedImagePreview
						alt={`${album.title} cover`}
						className="size-24 shrink-0"
						croppedArea={cover?.croppedArea}
						fallback={<Disc3Icon aria-hidden="true" className="size-8" />}
						height={cover?.height ?? 0}
						src={cover?.localURL}
						width={cover?.width ?? 0}
					/>
					<div className="flex min-w-0 flex-col gap-1">
						<div className="flex min-w-0 flex-wrap items-center gap-2">
							<h2 className="min-w-0 text-xl font-semibold tracking-tight wrap-break-word">
								{album.title}
							</h2>
							{album.type !== "Album" && (
								<Badge variant="secondary">{album.type}</Badge>
							)}
						</div>
						<div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
							<DraftCredits
								credits={album.credits}
								hasVariousArtists={album.hasVariousArtists}
								unsolvedCredits={album.unsolvedCredits}
							/>
						</div>
						<p className="text-xs text-muted-foreground tabular-nums">
							{metadata.join(" · ")}
						</p>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Button onClick={() => onEdit(albumId)} size="sm" variant="outline">
						<PencilIcon aria-hidden="true" />
						Edit album
					</Button>
					{canMerge && (
						<Button onClick={() => onMerge(albumId)} size="sm" variant="ghost">
							Merge
						</Button>
					)}
					<Button
						onClick={() => removeAlbumDraft(albumId)}
						size="sm"
						variant="ghost"
					>
						Remove
					</Button>
				</div>
			</header>

			<div className="-mx-2 flex flex-col gap-3">
				{discCount === 1 && !hasDiscSubtitle && (
					<div className="flex items-center gap-3 px-2 text-sm text-muted-foreground">
						<GroupCheckbox
							label={`Select all tracks of ${album.title}`}
							onSelect={onSelect}
							selected={selected}
							trackIds={trackIds}
						/>
						<span className="font-medium">Tracks</span>
					</div>
				)}
				{album.discIds.map((discId) => (
					<DiscDraft
						discId={discId}
						issues={issues}
						key={discId}
						onEditTrack={onEditTrack}
						onSelect={onSelect}
						selected={selected}
						showHeader={discCount > 1 || hasDiscSubtitle}
					/>
				))}
			</div>
		</section>
	);
}
