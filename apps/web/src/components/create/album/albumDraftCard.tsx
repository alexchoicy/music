import { Disc3Icon, PencilIcon, Trash2Icon } from "lucide-react";

import { Badge } from "#/components/coss/badge";
import { Button } from "#/components/coss/button";
import { Card } from "#/components/coss/card";
import { CroppedImagePreview } from "#/components/croppedImagePreview";
import { useAlbumUploadStore } from "#/store/albumUploadStore";
import type { AlbumLocalId } from "#/store/albumUploadStoreType";

import { DiscDraftContent } from "./discDraftContent";
import { DraftCreditSummary } from "./DraftCreditSummary";

type AlbumDraftCardProps = {
	albumID: AlbumLocalId;
	onOpenAlbumDraftDialog: (albumID: AlbumLocalId) => void;
};

export function AlbumDraftCard({
	albumID,
	onOpenAlbumDraftDialog,
}: AlbumDraftCardProps) {
	const album = useAlbumUploadStore((state) => {
		return Object.hasOwn(state.albumsById, albumID)
			? state.albumsById[albumID]
			: undefined;
	});
	const albumCover = useAlbumUploadStore((state) => {
		if (!Object.hasOwn(state.albumsById, albumID)) return undefined;

		const coverAssetIdByHash = state.albumsById[albumID].coverAssetIdByHash;

		if (!coverAssetIdByHash) return undefined;

		return Object.hasOwn(state.coverAssetsIdByHash, coverAssetIdByHash)
			? state.coverAssetsIdByHash[coverAssetIdByHash]
			: undefined;
	});
	const discCount = useAlbumUploadStore((state) =>
		Object.hasOwn(state.albumsById, albumID)
			? state.albumsById[albumID].discIds.length
			: 0,
	);
	const trackCount = useAlbumUploadStore((state) => {
		if (!Object.hasOwn(state.albumsById, albumID)) return 0;

		return state.albumsById[albumID].discIds.reduce((count, discId) => {
			return Object.hasOwn(state.discsById, discId)
				? count + state.discsById[discId].trackIds.length
				: count;
		}, 0);
	});

	if (!album) return;

	return (
		<Card className="overflow-hidden bg-linear-to-br from-card via-card to-muted/30">
			<header className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
				<div className="flex min-w-0 gap-4">
					<CroppedImagePreview
						alt={`${album.title} cover`}
						className="size-24 shrink-0"
						croppedArea={
							albumCover?.croppedArea ?? { x: 0, y: 0, width: 1, height: 1 }
						}
						fallback={<Disc3Icon aria-hidden="true" className="size-8" />}
						height={albumCover?.height ?? 1}
						src={albumCover?.localURL}
						width={albumCover?.width ?? 1}
					/>
					<div className="min-w-0 space-y-2 pt-1">
						<div className="flex flex-wrap items-center gap-2">
							<h2 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
								{album.title}
							</h2>
							<Badge className="tracking-widest" variant="warning">
								{album.type}
							</Badge>
						</div>
						<p className="text-sm text-muted-foreground">
							{discCount} disc{discCount === 1 ? "" : "s"}· {trackCount} track
							{trackCount === 1 ? "" : "s"}
						</p>
						<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
							<DraftCreditSummary
								credits={album.credits}
								hasVariousArtists={album.hasVariousArtists}
								unsolvedCredits={album.unsolvedCredits}
							/>
						</div>
					</div>
				</div>
				<Button
					onClick={() => {
						onOpenAlbumDraftDialog(albumID);
					}}
					size="sm"
					variant="secondary"
				>
					<PencilIcon aria-hidden="true" />
					Edit draft
				</Button>
			</header>
			<div className="border-t">
				{album.discIds.map((discId) => {
					return <DiscDraftContent discId={discId} key={discId} />;
				})}
			</div>
			<footer className="flex flex-wrap justify-end gap-2 p-4 sm:p-6">
				<Button disabled variant="secondary">
					<Disc3Icon aria-hidden="true" />
					Merge album
				</Button>
				<Button variant="destructive-outline">
					<Trash2Icon aria-hidden="true" />
					Remove draft
				</Button>
			</footer>
		</Card>
	);
}
