import { Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { twMerge } from "tailwind-merge";
import { Button } from "../../shadcn/button";

type FileDropBoxProps = {
	isProcessing: boolean;
	onDrop: (files: File[]) => void;
};

export function FileDropBox({ isProcessing, onDrop }: FileDropBoxProps) {
	const {
		getRootProps,
		getInputProps,
		isDragActive,
		isDragAccept,
		isDragReject,
	} = useDropzone({
		onDrop: (files) => onDrop(files),
		disabled: isProcessing,
		multiple: true,
		accept: {
			"video/*": [".mp4", ".mkv", ".mov", ".webm"],
			"audio/*": [".flac"],
		},
	});

	const dropHint = isDragReject
		? "Some files are not supported"
		: isDragAccept
			? "Release to upload"
			: "Drag and drop or browse to upload concert assets";

	return (
		<div className="rounded-xl border bg-sidebar/40 p-4 shadow-sm lg:min-h-[16rem]">
			<div
				{...getRootProps()}
				className={twMerge(
					"from-background to-muted/30 hover:border-primary/40 hover:bg-muted/40 flex min-h-[14rem] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-gradient-to-b p-8 text-center transition-all duration-200",
					!isProcessing && isDragActive && !isDragAccept && "bg-muted/50",
					!isProcessing && isDragAccept && "border-primary bg-primary/5",
					!isProcessing &&
						isDragActive &&
						isDragReject &&
						"border-red-500 bg-red-600/30",
					isProcessing && "pointer-events-none cursor-not-allowed opacity-50",
				)}
			>
				<div className="bg-primary/10 mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-current/10">
					<Upload className="text-primary h-7 w-7" />
				</div>
				<h3 className="mb-2 text-lg font-semibold">Choose concert files</h3>
				<p className="text-muted-foreground mb-5 max-w-sm text-sm">
					{dropHint}
				</p>
				<input {...getInputProps()} />
				<Button disabled={isProcessing}>Browse Files</Button>
			</div>
		</div>
	);
}
