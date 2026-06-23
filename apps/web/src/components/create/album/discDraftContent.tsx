import { Disc3Icon } from "lucide-react";

import { CroppedImagePreview } from "#/components/croppedImagePreview";
import { useAlbumUploadStore } from "#/store/albumUploadStore";
import type { DiscLocalId, TrackLocalId } from "#/store/albumUploadStoreType";

import { TrackDraftContent } from "./trackDraftContent";

type DiscDraftContentProps = {
	discId: DiscLocalId;
	onOpenTrackDraftDialog: (trackId: TrackLocalId) => void;
};

export function DiscDraftContent({
	discId,
	onOpenTrackDraftDialog,
}: DiscDraftContentProps) {
	const disc = useAlbumUploadStore((state) => state.discsById[discId]);
	const cover = useAlbumUploadStore((state) => {
		const discDraft = state.discsById[discId];
		const album = state.albumsById[discDraft.albumId];
		const coverAssetIdByHash =
			discDraft.coverAssetIdByHash ?? album.coverAssetIdByHash;

		return coverAssetIdByHash
			? state.coverAssetsIdByHash[coverAssetIdByHash]
			: undefined;
	});

	const trackCount = disc.trackIds.length;

	return (
		<section key={disc.localId} className="border-b last:border-b-0">
			<div className="flex items-center justify-between gap-4 bg-muted/35 px-4 py-3 text-sm sm:px-6">
				<div className="flex min-w-0 items-center gap-3 font-semibold tracking-wide text-muted-foreground uppercase">
					<CroppedImagePreview
						alt={`Disc ${disc.discNumber} cover`}
						className="size-10 shrink-0"
						croppedArea={cover?.croppedArea}
						fallback={<Disc3Icon aria-hidden="true" className="size-4" />}
						height={cover?.height ?? 0}
						src={cover?.localURL}
						width={cover?.width ?? 0}
					/>
					<span className="truncate">
						Disc {disc.discNumber}
						{disc.subtitle ? ` - ${disc.subtitle}` : ""}
					</span>
				</div>
				<span className="shrink-0 text-muted-foreground">
					{trackCount} track{trackCount === 1 ? "" : "s"}
				</span>
			</div>

			<div className="divide-y">
				{disc.trackIds.map((trackId) => {
					return (
						<TrackDraftContent
							key={trackId}
							trackId={trackId}
							onOpenTrackDraftDialog={onOpenTrackDraftDialog}
						/>
					);
				})}
			</div>
		</section>
	);
}
