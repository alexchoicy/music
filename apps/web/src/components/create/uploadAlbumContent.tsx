import { useMutation } from "@tanstack/react-query";
import pMap from "p-map";
import {
	type Dispatch,
	type SetStateAction,
	useCallback,
	useEffect,
	useState,
} from "react";
import { CreateAlbumEditDialog } from "@/components/create/dialog/createAlbumEditDialog";
import { CreateTrackEditDialog } from "@/components/create/dialog/createTrackEditDialog";
import { MusicDropBox } from "@/components/create/musicDropBox";
import { UploadAlbumCard } from "@/components/create/uploadAlbumCard";
import {
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

type UploadAlbumContentProps = {
	isProcessing: boolean;
	setIsProcessing: Dispatch<SetStateAction<boolean>>;
	onUploadReady: (uploadAction: (() => Promise<void>) | null) => void;
};

export function UploadAlbumContent({
	isProcessing,
	setIsProcessing,
	onUploadReady,
}: UploadAlbumContentProps) {
	const [editingAlbumDialogAlbumId, setEditingAlbumDialogAlbumId] =
		useState<LocalID | null>(null);

	const [editingTrackDialogTrackId, setEditingTrackDialogTrackId] =
		useState<LocalID | null>(null);

	const state = useMusicUploadState();
	const dispatch = useMusicUploadDispatch();

	const { mutateAsync: createAlbum } = useMutation(albumMutations.create());

	const { mutateAsync: completeMultipartUpload } = useMutation(
		uploadMutations.complete(),
	);

	const onUpload = useCallback(async () => {
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
				if (!album.createAlbumUploadResults) {
					console.error("createAlbumUploadResults is undefined");
					continue;
				}

				const uploadResults = album.createAlbumUploadResults;

				if (uploadResults.albumImage) {
					const imageUploadResponse = await fetch(
						uploadResults.albumImage.uploadUrl,
						{
							method: "PUT",
							body: albumCoverMap[uploadResults.albumImage.blake3Id],
						},
					);

					if (!imageUploadResponse.ok) {
						throw new Error(
							`cover upload failed for ${uploadResults.albumImage.blake3Id}`,
						);
					}
				}

				const trackUploads = uploadResults.tracks || [];

				const trackUploadResults = await pMap(
					trackUploads,
					async (
						trackUpload: components["schemas"]["CreateAlbumTrackUploadItemResult"],
					) => {
						const trackFile = state.trackVariants[trackUpload.blake3Id];
						if (!trackFile) {
							throw new Error(`missing track file ${trackUpload.blake3Id}`);
						}

						const parts = await multipartFileRequest(
							trackFile.file,
							trackUpload.multipartUploadInfo,
						);

						return {
							blake3Id: trackUpload.blake3Id,
							uploadId: trackUpload.multipartUploadInfo.uploadId,
							parts,
						};
					},
					{ concurrency: 4 },
				);

				completedResults.push(...trackUploadResults);
			}

			await completeMultipartUpload(completedResults);
		} finally {
			setIsProcessing(false);
			dispatch({ type: "Reset" });
		}
	}, [completeMultipartUpload, createAlbum, dispatch, setIsProcessing, state]);

	useEffect(() => {
		onUploadReady(onUpload);

		return () => {
			onUploadReady(null);
		};
	}, [onUpload, onUploadReady]);

	return (
		<>
			<div className="space-y-6 p-6">
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
		</>
	);
}
