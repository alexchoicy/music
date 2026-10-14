import { UploadIcon } from "lucide-react";
import { useDropzone } from "react-dropzone";
import type { Accept, DropzoneOptions } from "react-dropzone";

import { Spinner } from "#/components/base/spinner";
import { cn } from "#/lib/utils/styles";

type UploadDropZoneProps = {
	accept: Accept;
	title: string;
	description: string;
	rejectDescription: string;
	isProcessing?: boolean;
	onDrop: DropzoneOptions["onDrop"];
};

export function UploadDropZone({
	accept,
	title,
	description,
	rejectDescription,
	isProcessing = false,
	onDrop,
}: UploadDropZoneProps) {
	const { getInputProps, getRootProps, isDragAccept, isDragReject } =
		useDropzone({ accept, disabled: isProcessing, onDrop });

	return (
		<div
			{...getRootProps({
				"aria-label": title,
				"aria-busy": isProcessing,
			})}
			className={cn(
				"flex min-h-40 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl p-6 text-center shadow-[inset_0_0_0_2px_var(--color-input)] transition-[box-shadow,background-color] duration-150 outline-none hover:bg-card hover:shadow-[inset_0_0_0_2px_--theme(--color-primary/60%)] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
				isDragAccept &&
					"bg-primary/8 shadow-[inset_0_0_0_2px_var(--color-primary)] hover:bg-primary/8 hover:shadow-[inset_0_0_0_2px_var(--color-primary)]",
				isDragReject &&
					"bg-destructive/8 shadow-[inset_0_0_0_2px_var(--color-destructive)] hover:bg-destructive/8 hover:shadow-[inset_0_0_0_2px_var(--color-destructive)]",
				isProcessing && "cursor-progress opacity-64",
			)}
		>
			<input {...getInputProps()} />
			{isProcessing ? (
				<Spinner className="size-6" />
			) : (
				<UploadIcon aria-hidden="true" className="size-6" />
			)}
			<span className="text-base font-semibold">{title}</span>
			<span
				className={cn(
					"text-[13px] text-muted-foreground",
					isDragReject && "text-destructive-foreground",
				)}
			>
				{isDragReject ? rejectDescription : description}
			</span>
		</div>
	);
}
