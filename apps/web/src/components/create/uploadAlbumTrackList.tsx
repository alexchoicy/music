import { Clock } from "lucide-react";
import { useMusicUploadState } from "@/contexts/uploadMusicContext";
import { UploadAlbumTrackListItem } from "./uploadAlbumTrackListItem";

type UploadAlbumTrackListProps = {
	discIds: string[];
	openTrackEdit: (trackId: string) => void;
};

export function UploadAlbumTrackList({
	discIds,
	openTrackEdit,
}: UploadAlbumTrackListProps) {
	const state = useMusicUploadState();

	return (
		<div className="px-4 pb-4">
			<div className="flex items-center gap-2 pt-4">
				<div className="w-8 text-center">#</div>
				<div className="flex-1">Title</div>
				<Clock className="size-fit" />
				<div className="w-20" />
			</div>

			<div>
				{discIds.map((discId) => {
					const disc = state.discs[discId];

					return (
						<div key={discId}>
							<div className="flex items-center gap-2">
								<div className="h-px flex-1 bg-border" />
								<span className="text-muted-foreground px-3">
									Disc {disc.discNumber} {disc.subtitle && `- ${disc.subtitle}`}
								</span>
								<div className="h-px flex-1 bg-border" />
							</div>

							<div className="space-y-1">
								{disc.OrderedTrackIds.map((trackId) => (
									<UploadAlbumTrackListItem
										key={trackId}
										trackId={trackId}
										openEdit={openTrackEdit}
									/>
								))}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
