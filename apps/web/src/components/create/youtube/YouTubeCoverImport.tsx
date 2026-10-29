import type * as API from "@music/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	CropIcon,
	DownloadIcon,
	ImageIcon,
	SearchIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useId, useState } from "react";

import { LanguageSelect } from "#/components/album/edit/LanguageSelect";
import { Alert, AlertDescription, AlertTitle } from "#/components/base/alert";
import { Button } from "#/components/base/button";
import { Checkbox } from "#/components/base/checkbox";
import { Field, FieldDescription, FieldLabel } from "#/components/base/field";
import { Input } from "#/components/base/input";
import { Label } from "#/components/base/label";
import { toastManager } from "#/components/base/toast";
import { createYouTubeCover, retryYouTubeImportJob } from "#/lib/api/youtube";
import { youtubeQueries } from "#/lib/queries/youtube.queries";
import { formatDate } from "#/lib/utils/date";
import { formatMsToMMSSOrHMMSS } from "#/lib/utils/music";
import { CroppedImagePreview } from "#/old-components/croppedImagePreview";
import { ImageCropDialog } from "#/old-components/imageCropDialog";
import { PartyCombobox } from "#/old-components/PartyCombobox";
import type { CroppedArea } from "#/store/albumUploadStoreType";

import {
	centeredSquareCrop,
	guessCoverTitle,
	pickSuggestedPartyIds,
	useImageSize,
} from "./youtubeCover";
import { YouTubeImportStatus } from "./YouTubeImportStatus";

const COVER_ASPECT_RATIO = 1;

export function YouTubeCoverImport() {
	const urlId = useId();
	const titleId = useId();
	const linkChannelId = useId();

	const [urlInput, setUrlInput] = useState("");
	const [submittedUrl, setSubmittedUrl] = useState("");
	const [title, setTitle] = useState("");
	const [partyIds, setPartyIds] = useState<number[]>([]);
	const [languageId, setLanguageId] = useState<number | null>(null);
	const [shouldLinkChannel, setShouldLinkChannel] = useState(true);
	const [croppedArea, setCroppedArea] = useState<CroppedArea>();
	const [isCropOpen, setIsCropOpen] = useState(false);
	const [result, setResult] = useState<API.CreateYouTubeCoverResult>();

	const infoQuery = useQuery(youtubeQueries.getVideoInfo(submittedUrl));
	const info = infoQuery.data;
	const thumbnailUrl = info?.thumbnailUrl ?? null;
	const thumbnailSize = useImageSize(thumbnailUrl);
	const effectiveCrop =
		croppedArea ??
		(thumbnailSize ? centeredSquareCrop(thumbnailSize) : undefined);

	const jobQuery = useQuery(youtubeQueries.getImportJob(result?.jobId));

	useEffect(() => {
		if (!info) return;

		setTitle(guessCoverTitle(info.title));
		setPartyIds(pickSuggestedPartyIds(info.suggestedParties ?? []));
		setLanguageId(null);
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

	function handleFetch() {
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
			languageId,
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
		setLanguageId(null);
		setShouldLinkChannel(true);
		setCroppedArea(undefined);
		setResult(undefined);
		createMutation.reset();
	}

	const isLocked = Boolean(result) || createMutation.isPending;
	const isSubmitDisabled =
		!info || !title.trim() || partyIds.length === 0 || isLocked;

	return (
		<section className="flex flex-col gap-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex flex-col gap-1">
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

			<form
				className="flex flex-col gap-2 sm:flex-row"
				onSubmit={(event) => {
					event.preventDefault();
					handleFetch();
				}}
			>
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
				<YouTubeImportStatus
					albumId={result.albumId}
					errorMessage={jobQuery.data?.errorMessage}
					isRetrying={retryMutation.isPending}
					onReset={handleReset}
					onRetry={() => retryMutation.mutate(result.jobId)}
					status={jobQuery.data?.status}
				/>
			)}

			{info && (
				<div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
					<section className="flex min-w-0 flex-col gap-4">
						<h2 className="text-xl font-semibold tracking-tight">Video</h2>
						{thumbnailUrl ? (
							<img
								alt=""
								className="aspect-video w-full rounded-xl bg-muted object-cover shadow-card"
								src={thumbnailUrl}
							/>
						) : (
							<div className="flex aspect-video w-full items-center justify-center rounded-xl bg-muted text-muted-foreground shadow-card">
								<ImageIcon aria-hidden="true" className="size-8" />
							</div>
						)}
						<div className="flex flex-col gap-1">
							<a
								className="font-semibold wrap-anywhere hover:underline"
								href={info.webpageUrl}
								rel="noreferrer"
								target="_blank"
							>
								{info.title}
							</a>
							<p className="text-sm text-muted-foreground tabular-nums">
								{[
									info.channel,
									formatMsToMMSSOrHMMSS(Number(info.durationInMs ?? 0)),
									formatDate(info.uploadDate),
								]
									.filter(Boolean)
									.join(" · ")}
							</p>
						</div>
					</section>

					<section className="flex min-w-0 flex-col gap-5">
						<div className="flex flex-col gap-1">
							<h2 className="text-xl font-semibold tracking-tight">
								Cover details
							</h2>
							<p className="text-sm text-muted-foreground">
								Saved as a single with the track marked as a cover.
							</p>
						</div>

						<Field>
							<FieldLabel nativeLabel={false} render={<div />}>
								Cover image
							</FieldLabel>
							<div className="flex items-center gap-4">
								<CroppedImagePreview
									alt="Cover preview"
									className="size-28 shrink-0"
									croppedArea={effectiveCrop}
									fallback={<ImageIcon aria-hidden="true" className="size-7" />}
									height={thumbnailSize?.height ?? 0}
									src={thumbnailSize ? (thumbnailUrl ?? undefined) : undefined}
									width={thumbnailSize?.width ?? 0}
								/>
								<div className="flex flex-col items-start gap-2">
									<Button
										disabled={!thumbnailSize || isLocked}
										onClick={() => setIsCropOpen(true)}
										variant="outline"
									>
										<CropIcon aria-hidden="true" />
										Edit crop
									</Button>
									<FieldDescription>
										Uses the video thumbnail, cropped to a square.
									</FieldDescription>
								</div>
							</div>
						</Field>

						<Field>
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

						<LanguageSelect
							disabled={isLocked}
							onValueChange={setLanguageId}
							value={languageId}
						/>

						<Field>
							<FieldLabel nativeLabel={false} render={<div />}>
								Credits
							</FieldLabel>
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
								<div className="flex flex-col gap-0.5">
									<Label htmlFor={linkChannelId}>
										Link {info.channel} to this party
									</Label>
									<span className="text-xs text-muted-foreground">
										Its next covers fill in the credit automatically.
									</span>
								</div>
							</div>
						)}
					</section>
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
