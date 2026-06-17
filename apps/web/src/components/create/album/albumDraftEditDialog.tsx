import { useQuery } from "@tanstack/react-query";
import { AlertCircleIcon } from "lucide-react";
import { useId, useState } from "react";
import type { ChangeEvent } from "react";
import { useShallow } from "zustand/react/shallow";

import { Alert, AlertDescription, AlertTitle } from "#/components/coss/alert";
import { Button } from "#/components/coss/button";
import { Checkbox } from "#/components/coss/checkbox";
import {
	Dialog,
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "#/components/coss/dialog";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "#/components/coss/field";
import { Fieldset, FieldsetLegend } from "#/components/coss/fieldset";
import { Form } from "#/components/coss/form";
import { Input } from "#/components/coss/input";
import { Label } from "#/components/coss/label";
import { EnumFieldSelect } from "#/components/enumFieldSelect";
import { ImageCropDialog } from "#/components/imageCropDialog";
import { OptionSelectField } from "#/components/OptionSelectField";
import { PartyCombobox } from "#/components/PartyCombobox";
import { ALBUM_COVER_ASPECT_RATIO } from "#/constant/album";
import {
	ALBUM_TYPE_OPTIONS,
	replaceAudioSourceOptions,
} from "#/enums/albumEnums";
import { languageQueries } from "#/lib/queries/language.queries";
import {
	makeLanguageOptions,
	makeReplaceLanguageOptions,
} from "#/lib/utils/language";
import { createCoverAsset } from "#/lib/utils/upload";
import { useAlbumUploadStore } from "#/store/albumUploadStore";
import type {
	AlbumDraft,
	AlbumLocalId,
	CoverAsset,
	CreateAlbumRequest,
	CroppedArea,
	DiscDraft,
	DiscLocalId,
	LanguageItem,
	TrackAudioRequest,
} from "#/store/albumUploadStoreType";

import { ReleaseDateField } from "../../ReleaseDateField";
import { UnsolvedCreditsAlert } from "../../UnsolvedCreditsAlert";
import { CoverImageField } from "../CoverImageField";

type AlbumDraftEditDialogProps = {
	albumId: AlbumLocalId;
	onOpenChange: (open: boolean) => void;
};

type AlbumDraftEditDialogFormProps = {
	cover?: CoverAsset;
	album: AlbumDraft;
	discs: DiscDraft[];
	form: EditAlbumDraftFormValue;
	discCoversById: Partial<Record<DiscLocalId, CoverAsset>>;
	pendingDiscCoversById: Partial<Record<DiscLocalId, CoverAsset>>;
	updateForm: (nextValue: Partial<EditAlbumDraftFormValue>) => void;
	handleCoverImageChange: (
		event: React.ChangeEvent<HTMLInputElement>,
		target: CoverImageTarget,
	) => void;
	setDiscSubtitle: (discId: DiscLocalId, subtitle: string) => void;
};

type EditAlbumDraftFormValue = {
	albumArtistIds: number[];
	title: string;
	type: CreateAlbumRequest["type"];
	releaseDate: CreateAlbumRequest["releaseDate"];
	isUnsolvedAlbumCreditsCleared: boolean;
	useAlbumCoverForDiscs: boolean;
	languageId: LanguageItem["id"] | null;
	discSubtitlesById: Record<DiscLocalId, string>;
	replaceTrackArtists: number[];
	replaceTrackLanguageId: LanguageItem["id"] | null;
	replaceAudioSource: TrackAudioRequest["source"] | null;
	replaceAudioSourceUrl: NonNullable<TrackAudioRequest["sourceUrl"]>;
};

function initFormValue(
	album: AlbumDraft,
	discs: DiscDraft[],
): EditAlbumDraftFormValue {
	const discSubtitlesById: Record<DiscLocalId, string> = {};
	const useAlbumCoverForDiscs = discs.every(
		(disc) =>
			!disc.coverAssetIdByHash ||
			disc.coverAssetIdByHash === album.coverAssetIdByHash,
	);

	for (const disc of discs) {
		discSubtitlesById[disc.localId] = disc.subtitle ?? "";
	}

	return {
		discSubtitlesById,
		albumArtistIds: album.credits.map((credit) => Number(credit.partyId)),
		title: album.title,
		type: album.type,
		releaseDate: album.releaseDate ?? null,
		isUnsolvedAlbumCreditsCleared: false,
		useAlbumCoverForDiscs,
		languageId: album.languageId ?? null,
		replaceAudioSource: null,
		replaceAudioSourceUrl: "",
		replaceTrackLanguageId: null,
		replaceTrackArtists: [],
	};
}

type CoverImageTarget =
	| { type: "album" }
	| { type: "disc"; discId: DiscLocalId };

type CoverImageCandidate = {
	file: File;
	src: string;
	target: CoverImageTarget;
};

function AlbumDraftEditDialogForm({
	cover,
	form,
	album,
	discs,
	discCoversById,
	pendingDiscCoversById,
	updateForm,
	handleCoverImageChange,
	setDiscSubtitle,
}: AlbumDraftEditDialogFormProps) {
	const titleId = useId();
	const albumCoverInputId = useId();
	const languageId = useId();
	const discSubtitleId = useId();
	const discCoverInputId = useId();
	const useAlbumCoverForDiscsId = useId();
	const replaceTrackLanguageId = useId();
	const replaceAudioSourceId = useId();
	const replaceAudioSourceUrlId = useId();

	const { data: languages = [] } = useQuery(languageQueries.getLanguages());
	const languageOptions = makeLanguageOptions(languages);
	const replaceLanguageOptions = makeReplaceLanguageOptions(languages);
	const selectedLanguageOption =
		languageOptions.find((option) => option.id === form.languageId) ??
		languageOptions[0];

	const selectedReplacementTrackLanguageOption =
		replaceLanguageOptions.find(
			(option) => option.id === form.replaceTrackLanguageId,
		) ?? replaceLanguageOptions[0];

	const selectedReplacementAudioSourceOption =
		replaceAudioSourceOptions.find(
			(option) => option.value === form.replaceAudioSource,
		) ?? replaceAudioSourceOptions[0];

	return (
		<>
			<div className="grid gap-4 sm:grid-cols-2">
				<Field name="title" className="sm:col-span-2">
					<FieldLabel htmlFor={titleId}>Album title</FieldLabel>
					<Input
						id={titleId}
						name="title"
						required
						onChange={(event) => {
							updateForm({ title: event.target.value });
						}}
						value={form.title}
						type="text"
						autoComplete="off"
					/>
					<FieldError match="valueMissing">Album title is required.</FieldError>
				</Field>

				<CoverImageField
					className="sm:col-span-2"
					cover={cover}
					inputId={albumCoverInputId}
					label="Album cover"
					name="cover"
					onFileChange={(event) =>
						handleCoverImageChange(event, { type: "album" })
					}
				/>

				<Field className="sm:col-span-2" name="albumArtists">
					<FieldLabel>Album artists</FieldLabel>
					{album.unsolvedCredits.length > 0 && (
						<UnsolvedCreditsAlert
							isCleared={form.isUnsolvedAlbumCreditsCleared}
							onClear={(isCleared) => {
								updateForm({ isUnsolvedAlbumCreditsCleared: isCleared });
							}}
							title="Unsolved Album Credits"
							unsolvedCredits={album.unsolvedCredits}
						/>
					)}
					<PartyCombobox
						ariaLabel="Album artists"
						placeholder="Search or create album artists..."
						selectedIds={form.albumArtistIds}
						setSelectedIds={(albumArtistIds) => {
							updateForm({ albumArtistIds });
						}}
					/>
				</Field>

				<EnumFieldSelect
					label="Album type"
					name="type"
					onValueChange={(type) => updateForm({ type })}
					options={ALBUM_TYPE_OPTIONS}
					placeholder="Select album type"
					value={form.type}
				/>

				<ReleaseDateField
					label="Release date"
					name="releaseDate"
					onChange={(releaseDate) => updateForm({ releaseDate })}
					value={form.releaseDate ?? null}
				/>

				<OptionSelectField
					className="sm:col-span-2"
					id={languageId}
					label="Language"
					name="languageId"
					onValueChange={(id) => updateForm({ languageId: id ?? null })}
					options={languageOptions}
					placeholder="Select language"
					value={selectedLanguageOption}
				/>
			</div>

			{discs.length > 0 && (
				<section className="grid gap-3">
					<div className="grid gap-1">
						<h3 className="text-sm font-semibold">Discs</h3>
						<p className="text-xs text-muted-foreground">
							Optional subtitles for each disc. Multi-disc releases can also use
							separate disc cover images.
						</p>
					</div>
					{discs.length > 1 && (
						<div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
							<Checkbox
								checked={form.useAlbumCoverForDiscs}
								id={useAlbumCoverForDiscsId}
								onCheckedChange={(checked) => {
									updateForm({ useAlbumCoverForDiscs: checked === true });
								}}
							/>
							<div className="grid gap-1 leading-none">
								<Label htmlFor={useAlbumCoverForDiscsId}>
									Use album cover for all discs
								</Label>
								<p className="text-xs leading-snug text-muted-foreground">
									Uncheck to upload different cover images for individual discs.
								</p>
							</div>
						</div>
					)}
					<div className="grid gap-4">
						{discs.map((disc) => {
							const subtitleInputId = `${discSubtitleId}-${disc.localId}`;
							const coverInputId = `${discCoverInputId}-${disc.localId}`;

							return (
								<div key={disc.localId} className="grid gap-4">
									{discs.length > 1 && !form.useAlbumCoverForDiscs && (
										<CoverImageField
											cover={
												pendingDiscCoversById[disc.localId] ??
												discCoversById[disc.localId] ??
												cover
											}
											inputId={coverInputId}
											label={`Disc ${disc.discNumber} cover`}
											name={`discCover-${disc.localId}`}
											onFileChange={(event) =>
												handleCoverImageChange(event, {
													type: "disc",
													discId: disc.localId,
												})
											}
										/>
									)}
									<Field name={`discSubtitle-${disc.localId}`}>
										<FieldLabel htmlFor={subtitleInputId}>
											Disc {disc.discNumber} subtitle
										</FieldLabel>
										<Input
											autoComplete="off"
											id={subtitleInputId}
											name={`discSubtitle-${disc.localId}`}
											onChange={(event) =>
												setDiscSubtitle(disc.localId, event.target.value)
											}
											placeholder="Optional"
											type="text"
											value={form.discSubtitlesById[disc.localId] ?? ""}
										/>
									</Field>
								</div>
							);
						})}
					</div>
				</section>
			)}
			<Fieldset className="grid gap-4 rounded-xl border bg-muted/35 p-4">
				<div className="grid gap-1">
					<FieldsetLegend className="text-sm">
						Replace all track metadata
					</FieldsetLegend>
					<p className="text-xs text-muted-foreground">
						Optional bulk updates applied to every track and audio file in this
						album draft.
					</p>
				</div>

				<Field name="replaceTrackArtists">
					<FieldLabel>Track artists</FieldLabel>
					<Alert variant="warning">
						<AlertCircleIcon />
						<AlertTitle>Warning</AlertTitle>
						<AlertDescription>
							This will clear all unsolved track credits.
						</AlertDescription>
					</Alert>
					<PartyCombobox
						ariaLabel="Replacement track artists"
						placeholder="Search or create replacement artists..."
						selectedIds={form.replaceTrackArtists}
						setSelectedIds={(replaceTrackArtists) => {
							updateForm({ replaceTrackArtists });
						}}
					/>

					<FieldDescription>
						Leave empty to keep each track's current artists.
					</FieldDescription>
				</Field>

				<OptionSelectField
					description="Choose a language only if every track should use it."
					id={replaceTrackLanguageId}
					label="Track language"
					name="replaceTrackLanguageId"
					placeholder="Keep current track languages"
					onValueChange={(id) =>
						updateForm({ replaceTrackLanguageId: id ?? null })
					}
					options={replaceLanguageOptions}
					value={selectedReplacementTrackLanguageOption}
				/>

				<OptionSelectField
					description="Choose a source only if every audio file should use it."
					id={replaceAudioSourceId}
					label="Audio file source"
					name="replaceAudioSource"
					onValueChange={(value) => updateForm({ replaceAudioSource: value })}
					options={replaceAudioSourceOptions}
					placeholder="Keep current audio sources"
					value={selectedReplacementAudioSourceOption}
				/>

				<Field name="replaceAudioSourceUrl">
					<FieldLabel htmlFor={replaceAudioSourceUrlId}>Source URL</FieldLabel>
					<Input
						autoComplete="off"
						id={replaceAudioSourceUrlId}
						name="replaceAudioSourceUrl"
						onChange={(event) => {
							updateForm({ replaceAudioSourceUrl: event.target.value });
						}}
						placeholder="Keep current source URLs"
						type="url"
						value={form.replaceAudioSourceUrl}
					/>
					<FieldError match="typeMismatch">
						Enter a valid source URL.
					</FieldError>
					<FieldDescription>
						Leave empty to keep each audio file's current source URL.
					</FieldDescription>
				</Field>
			</Fieldset>
		</>
	);
}

export function AlbumDraftEditDialog({
	albumId,
	onOpenChange,
}: AlbumDraftEditDialogProps) {
	const album = useAlbumUploadStore((state) => state.albumsById[albumId]);
	const albumCover = useAlbumUploadStore((state) => {
		const coverAssetIdByHash = state.albumsById[albumId]?.coverAssetIdByHash;

		if (!coverAssetIdByHash) return undefined;

		return state.coverAssetsIdByHash[coverAssetIdByHash];
	});

	const discs = useAlbumUploadStore(
		useShallow((state) =>
			album.discIds.map((discId) => state.discsById[discId]),
		),
	);
	const discCoversById = useAlbumUploadStore(
		useShallow((state) => {
			const coversById: Partial<Record<DiscLocalId, CoverAsset>> = {};

			for (const discId of album.discIds) {
				const coverAssetIdByHash = state.discsById[discId].coverAssetIdByHash;
				if (coverAssetIdByHash) {
					coversById[discId] = state.coverAssetsIdByHash[coverAssetIdByHash];
				}
			}

			return coversById;
		}),
	);

	const [pendingCover, setPendingCover] = useState<CoverAsset | null>(null);

	const coverPreview = pendingCover ?? albumCover;

	const updateAlbumDraft = useAlbumUploadStore(
		(state) => state.updateAlbumDraft,
	);

	const [form, setForm] = useState(() => initFormValue(album, discs));
	const [isCoverCropOpen, setIsCoverCropOpen] = useState(false);
	const [coverImageCandidate, setCoverImageCandidate] =
		useState<CoverImageCandidate | null>(null);

	const [pendingDiscCoversById, setPendingDiscCoversById] = useState<
		Partial<Record<DiscLocalId, CoverAsset>>
	>({});

	function updateForm(nextValue: Partial<EditAlbumDraftFormValue>) {
		setForm((current) => ({ ...current, ...nextValue }));
	}

	function setDiscSubtitle(discId: DiscLocalId, subtitle: string) {
		setForm((current) => ({
			...current,
			discSubtitlesById: {
				...current.discSubtitlesById,
				[discId]: subtitle,
			},
		}));
	}

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const discCoversForSubmit: Partial<Record<DiscLocalId, CoverAsset | null>> =
			{};

		if (discs.length === 1) {
			discCoversForSubmit[discs[0].localId] = null;
		} else if (form.useAlbumCoverForDiscs) {
			for (const disc of discs) {
				discCoversForSubmit[disc.localId] = coverPreview ?? null;
			}
		} else {
			for (const [discId, pendingDiscCover] of Object.entries(
				pendingDiscCoversById,
			)) {
				discCoversForSubmit[discId] = pendingDiscCover;
			}
		}

		updateAlbumDraft(albumId, {
			replaceAudioSourceUrl: form.replaceAudioSourceUrl.trim() || null,
			title: form.title,
			type: form.type,
			languageId: form.languageId,
			releaseDate: form.releaseDate ?? null,
			clearUnsolvedAlbumCredits: form.isUnsolvedAlbumCreditsCleared,
			cover: pendingCover,
			credits: form.albumArtistIds.map((partyId) => ({
				partyId,
				credit: "Artist",
			})),
			discCoversById: discCoversForSubmit,
			discSubtitlesById: form.discSubtitlesById,
			replaceAudioSource: form.replaceAudioSource ?? null,
			replaceTrackCredits: form.replaceTrackArtists.map((partyId) => ({
				partyId,
				credit: "Artist",
			})),
			replaceTrackLanguageId: form.replaceTrackLanguageId ?? null,
		});
		onOpenChange(false);
	};

	const handleCoverCropOpenChange = (open: boolean) => {
		setIsCoverCropOpen(open);
	};

	const handleCoverCropCloseComplete = () => {
		if (!isCoverCropOpen) {
			console.log("cover crop closed");
			if (coverImageCandidate) URL.revokeObjectURL(coverImageCandidate.src);
			setCoverImageCandidate(null);
		}
	};

	const handleCoverCropConfirm = async (croppedArea: CroppedArea) => {
		if (!coverImageCandidate) return;
		const { file, target } = coverImageCandidate;

		const coverAsset = await createCoverAsset(file, file.name, croppedArea);

		if (coverAsset && target.type === "album") {
			setPendingCover(coverAsset);
		} else if (coverAsset && target.type === "disc") {
			const { discId } = target;

			setPendingDiscCoversById((current) => ({
				...current,
				[discId]: coverAsset,
			}));
		}
		setIsCoverCropOpen(false);
	};

	function handleCoverImageChange(
		event: ChangeEvent<HTMLInputElement>,
		target: CoverImageTarget,
	) {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;

		setCoverImageCandidate({ file, src: URL.createObjectURL(file), target });
		setIsCoverCropOpen(true);
	}

	return (
		<>
			<Dialog onOpenChange={onOpenChange} open disablePointerDismissal>
				<DialogPopup className="max-w-2xl" showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Edit album draft</DialogTitle>
						<DialogDescription>
							Update album-level metadata before upload.
						</DialogDescription>
					</DialogHeader>
					<Form className="contents" onSubmit={handleSubmit}>
						<DialogPanel className="grid gap-5">
							<AlbumDraftEditDialogForm
								cover={coverPreview}
								form={form}
								discs={discs}
								album={album}
								discCoversById={discCoversById}
								pendingDiscCoversById={pendingDiscCoversById}
								updateForm={updateForm}
								handleCoverImageChange={handleCoverImageChange}
								setDiscSubtitle={setDiscSubtitle}
							/>
						</DialogPanel>
						<DialogFooter>
							<DialogClose render={<Button variant="ghost" />}>
								Cancel
							</DialogClose>
							<Button type="submit">Save draft</Button>
						</DialogFooter>
					</Form>
				</DialogPopup>
			</Dialog>

			<ImageCropDialog
				aspectRatio={ALBUM_COVER_ASPECT_RATIO}
				confirmLabel="Use crop"
				description={`Choose the square crop coordinates for this cover. The original image is uploaded unchanged.`}
				imageAlt={`Selected cover`}
				imageSrc={coverImageCandidate?.src ?? null}
				onConfirm={handleCoverCropConfirm}
				onOpenChange={handleCoverCropOpenChange}
				onOpenChangeComplete={handleCoverCropCloseComplete}
				open={isCoverCropOpen}
				title={`Crop cover`}
			/>
		</>
	);
}
