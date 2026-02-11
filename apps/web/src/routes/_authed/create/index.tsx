import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CreateAlbumEditDialog } from "@/components/create/dialog/createAlbumEditDialog";
import { CreateTrackEditDialog } from "@/components/create/dialog/createTrackEditDialog";
import { MusicDropBox } from "@/components/create/musicDropBox";
import { UploadAlbumCard } from "@/components/create/uploadAlbumCard";
import { Button } from "@/components/shadcn/button";
import { AppLayout } from "@/components/ui/appLayout";
import {
	MusicUploadProvider,
	useMusicUploadState,
} from "@/contexts/uploadMusicContext";
import type { LocalID } from "@/models/uploadMusic";

export const Route = createFileRoute("/_authed/create/")({
	component: RouteComponent,
});
function RouteComponent() {
	return (
		<MusicUploadProvider>
			<CreatePageContent />
		</MusicUploadProvider>
	);
}
function CreatePageContent() {
	const [isProcessing, setIsProcessing] = useState(false);

	const [editingAlbumDialogAlbumId, setEditingAlbumDialogAlbumId] =
		useState<LocalID | null>(null);

	const [editingTrackDialogTrackId, setEditingTrackDialogTrackId] =
		useState<LocalID | null>(null);

	const state = useMusicUploadState();
	const onUpload = () => {
		console.log("Uploading music with state:", state);
	};
	return (
		<AppLayout
			header={
				<Button disabled={isProcessing} onClick={onUpload}>
					Upload
				</Button>
			}
		>
			<div className="space-y-6">
				<MusicDropBox
					isProcessing={isProcessing}
					setIsProcessing={setIsProcessing}
				/>
				<div className="space-y-6">
					{Object.values(state.albums).map((album) => (
						<UploadAlbumCard
							albumId={album.id}
							key={album.id}
							openAlbumEdit={(id) => setEditingAlbumDialogAlbumId(id)}
							openTrackEdit={(id) => setEditingTrackDialogTrackId(id)}
						/>
					))}
				</div>
			</div>
			<CreateAlbumEditDialog
				albumId={editingAlbumDialogAlbumId}
				open={!!editingAlbumDialogAlbumId}
				onOpenChange={(open) => !open && setEditingAlbumDialogAlbumId(null)}
			/>
			<CreateTrackEditDialog
				trackId={editingTrackDialogTrackId}
				open={!!editingTrackDialogTrackId}
				onOpenChange={(open) => !open && setEditingTrackDialogTrackId(null)}
			/>
		</AppLayout>
	);
}
