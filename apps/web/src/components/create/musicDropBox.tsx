import { useQuery } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { parseBlob } from "music-metadata";
import { useDropzone } from "react-dropzone";
import { twMerge } from "tailwind-merge";
import { partyQueries } from "@/lib/queries/party.queries";
import { hashFileStream } from "@/lib/utils/hash";
import { resolveParty } from "@/lib/utils/party";
import { getImageFileRequestFromMetadata } from "@/lib/utils/upload";
import type { CreateAlbum } from "@/models/uploadMusic";
import { Button } from "../shadcn/button";

type MusicDropBoxProps = {
	isProcessing: boolean;
	setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>;

	uploadFile: Map<string, File>;
	setUploadFile: React.Dispatch<React.SetStateAction<Map<string, File>>>;
};

export function MusicDropBox({
	isProcessing,
	setIsProcessing,
	uploadFile,
	setUploadFile,
}: MusicDropBoxProps) {
	const { data: parties } = useQuery(partyQueries.getPartySearchList(""));

	const onDrop = async (acceptedFiles: File[]) => {
		setIsProcessing(true);

		const musicFiles = new Map<string, CreateAlbum>();
		// Bale3, File
		const internalFileMap = new Map<string, File>();

		for (const file of acceptedFiles) {
			const { blake3Hash, sha1Hash } = await hashFileStream(file);

			if (internalFileMap.has(blake3Hash) || uploadFile.has(blake3Hash)) {
				console.warn(`File ${file.name} is already added, skipping.`);
				continue;
			}

			const metadata = await parseBlob(file);
			console.log(metadata);
			const normalizedAlbumTitle = metadata.common.album
				? metadata.common.album.normalize("NFKC").toUpperCase().trim()
				: "UNKNOWN ALBUM";

			const albumParty = resolveParty(
				metadata.common.albumartist,
				parties || [],
			);

			const musicFileHash = `${normalizedAlbumTitle}_${albumParty.albumParty.join(",")}`;

			let createAlbumObject: CreateAlbum;

			if (!musicFiles.has(musicFileHash)) {
				createAlbumObject = {
					title: metadata.common.album || "Unknown Album",
					albumCredits: albumParty.albumParty,
					unsolvedAlbumCredits: albumParty.unsolved,
					type: "Album",
					albumImage:
						metadata.common.picture && metadata.common.picture.length > 0
							? await getImageFileRequestFromMetadata(
									metadata.common.picture[0],
								)
							: undefined,
					albumTracks: [],
					trackMap: new Map(),
				};
				musicFiles.set(musicFileHash, createAlbumObject);
			} else {
				createAlbumObject = musicFiles.get(musicFileHash)!;
			}
		}

		setIsProcessing(false);
	};

	const {
		getRootProps,
		getInputProps,
		isDragActive,
		isDragAccept,
		isDragReject,
	} = useDropzone({
		accept: { "audio/*": [] },
		onDrop,
		disabled: isProcessing,
	});

	return (
		<div className="bg-sidebar rounded-lg border p-6">
			<div
				{...getRootProps()}
				className={twMerge(
					"hover:bg-card/70 cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-all duration-200",
					!isProcessing && isDragActive && !isDragAccept && "bg-card/70",
					!isProcessing &&
						isDragActive &&
						isDragReject &&
						"border-red-500 bg-red-600/30",
					isProcessing && "pointer-events-none cursor-not-allowed opacity-50",
				)}
			>
				<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-800">
					<Upload className="h-8 w-8 text-gray-400" />
				</div>
				<h3 className="mb-2 text-xl font-semibold">Choose music files</h3>
				<p className="mb-6 text-gray-400">
					Drag and drop or browse to upload (Not support Folder)
				</p>
				<input {...getInputProps()} />
				<Button disabled={isProcessing}>Browse Files</Button>
			</div>
		</div>
	);
}
