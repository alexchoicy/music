import { PencilIcon } from "lucide-react";

import { Badge } from "#/components/coss/badge";
import { Button } from "#/components/coss/button";
import { formatMsToMMSSOrHMMSS } from "#/lib/utils/music";
import { useAlbumUploadStore } from "#/store/albumUploadStore";
import type { TrackDraft, TrackLocalId } from "#/store/albumUploadStoreType";

import { DraftCreditSummary } from "./DraftCreditSummary";

type TrackDraftContentProps = {
	trackId: TrackLocalId;
	onOpenTrackDraftDialog: (trackId: TrackLocalId) => void;
};

function getContentTypeLabel(contentType: TrackDraft["contentType"]) {
	return contentType === "MC" ? "Talk" : contentType;
}

export function TrackDraftContent({
	trackId,
	onOpenTrackDraftDialog,
}: TrackDraftContentProps) {
	const track = useAlbumUploadStore((state) => state.tracksById[trackId]);

	return (
		<div
			className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-4 py-4 sm:grid-cols-[3rem_1fr_auto_auto] sm:px-6"
			key={track.localId}
		>
			<span className="text-sm text-muted-foreground tabular-nums">
				{track.trackNumber || "-"}
			</span>
			<div className="min-w-0 space-y-1">
				<div className="flex min-w-0 flex-wrap items-center gap-1.5">
					<span className="min-w-0 truncate font-medium">{track.title}</span>
					{track.versionType && track.versionType !== "Original" && (
						<Badge size="sm" variant="secondary">
							{track.versionType}
						</Badge>
					)}
					{track.contentType && track.contentType !== "Music" && (
						<Badge size="sm" variant="info">
							{getContentTypeLabel(track.contentType)}
						</Badge>
					)}
				</div>
				<div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
					<DraftCreditSummary
						credits={track.credits}
						hasVariousArtists={track.hasVariousArtists}
						unsolvedCredits={track.unsolvedCredits}
					/>
				</div>
			</div>
			<span className="text-sm text-muted-foreground tabular-nums">
				{formatMsToMMSSOrHMMSS(Number(track.durationInMs))}
			</span>
			<Button
				aria-label="Edit track draft"
				onClick={() => {
					onOpenTrackDraftDialog(trackId);
				}}
				size="icon-sm"
				variant="ghost"
			>
				<PencilIcon aria-hidden="true" />
			</Button>
		</div>
	);
}
