import { useMusicUploadState } from "@/contexts/uploadMusicContext";
import { UploadAlbumDetail } from "./uploadAlbumDetail";
import { UploadAlbumTrackList } from "./uploadAlbumTrackList";

type UploadAlbumCardProps = {
	albumId: string;
	openAlbumEdit: (albumId: string) => void;
	// openTrackEdit: (trackId: string) => void;
};

export function UploadAlbumCard({
	albumId,
	openAlbumEdit,
}: UploadAlbumCardProps) {
	const state = useMusicUploadState();
	const album = state.albums[albumId];
	return (
		<div className="bg-card rounded-lg border">
			<div className="p-4 border-b w-full">
				<UploadAlbumDetail albumId={albumId} openAlbumEdit={openAlbumEdit} />
			</div>
			<div>
				<UploadAlbumTrackList
					discIds={album.OrderedAlbumDiscsIds}
					// openTrackEdit={openTrackEdit}
				/>
			</div>
		</div>
	);
}
