import type * as API from "@music/api";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	CheckIcon,
	Disc3Icon,
	InfoIcon,
	Mic2Icon,
	RefreshCwIcon,
	UploadIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "#/components/base/badge";
import { Button } from "#/components/base/button";
import { Switch } from "#/components/base/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/base/table";
import {
	Tooltip,
	TooltipPopup,
	TooltipTrigger,
} from "#/components/base/tooltip";
import { UploadDropZone } from "#/components/upload/UploadDropZone";
import { startUpload } from "#/lib/api/uploads";
import { uploadQueries } from "#/lib/queries/upload.queries";
import { hashBlake3Simple, hashFileStream } from "#/lib/utils/hash";
import { cn } from "#/lib/utils/styles";
import { useUploadStore } from "#/store/uploadStore";

export const Route = createFileRoute("/_authed/uploads/")({
	component: RouteComponent,
});

type HashMode = "album" | "concert";

function RouteComponent() {
	const [mode, setMode] = useState<HashMode>("album");

	const [loading, setLoading] = useState(false);

	const {
		data: pendingFiles = [],
		isFetching,
		refetch,
	} = useQuery(uploadQueries.getPendingOriginalFiles());

	const fileByBlake3 = useUploadStore((state) => state.fileByBlake3);

	const uploadStoreAddFile = useUploadStore((state) => state.addFile);
	const uploadStoreStartUpload = useUploadStore((state) => state.startUpload);

	const pendingFileItems = useMemo((): (API.PendingOriginalFileResult & {
		uploadStatus?: string;
	})[] => {
		const statusPriority = (
			item: API.PendingOriginalFileResult & {
				uploadStatus?: string;
			},
		) => {
			if (item.uploadStatus === "Failed") return 0;
			if (item.uploadStatus === "Uploading") return 1;
			if (item.uploadStatus === "Queued") return 2;
			if (item.processingStatus === "Pending") return 3;
			return 4;
		};

		return pendingFiles
			.map((file) => ({
				...file,
				uploadStatus: fileByBlake3[file.blake3Hash]?.status,
			}))
			.sort((a, b) => statusPriority(a) - statusPriority(b));
	}, [pendingFiles, fileByBlake3]);

	const runUpload = async (item: API.PendingOriginalFileResult) => {
		const getStartUpload = await startUpload(item.fileObjectId);
		uploadStoreStartUpload([getStartUpload]);
	};

	const onDrop = async (acceptedFiles: File[]) => {
		setLoading(true);

		try {
			for (const file of acceptedFiles) {
				const { blake3Hash } =
					mode === "album"
						? await hashFileStream(file)
						: await hashBlake3Simple(file);

				if (!blake3Hash) continue;
				const existingItem = pendingFileItems.find(
					(item) =>
						item.blake3Hash === blake3Hash &&
						(item.processingStatus === "Pending" ||
							item.processingStatus === "Failed"),
				);

				if (!existingItem) continue;

				uploadStoreAddFile(file, blake3Hash);
				await runUpload(existingItem);
			}
		} catch (error) {
			console.error(error);
		}
		setLoading(false);
	};

	return (
		<main className="flex min-h-full w-full flex-col gap-6 px-4 py-6 sm:px-6 lg:px-12">
			<header className="flex flex-col gap-2">
				<p className="text-sm font-medium text-muted-foreground">
					Resume upload
				</p>
				<h1 className="max-w-190 text-3xl font-bold tracking-[-.025em] sm:text-[32px] sm:leading-10">
					Drop a file whose upload failed and it will upload again.
				</h1>
			</header>

			<div className="flex flex-wrap items-center justify-between gap-4 py-4">
				<div className="flex flex-col gap-0.5">
					<span className="text-sm font-medium">Hashing profile</span>
					<span className="text-xs text-muted-foreground">
						Choose the file type
					</span>
				</div>
				<div className="flex items-center gap-3">
					<ModeLabel active={mode === "album"} icon={Disc3Icon} label="Album" />
					<Switch
						aria-label="Toggle hashing profile between album and concert"
						checked={mode === "concert"}
						onCheckedChange={(checked) =>
							setMode(checked ? "concert" : "album")
						}
					/>
					<ModeLabel
						active={mode === "concert"}
						icon={Mic2Icon}
						label="Concert"
					/>
				</div>
			</div>

			<UploadDropZone
				accept={{ "audio/*": [], "video/*": [] }}
				description="Audio and video. A file that matches an unfinished upload starts uploading right away."
				isProcessing={loading}
				onDrop={onDrop}
				rejectDescription="Only audio and video files can be resumed."
				title="Drop matching pending files here"
			/>

			<section aria-labelledby="pending-files" className="flex flex-col gap-3">
				<div className="flex items-center gap-2">
					<h2 className="text-base font-semibold" id="pending-files">
						Files
					</h2>
					<span className="text-xs text-muted-foreground tabular-nums">
						{pendingFileItems.length} total
					</span>
					<span className="grow" />
					<Button
						disabled={isFetching}
						loading={isFetching}
						onClick={() => void refetch()}
						size="sm"
						variant="outline"
					>
						<RefreshCwIcon aria-hidden="true" />
						Refresh
					</Button>
				</div>

				{pendingFileItems.length === 0 ? (
					<p className="py-6 text-sm text-muted-foreground">
						No unfinished uploads.
					</p>
				) : (
					<Table className="table-fixed" variant="plain">
						<TableHeader>
							<TableRow>
								<TableHead>Original file name</TableHead>
								<TableHead className="hidden w-56 sm:table-cell">
									BLAKE3 hash
								</TableHead>
								<TableHead className="w-32">Status</TableHead>
								<TableHead className="w-12">
									<span className="sr-only">Actions</span>
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{pendingFileItems.map((item) => {
								const status = item.uploadStatus ?? item.processingStatus;

								return (
									<TableRow key={item.fileId}>
										<TableCell className="min-w-0">
											<Tooltip>
												<TooltipTrigger
													render={<span className="block truncate" />}
												>
													{item.fileName}
												</TooltipTrigger>
												<TooltipPopup className="max-w-72">
													{item.fileName}
												</TooltipPopup>
											</Tooltip>
										</TableCell>
										<TableCell className="hidden min-w-0 sm:table-cell">
											<Tooltip>
												<TooltipTrigger
													render={
														<span className="block truncate text-xs text-muted-foreground" />
													}
												>
													{item.blake3Hash}
												</TooltipTrigger>
												<TooltipPopup className="max-w-72 break-all">
													{item.blake3Hash}
												</TooltipPopup>
											</Tooltip>
										</TableCell>
										<TableCell>
											<UploadStatusBadge status={status} />
										</TableCell>
										<TableCell className="text-right">
											{status === "Failed" && (
												<Button
													aria-label={`Retry upload for ${item.fileName}`}
													disabled={loading}
													onClick={() => void runUpload(item)}
													size="icon-sm"
													variant="ghost"
												>
													<RefreshCwIcon aria-hidden="true" />
												</Button>
											)}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				)}
			</section>
		</main>
	);
}

function UploadStatusBadge({ status }: { status: string }) {
	if (status === "Completed" || status === "Uploaded") {
		return (
			<Badge size="tag" variant="outline">
				<CheckIcon aria-hidden="true" />
				{status}
			</Badge>
		);
	}

	if (status === "Failed") {
		return (
			<Badge size="tag" variant="error">
				<InfoIcon aria-hidden="true" />
				{status}
			</Badge>
		);
	}

	if (status === "Uploading") {
		return (
			<Badge size="tag" variant="secondary">
				<UploadIcon aria-hidden="true" />
				{status}
			</Badge>
		);
	}

	return (
		<Badge size="tag" variant="outline">
			{status}
		</Badge>
	);
}

function ModeLabel({
	active,
	icon: Icon,
	label,
}: {
	active: boolean;
	icon: LucideIcon;
	label: string;
}) {
	return (
		<span
			className={cn(
				"flex items-center gap-1.5 text-sm font-medium transition-colors",
				active ? "text-foreground" : "text-muted-foreground",
			)}
		>
			<Icon aria-hidden="true" className="size-4" />
			{label}
		</span>
	);
}
