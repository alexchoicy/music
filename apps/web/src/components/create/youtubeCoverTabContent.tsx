import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	CheckCircle2Icon,
	CropIcon,
	DownloadIcon,
	ImageIcon,
	RotateCcwIcon,
	SearchIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { FormEvent } from "react";

import { Alert, AlertDescription, AlertTitle } from "#/components/coss/alert";
import { Badge } from "#/components/coss/badge";
import { Button } from "#/components/coss/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardPanel,
	CardTitle,
} from "#/components/coss/card";
import { Checkbox } from "#/components/coss/checkbox";
import { Field, FieldDescription, FieldLabel } from "#/components/coss/field";
import { Input } from "#/components/coss/input";
import { Label } from "#/components/coss/label";
import { Spinner } from "#/components/coss/spinner";
import { toastManager } from "#/components/coss/toast";
import { CroppedImagePreview } from "#/components/croppedImagePreview";
import { ImageCropDialog } from "#/components/imageCropDialog";
import { PartyCombobox } from "#/components/PartyCombobox";
import type { components } from "#/data/APIschema";
import { createYouTubeCover, retryYouTubeImportJob } from "#/lib/api/youtube";
import { youtubeQueries } from "#/lib/queries/youtube.queries";
import { formatDate } from "#/lib/utils/date";
import { formatMsToMMSSOrHMMSS } from "#/lib/utils/music";
import type { CroppedArea } from "#/store/albumUploadStoreType";

type CreateYouTubeCoverResult =
	components["schemas"]["CreateYouTubeCoverResult"];
type YouTubePartySuggestion = components["schemas"]["YouTubePartySuggestion"];

type ImageSize = { width: number; height: number };

const COVER_ASPECT_RATIO = 1;

// "【歌ってみた】Again / YUI covered by 幸祜" -> "Again"
// "《盲婚啞嫁》陳奕迅 Eason Chan [Official MV]" -> "盲婚啞嫁"
function guessCoverTitle(videoTitle: string) {
	const quotedTitle = videoTitle
		.match(/《([^》]+)》|『([^』]+)』/)
		?.slice(1)
		.find(Boolean)
		?.trim();
	if (quotedTitle) return quotedTitle;

	const withoutTags = videoTitle
		.replace(/【[^】]*】|\[[^\]]*\]|「|」/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	const [firstSegment] = withoutTags.split(/\s+[/／|｜]\s+/);
	const withoutCredit = firstSegment
		.replace(/\s*[(（]?\s*(covered by|cover by|cover)\b.*$/i, "")
		.trim();

	return withoutCredit || withoutTags || videoTitle;
}

function pickSuggestedPartyIds(suggestions: YouTubePartySuggestion[]) {
	const linked = suggestions.filter(
		(suggestion) => suggestion.matchedBy === "ChannelLink",
	);
	const picked =
		linked.length > 0 ? linked : suggestions.length === 1 ? suggestions : [];

	return picked.map((suggestion) => Number(suggestion.partyId));
}

function centeredSquareCrop({ width, height }: ImageSize): CroppedArea {
	const size = Math.min(width, height);

	return {
		height: size,
		width: size,
		x: Math.round((width - size) / 2),
		y: Math.round((height - size) / 2),
	};
}

function useImageSize(src: string | null | undefined) {
	const [size, setSize] = useState<ImageSize | null>(null);

	useEffect(() => {
		setSize(null);
		if (!src) return;

		const image = new Image();
		image.onload = () =>
			setSize({ width: image.naturalWidth, height: image.naturalHeight });
		image.src = src;

		return () => {
			image.onload = null;
		};
	}, [src]);

	return size;
}

export function YouTubeCoverTabContent() {
	const urlId = useId();
	const titleId = useId();
	const linkChannelId = useId();

	const [urlInput, setUrlInput] = useState("");
	const [submittedUrl, setSubmittedUrl] = useState("");
	const [title, setTitle] = useState("");
	const [partyIds, setPartyIds] = useState<number[]>([]);
	const [shouldLinkChannel, setShouldLinkChannel] = useState(true);
	const [croppedArea, setCroppedArea] = useState<CroppedArea>();
	const [isCropOpen, setIsCropOpen] = useState(false);
	const [result, setResult] = useState<CreateYouTubeCoverResult>();

	const infoQuery = useQuery(youtubeQueries.getVideoInfo(submittedUrl));
	const info = infoQuery.data;
	const thumbnailUrl = info?.thumbnailUrl ?? null;
	const thumbnailSize = useImageSize(thumbnailUrl);
	const effectiveCrop =
		croppedArea ??
		(thumbnailSize ? centeredSquareCrop(thumbnailSize) : undefined);

	const jobQuery = useQuery(youtubeQueries.getImportJob(result?.jobId));
	const jobStatus = jobQuery.data?.status;

	useEffect(() => {
		if (!info) return;

		setTitle(guessCoverTitle(info.title));
		setPartyIds(pickSuggestedPartyIds(info.suggestedParties ?? []));
		setShouldLinkChannel(true);
		setCroppedArea(undefined);
	}, [info]);

	const suggestions = info?.suggestedParties ?? [];
	const linkedPartyIds = suggestions
		.filter((suggestion) => suggestion.matchedBy === "ChannelLink")
		.map((suggestion) => Number(suggestion.partyId));
	const nameMatches = suggestions.filter(
		(suggestion) => suggestion.matchedBy === "Name",
	);
	// Only a single credited party can own the channel, collabs are ambiguous
	const linkCandidateId =
		info && (info.channelId || info.channelHandle) && partyIds.length === 1
			? partyIds[0]
			: undefined;
	const canLinkChannel =
		linkCandidateId !== undefined && !linkedPartyIds.includes(linkCandidateId);

	const createMutation = useMutation({
		mutationFn: createYouTubeCover,
		onSuccess: (data) => {
			setResult(data);
			toastManager.add({ title: "Cover import started", type: "success" });
		},
		onError: (error) => {
			toastManager.add({
				title: "Unable to import cover",
				description: error.message,
				type: "error",
			});
		},
	});

	const retryMutation = useMutation({
		mutationFn: retryYouTubeImportJob,
		onSuccess: () => jobQuery.refetch(),
		onError: (error) => {
			toastManager.add({
				title: "Retry failed",
				description: error.message,
				type: "error",
			});
		},
	});

	function handleFetch(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const url = urlInput.trim();
		if (!url) return;

		if (url === submittedUrl) {
			void infoQuery.refetch();
			return;
		}

		setResult(undefined);
		setSubmittedUrl(url);
	}

	function handleSubmit() {
		if (!info) return;

		createMutation.mutate({
			url: info.webpageUrl,
			title: title.trim(),
			partyIds,
			thumbnailUrl,
			croppedArea: thumbnailUrl ? effectiveCrop : null,
			linkChannelToPartyId:
				canLinkChannel && shouldLinkChannel ? linkCandidateId : null,
		});
	}

	function handleReset() {
		setUrlInput("");
		setSubmittedUrl("");
		setTitle("");
		setPartyIds([]);
		setShouldLinkChannel(true);
		setCroppedArea(undefined);
		setResult(undefined);
		createMutation.reset();
	}

	const isLocked = Boolean(result) || createMutation.isPending;
	const isSubmitDisabled =
		!info || !title.trim() || partyIds.length === 0 || isLocked;

	return (
		<section className="flex flex-col gap-5">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="space-y-1">
					<h1 className="text-xl font-semibold tracking-tight">Cover</h1>
					<p className="text-sm text-muted-foreground">
						Import a cover from YouTube. The server downloads the highest
						quality audio and stores it as a single.
					</p>
				</div>
				<Button
					disabled={isSubmitDisabled}
					loading={createMutation.isPending}
					onClick={handleSubmit}
				>
					<DownloadIcon aria-hidden="true" />
					{result ? "Submitted" : "Import cover"}
				</Button>
			</div>

			<form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleFetch}>
				<label className="sr-only" htmlFor={urlId}>
					YouTube URL
				</label>
				<Input
					className="flex-1"
					disabled={isLocked}
					id={urlId}
					onChange={(event) => setUrlInput(event.target.value)}
					placeholder="https://www.youtube.com/watch?v=..."
					value={urlInput}
				/>
				<Button
					disabled={!urlInput.trim() || isLocked}
					loading={infoQuery.isFetching}
					type="submit"
					variant="outline"
				>
					<SearchIcon aria-hidden="true" />
					Fetch info
				</Button>
			</form>

			{infoQuery.isError && (
				<Alert variant="error">
					<TriangleAlertIcon aria-hidden="true" />
					<AlertTitle>Could not load the video</AlertTitle>
					<AlertDescription>{infoQuery.error.message}</AlertDescription>
				</Alert>
			)}

			{result && (
				<ImportStatus
					albumId={result.albumId}
					errorMessage={jobQuery.data?.errorMessage}
					isRetrying={retryMutation.isPending}
					onReset={handleReset}
					onRetry={() => retryMutation.mutate(result.jobId)}
					status={jobStatus}
				/>
			)}

			{info && (
				<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
					<Card className="overflow-hidden">
						<CardHeader className="border-b p-4 sm:p-5">
							<CardTitle>Video</CardTitle>
							<CardDescription>
								Source information from YouTube.
							</CardDescription>
						</CardHeader>
						<CardPanel className="grid gap-4 p-4 sm:p-5">
							{thumbnailUrl && (
								<img
									alt={info.title}
									className="aspect-video w-full rounded-xl border bg-muted object-cover"
									src={thumbnailUrl}
								/>
							)}
							<div className="space-y-1">
								<a
									className="font-medium break-words hover:underline"
									href={info.webpageUrl}
									rel="noreferrer"
									target="_blank"
								>
									{info.title}
								</a>
								<p className="text-sm text-muted-foreground">
									{[
										info.channel,
										formatMsToMMSSOrHMMSS(Number(info.durationInMs ?? 0)),
										formatDate(info.uploadDate),
									]
										.filter(Boolean)
										.join(" · ")}
								</p>
							</div>
						</CardPanel>
					</Card>

					<Card className="overflow-hidden">
						<CardHeader className="border-b p-4 sm:p-5">
							<div className="flex items-center justify-between gap-2">
								<CardTitle>Cover details</CardTitle>
								<Badge variant="info">Cover</Badge>
							</div>
							<CardDescription>
								Saved as a single with the track marked as a cover.
							</CardDescription>
						</CardHeader>
						<CardPanel className="grid gap-5 p-4 sm:p-5">
							<Field name="cover-image">
								<FieldLabel>Cover image</FieldLabel>
								<div className="flex items-center gap-4">
									<CroppedImagePreview
										alt="Cover preview"
										className="size-28 shrink-0"
										croppedArea={effectiveCrop}
										fallback={
											<ImageIcon aria-hidden="true" className="size-7" />
										}
										height={thumbnailSize?.height ?? 0}
										src={
											thumbnailSize ? (thumbnailUrl ?? undefined) : undefined
										}
										width={thumbnailSize?.width ?? 0}
									/>
									<div className="grid gap-1.5">
										<div>
											<Button
												disabled={!thumbnailSize || isLocked}
												onClick={() => setIsCropOpen(true)}
												variant="outline"
											>
												<CropIcon aria-hidden="true" />
												Edit crop
											</Button>
										</div>
										<FieldDescription>
											Uses the video thumbnail, cropped to a square.
										</FieldDescription>
									</div>
								</div>
							</Field>

							<Field name="cover-title">
								<FieldLabel htmlFor={titleId}>Title</FieldLabel>
								<Input
									disabled={isLocked}
									id={titleId}
									onChange={(event) => setTitle(event.target.value)}
									value={title}
								/>
								<FieldDescription>
									Used for the track, the single and the file name.
								</FieldDescription>
							</Field>

							<Field name="cover-parties">
								<FieldLabel>Credits</FieldLabel>
								<PartyCombobox
									allowCreate
									ariaLabel="Cover credits"
									disabled={isLocked}
									placeholder="Search or create the cover artist..."
									selectedIds={partyIds}
									setSelectedIds={setPartyIds}
								/>
								<FieldDescription>
									{linkedPartyIds.length > 0
										? `Filled in from the party linked to ${info.channel}.`
										: nameMatches.length === 1
											? `Filled in by matching the channel name ${info.channel}, check it is right.`
											: nameMatches.length > 1
												? `Several parties match ${info.channel}: ${nameMatches.map((match) => match.name).join(", ")}.`
												: "Who performed this cover."}
								</FieldDescription>
							</Field>

							{canLinkChannel && (
								<div className="flex items-start gap-2">
									<Checkbox
										checked={shouldLinkChannel}
										disabled={isLocked}
										id={linkChannelId}
										onCheckedChange={setShouldLinkChannel}
									/>
									<Label
										className="flex flex-col items-start gap-0.5"
										htmlFor={linkChannelId}
									>
										<span>Link {info.channel} to this party</span>
										<span className="text-xs font-normal text-muted-foreground">
											Its next covers fill in the credit automatically.
										</span>
									</Label>
								</div>
							)}
						</CardPanel>
					</Card>
				</div>
			)}

			<ImageCropDialog
				aspectRatio={COVER_ASPECT_RATIO}
				description="Choose the square area of the thumbnail used as the cover."
				imageAlt="YouTube thumbnail"
				imageSrc={thumbnailUrl}
				initialCroppedArea={effectiveCrop}
				onConfirm={(area) => {
					setCroppedArea(area);
					setIsCropOpen(false);
				}}
				onOpenChange={setIsCropOpen}
				open={isCropOpen}
				title="Crop cover"
			/>
		</section>
	);
}

type ImportStatusProps = {
	albumId: number | string;
	errorMessage?: null | string;
	isRetrying: boolean;
	onReset: () => void;
	onRetry: () => void;
	status?: components["schemas"]["WorkerJobStatus"];
};

function ImportStatus({
	albumId,
	errorMessage,
	isRetrying,
	onReset,
	onRetry,
	status,
}: ImportStatusProps) {
	if (status === "Failed") {
		return (
			<Alert variant="error">
				<TriangleAlertIcon aria-hidden="true" />
				<AlertTitle>Import failed</AlertTitle>
				<AlertDescription>
					<div className="flex flex-wrap items-center gap-3">
						<span>
							{errorMessage || "The download could not be completed."}
						</span>
						<Button
							loading={isRetrying}
							onClick={onRetry}
							size="sm"
							variant="outline"
						>
							<RotateCcwIcon aria-hidden="true" />
							Retry
						</Button>
					</div>
				</AlertDescription>
			</Alert>
		);
	}

	if (status === "Completed") {
		return (
			<Alert variant="success">
				<CheckCircle2Icon aria-hidden="true" />
				<AlertTitle>Cover imported</AlertTitle>
				<AlertDescription>
					<div className="flex flex-wrap items-center gap-3">
						<span>Audio is being processed and will be playable shortly.</span>
						<Button
							render={
								<Link params={{ id: String(albumId) }} to="/albums/$id" />
							}
							size="sm"
							variant="outline"
						>
							Open single
						</Button>
						<Button onClick={onReset} size="sm" variant="ghost">
							Import another
						</Button>
					</div>
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<Alert variant="info">
			<Spinner aria-hidden="true" />
			<AlertTitle>Downloading from YouTube...</AlertTitle>
			<AlertDescription>
				Fetching the highest quality audio and thumbnail on the server.
			</AlertDescription>
		</Alert>
	);
}
