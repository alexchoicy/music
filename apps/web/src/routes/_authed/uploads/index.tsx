import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	CheckCircle,
	Disc3,
	Loader2,
	Mic2,
	RefreshCw,
	XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "#/components/coss/badge";
import { Button } from "#/components/coss/button";
import { Switch } from "#/components/coss/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/coss/table";
import {
	Tooltip,
	TooltipPopup,
	TooltipTrigger,
} from "#/components/coss/tooltip";
import { DropBox } from "#/components/dropBox";
import type { components } from "#/data/APIschema";
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

	const pendingFileItems =
		useMemo((): (components["schemas"]["PendingOriginalFileResult"] & {
			uploadStatus?: string;
		})[] => {
			const statusPriority = (
				item: components["schemas"]["PendingOriginalFileResult"] & {
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

	const runUpload = async (
		item: components["schemas"]["PendingOriginalFileResult"],
	) => {
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
		<main className="flex min-h-full w-full flex-col gap-6 p-4 sm:p-6">
			<header className="flex flex-col gap-4">
				<div className="flex flex-col gap-2">
					<p className="text-sm font-medium text-muted-foreground">
						Resume Upload
					</p>
					<h1 className="font-heading text-3xl font-semibold tracking-tight">
						Drop file that upload was failed, it will auto upload file.
					</h1>
				</div>
			</header>
			<div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-col gap-0.5">
					<span className="text-sm font-medium">Hashing profile</span>
					<span className="text-xs text-muted-foreground">
						Choose the file type
					</span>
				</div>
				<div className="flex items-center gap-3">
					<ModeLabel active={mode === "album"} icon={Disc3} label="Album" />
					<Switch
						checked={mode === "concert"}
						onCheckedChange={(v) => setMode(v ? "concert" : "album")}
						aria-label="Toggle hashing profile between album and concert"
					/>
					<ModeLabel active={mode === "concert"} icon={Mic2} label="Concert" />
				</div>
			</div>

			<DropBox
				accept={{ "audio/*": [], "video/*": [] }}
				activeHint="Drop files."
				errorHint="Unsupported file type."
				hint="Drop matching pending files here."
				isProcessing={loading}
				onDrop={onDrop}
				title="DropBox"
			/>
			<section className="flex flex-col gap-3">
				<div className="flex items-center justify-between">
					<h2 className="text-sm font-semibold">
						Files
						{pendingFileItems.length > 0 ? (
							<span className="ml-2 text-xs font-normal text-muted-foreground">
								{pendingFileItems.length} total
							</span>
						) : null}
					</h2>
					<Button
						variant="outline"
						size="sm"
						onClick={() => refetch()}
						disabled={isFetching}
						loading={isFetching}
						className="gap-2"
					>
						<RefreshCw />
						Refresh
					</Button>
				</div>
				<div className="overflow-hidden rounded-xl border border-border">
					<Table className="table-fixed">
						<TableHeader>
							<TableRow className="bg-muted/50 hover:bg-muted/50">
								<TableHead className="w-auto">Original file name</TableHead>
								<TableHead className="hidden w-48 sm:table-cell">
									BLAKE3 hash
								</TableHead>
								<TableHead className="w-24">Status</TableHead>
								<TableHead className="w-10 text-right" aria-label="Actions" />
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
													render={<span className="block truncate" />}
												>
													{item.blake3Hash}
												</TooltipTrigger>
												<TooltipPopup className="max-w-72">
													<span className="block truncate">
														{item.blake3Hash}
													</span>
												</TooltipPopup>
											</Tooltip>
										</TableCell>
										<TableCell>
											<UploadStatusBadge status={status} />
										</TableCell>
										<TableCell className="w-10 text-right" aria-label="Actions">
											{status === "Failed" && (
												<Button
													variant="ghost"
													size="icon-xs"
													onClick={() => runUpload(item)}
													disabled={loading}
													aria-label={`Retry upload for ${item.fileName}`}
												>
													<RefreshCw />
												</Button>
											)}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>
			</section>
		</main>
	);
}

function UploadStatusBadge({ status }: { status: string }) {
	if (status === "Completed" || status === "Uploaded") {
		return (
			<Badge variant="success">
				<CheckCircle />
				{status}
			</Badge>
		);
	}

	if (status === "Failed") {
		return (
			<Badge variant="error">
				<XCircle />
				{status}
			</Badge>
		);
	}

	if (status === "Uploading") {
		return (
			<Badge variant="warning">
				<Loader2 className="animate-spin" />
				{status}
			</Badge>
		);
	}

	return <Badge variant="secondary">{status}</Badge>;
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
			<Icon className="size-4" aria-hidden="true" />
			{label}
		</span>
	);
}
