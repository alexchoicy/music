import { useQuery } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { twMerge } from "tailwind-merge";
import { useMusicUploadDispatch } from "@/contexts/uploadMusicContext";
import { partyQueries } from "@/lib/queries/party.queries";
import { Button } from "../shadcn/button";

type MusicDropBoxProps = {
	isProcessing: boolean;
	setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>;
};

export function MusicDropBox({
	isProcessing,
	setIsProcessing,
}: MusicDropBoxProps) {
	const { data: parties } = useQuery(partyQueries.getPartySearchList(""));

	const dispatch = useMusicUploadDispatch();

	const onDrop = async (acceptedFiles: File[]) => {
		setIsProcessing(true);

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
