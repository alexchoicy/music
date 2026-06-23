import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FileUpIcon, RefreshCwIcon } from "lucide-react";
import { useId, useState } from "react";
import type { DropzoneOptions } from "react-dropzone";

import { Badge } from "#/components/coss/badge";
import { Button } from "#/components/coss/button";
import {
	Card,
	CardFrame,
	CardFrameAction,
	CardFrameDescription,
	CardFrameHeader,
	CardFrameTitle,
	CardPanel,
} from "#/components/coss/card";
import { Label } from "#/components/coss/label";
import { Progress } from "#/components/coss/progress";
import { Skeleton } from "#/components/coss/skeleton";
import { Switch } from "#/components/coss/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/coss/table";
import { Tabs, TabsList, TabsPanel, TabsTab } from "#/components/coss/tabs";
import { DropBox } from "#/components/dropBox";
import { LibraryEmptyState } from "#/components/LibraryEmptyState";
import { completeUpload, startUpload } from "#/lib/api/uploads";
import { uploadQueries } from "#/lib/queries/upload.queries";
import { uploadMultipartFile } from "#/lib/upload/multipartUpload";
import { hashBlake3Simple, hashFileStream } from "#/lib/utils/hash";

type HashMode = "album" | "concert";
type UploadJob = {
	error?: string;
	fileName: string;
	progress: number;
	status: "hashing" | "uploading" | "completing" | "completed" | "failed";
};

export const Route = createFileRoute("/_authed/uploads/")({
	component: RouteComponent,
});

function RouteComponent() {
	const switchId = useId();
	const queryClient = useQueryClient();
	const [hashMode, setHashMode] = useState<HashMode>("album");
	const [jobs, setJobs] = useState<Record<string, UploadJob>>({});
	const pendingUploadsQuery = uploadQueries.getPendingOriginalFiles();
	const {
		data: pendingFiles = [],
		isError,
		isPending,
		refetch,
	} = useQuery(pendingUploadsQuery);

	const isBusy = Object.values(jobs).some(
		(job) => job.status === "hashing" || job.status === "uploading",
	);

	const onDrop: DropzoneOptions["onDrop"] = (acceptedFiles) => {
		void uploadDroppedFiles(acceptedFiles);
	};

	async function uploadDroppedFiles(files: File[]) {
		const pendingByHash = new Map(
			pendingFiles.map((file) => [file.blake3Hash, file]),
		);

		for (const file of files) {
			const jobId = crypto.randomUUID();
			setJobs((current) => ({
				...current,
				[jobId]: { fileName: file.name, progress: 0, status: "hashing" },
			}));

			try {
				const { blake3Hash } =
					hashMode === "album"
						? await hashFileStream(file)
						: await hashBlake3Simple(file);
				const pendingFile = pendingByHash.get(blake3Hash);

				if (!pendingFile)
					throw new Error("No pending upload matches this file");

				const started = await startUpload(pendingFile.fileObjectId);
				const totalParts = started.multipartUpload.parts.length;
				let uploadedParts = 0;

				setJobs((current) => ({
					...current,
					[jobId]: { ...current[jobId], status: "uploading" },
				}));

				const parts = await uploadMultipartFile(file, started.multipartUpload, {
					onPartUploaded: () => {
						uploadedParts += 1;
						setJobs((current) => ({
							...current,
							[jobId]: {
								...current[jobId],
								progress: totalParts ? uploadedParts / totalParts : 1,
							},
						}));
					},
				});

				setJobs((current) => ({
					...current,
					[jobId]: { ...current[jobId], progress: 1, status: "completing" },
				}));

				void completeUpload({
					fileObjectId: started.fileObject.fileObjectId,
					multipart: { parts, uploadId: started.multipartUpload.uploadId },
				})
					.then(() => {
						setJobs((current) => ({
							...current,
							[jobId]: { ...current[jobId], status: "completed" },
						}));
						void queryClient.invalidateQueries({
							queryKey: pendingUploadsQuery.queryKey,
						});
					})
					.catch((error) => {
						setJobs((current) => ({
							...current,
							[jobId]: {
								...current[jobId],
								error:
									error instanceof Error
										? error.message
										: "Complete upload failed",
								status: "failed",
							},
						}));
					});
			} catch (error) {
				setJobs((current) => ({
					...current,
					[jobId]: {
						...current[jobId],
						error: error instanceof Error ? error.message : "Upload failed",
						status: "failed",
					},
				}));
			}
		}
	}

	return (
		<main className="flex min-h-full w-full flex-col gap-6 p-4 sm:p-6">
			<header className="flex flex-col gap-2">
				<p className="text-sm font-medium text-muted-foreground">Uploads</p>
				<h1 className="font-heading text-3xl font-semibold tracking-tight">
					Resume uploads
				</h1>
			</header>

			<div className="flex max-w-5xl flex-col gap-4">
				<DropBox
					accept={{ "audio/*": [], "video/*": [] }}
					activeHint="Drop files."
					errorHint="Unsupported file type."
					hint="Drop matching pending files here."
					isProcessing={isBusy}
					onDrop={onDrop}
					title="DropBox"
				/>

				<Card>
					<CardPanel className="flex items-center justify-between gap-4 p-4">
						<Label htmlFor={switchId}>Album</Label>
						<Switch
							checked={hashMode === "concert"}
							id={switchId}
							onCheckedChange={(checked) => {
								setHashMode(checked ? "concert" : "album");
							}}
						/>
						<Label htmlFor={switchId}>Concert</Label>
					</CardPanel>
				</Card>

				<CardFrame>
					<CardFrameHeader>
						<CardFrameTitle>Pending</CardFrameTitle>
						<CardFrameDescription>Original files only.</CardFrameDescription>
						<CardFrameAction>
							<Button
								disabled={isPending}
								size="sm"
								variant="ghost"
								onClick={() => void refetch()}
							>
								<RefreshCwIcon aria-hidden="true" />
								Refresh
							</Button>
						</CardFrameAction>
					</CardFrameHeader>

					<Tabs defaultValue="pending">
						<div className="px-6 pb-3">
							<TabsList>
								<TabsTab value="pending">
									Pending
									<Badge variant="secondary">{pendingFiles.length}</Badge>
								</TabsTab>
							</TabsList>
						</div>

						<TabsPanel value="pending">
							{isPending ? (
								<PendingSkeleton />
							) : isError ? (
								<LibraryEmptyState
									description="Try refreshing the list."
									icon={<FileUpIcon aria-hidden="true" />}
									title="Unable to load pending uploads"
								/>
							) : pendingFiles.length ? (
								<Table variant="card">
									<TableHeader>
										<TableRow>
											<TableHead>File</TableHead>
											<TableHead>Hash</TableHead>
											<TableHead>Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{pendingFiles.map((file) => (
											<TableRow key={file.fileObjectId}>
												<TableCell className="max-w-80 truncate font-medium">
													{file.fileName}
												</TableCell>
												<TableCell className="max-w-72 truncate font-mono text-xs text-muted-foreground">
													{file.blake3Hash}
												</TableCell>
												<TableCell>
													<Badge variant="warning">Pending</Badge>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							) : (
								<LibraryEmptyState
									description="Pending original files will appear here."
									icon={<FileUpIcon aria-hidden="true" />}
									title="Nothing pending"
								/>
							)}
						</TabsPanel>
					</Tabs>
				</CardFrame>

				{Object.entries(jobs).length ? (
					<Card className="overflow-hidden">
						<CardPanel className="flex flex-col gap-3 p-4">
							<h2 className="text-sm font-semibold">Background jobs</h2>
							{Object.entries(jobs).map(([id, job]) => (
								<div className="flex flex-col gap-2" key={id}>
									<div className="flex items-center justify-between gap-3 text-sm">
										<span className="truncate font-medium">{job.fileName}</span>
										<Badge variant={job.status === "failed" ? "error" : "info"}>
											{job.status}
										</Badge>
									</div>
									<Progress value={job.progress * 100} />
									{job.error ? (
										<p className="text-xs text-destructive">{job.error}</p>
									) : null}
								</div>
							))}
						</CardPanel>
					</Card>
				) : null}
			</div>
		</main>
	);
}

function PendingSkeleton() {
	return (
		<div className="flex flex-col gap-2 px-6 pb-6">
			{Array.from({ length: 4 }, (_, index) => (
				<Skeleton className="h-12 rounded-xl" key={index} />
			))}
		</div>
	);
}
