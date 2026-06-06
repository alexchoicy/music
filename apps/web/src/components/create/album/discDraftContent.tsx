import { Disc3Icon } from "lucide-react";

import { useAlbumUploadStore } from "#/store/albumUploadStore";
import type { DiscLocalId } from "#/store/albumUploadStoreType";

import { TrackDraftContent } from "./trackDraftContent";

type DiscDraftContentProps = {
	discId: DiscLocalId;
};

export function DiscDraftContent({ discId }: DiscDraftContentProps) {
	const disc = useAlbumUploadStore((state) => state.discsById[discId]);

	const trackCount = disc.trackIds.length;

	return (
		<section key={disc.localId} className="border-b last:border-b-0">
			<div className="flex items-center justify-between gap-4 bg-muted/35 px-4 py-3 text-sm sm:px-6">
				<div className="flex min-w-0 items-center gap-2 font-semibold tracking-wide text-muted-foreground uppercase">
					<Disc3Icon aria-hidden="true" className="size-4 shrink-0" />
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
					return <TrackDraftContent TrackId={trackId} key={trackId} />;
				})}
			</div>
		</section>
	);
}
