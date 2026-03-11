import { Upload } from "lucide-react";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { twMerge } from "tailwind-merge";
import { Button } from "../../shadcn/button";

export function FileDropBox() {
	const [isProcessing] = useState(false);

	const onDrop = async (files: File[]) => {
		console.log("Dropped files:", files);
	};

	const {
		getRootProps,
		getInputProps,
		isDragActive,
		isDragAccept,
		isDragReject,
	} = useDropzone({
		onDrop,
		disabled: isProcessing,
		multiple: true,
		accept: {
			"video/*": [".mp4", ".mkv"],
		},
	});

	const dropHint = isDragReject
		? "Some files are not supported"
		: isDragAccept
			? "Release to upload"
			: "Drag and drop or browse to upload concert assets";

	return (
		<div className="bg-sidebar rounded-lg border p-6 row-span-2">
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
				<h3 className="mb-2 text-xl font-semibold">Choose concert files</h3>
				<p className="mb-2 text-gray-400">{dropHint}</p>
				<input {...getInputProps()} />
				<Button disabled={isProcessing}>Browse Files</Button>
			</div>
		</div>
	);
}
