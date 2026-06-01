"use client";

import { Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import type { Accept, DropzoneOptions } from "react-dropzone";

import { Button } from "#/components/coss/button";
import { cn } from "#/lib/utils/styles";

interface AudioDropBoxProps {
	accept: Accept;
	activeHint: string;
	errorHint: string;
	hint: string;
	isProcessing?: boolean;
	onDrop: DropzoneOptions["onDrop"];
	title: string;
}

export function AudioDropBox({
	accept,
	activeHint,
	errorHint,
	hint,
	isProcessing = false,
	onDrop,
	title,
}: AudioDropBoxProps) {
	const {
		getInputProps,
		getRootProps,
		isDragAccept,
		isDragActive,
		isDragReject,
	} = useDropzone({
		accept,
		disabled: isProcessing,
		onDrop,
	});

	const dropHint = isDragReject ? errorHint : isDragActive ? activeHint : hint;

	return (
		<div className="rounded-xl border bg-sidebar/40 p-4 shadow-sm lg:min-h-64">
			<div
				{...getRootProps()}
				className={cn(
					"flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-gradient-to-b from-background to-muted/30 p-8 text-center transition-all duration-200 hover:border-primary/40 hover:bg-muted/40",
					!isProcessing && isDragActive && !isDragAccept && "bg-muted/50",
					!isProcessing && isDragAccept && "border-primary bg-primary/5",
					!isProcessing &&
						isDragActive &&
						isDragReject &&
						"border-destructive bg-destructive/10",
					isProcessing && "pointer-events-none cursor-not-allowed opacity-50",
				)}
			>
				<div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-current/10 bg-primary/10">
					<Upload aria-hidden="true" className="size-7 text-primary" />
				</div>
				<h3 className="mb-2 text-lg font-semibold">{title}</h3>
				<p
					className={cn(
						"mb-5 max-w-sm text-sm text-muted-foreground",
						isDragReject && "text-destructive",
					)}
				>
					{dropHint}
				</p>
				<input {...getInputProps()} />
				<Button disabled={isProcessing}>Browse Files</Button>
			</div>
		</div>
	);
}
