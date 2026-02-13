import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import pMap from "p-map";
import { useState } from "react";
import { CreateAlbumEditDialog } from "@/components/create/dialog/createAlbumEditDialog";
import { CreateTrackEditDialog } from "@/components/create/dialog/createTrackEditDialog";
import { MusicDropBox } from "@/components/create/musicDropBox";
import { UploadAlbumCard } from "@/components/create/uploadAlbumCard";
import { Button } from "@/components/shadcn/button";
import { AppLayout } from "@/components/ui/appLayout";
import {
	MusicUploadProvider,
	useMusicUploadDispatch,
	useMusicUploadState,
} from "@/contexts/uploadMusicContext";
import type { components } from "@/data/APIschema";
import { albumMutations } from "@/lib/queries/album.queries";
import { uploadMutations } from "@/lib/queries/upload.queries";
import {
	buildMusicUploadRequest,
	multipartFileRequest,
} from "@/lib/utils/upload";
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
	const dispatch = useMusicUploadDispatch();

	const { mutateAsync: createAlbum } = useMutation(albumMutations.create);

	const { mutateAsync: completeMultipartUpload } = useMutation(
		uploadMutations.complete,
	);

	const onUpload = async () => {
		setIsProcessing(true);
		const requestJson = buildMusicUploadRequest(state);

		const albumCoverMap = Object.fromEntries(
			Object.entries(state.albumCovers).map(([_, file]) => [
				file.file.fileBlake3,
				file.localFile,
			]),
		);

		const completedResults: components["schemas"]["CompleteMultipartUploadRequest"][] =
			[];

		try {
			const result = await createAlbum(requestJson);

			for (const album of result.data) {
				if (album.createAlbumUploadResults === undefined) {
					console.error("createAlbumUploadResults is undefined");
					continue;
				}

				// upload album cover
				if (album.createAlbumUploadResults?.albumImage) {
					fetch(album.createAlbumUploadResults.albumImage.uploadUrl, {
						method: "PUT",
						body: albumCoverMap[
							album.createAlbumUploadResults.albumImage.blake3Id
						],
					});
				}

				const controller = new AbortController();
				const trackUploads = album.createAlbumUploadResults?.tracks || [];

				await pMap(
					trackUploads,
					async (
						trackUpload: components["schemas"]["CreateAlbumTrackUploadItemResult"],
					) => {
						try {
							const trackFile = state.trackVariants[trackUpload.blake3Id];
							if (!trackFile) {
								console.error("missing track file", trackUpload.blake3Id);
								return;
							}
							const result = await multipartFileRequest(
								trackFile.file,
								trackUpload.multipartUploadInfo,
								controller.signal,
								({ partNumber }) => console.log("done part", partNumber),
							);

							completedResults.push({
								blake3Id: trackUpload.blake3Id,
								uploadId: trackUpload.multipartUploadInfo.uploadId,
								parts: result,
							});
						} catch (e) {
							console.error("track upload failed", trackUpload.blake3Id, e);
						}
					},
					{ concurrency: 4 },
				);
			}

			await completeMultipartUpload(completedResults);
		} finally {
			setIsProcessing(false);
			dispatch({ type: "Reset" });
		}
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
