import { useSuspenseQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import type { ChangeEvent } from "react";

import { Button } from "#/components/coss/button";
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
import { Field, FieldError, FieldLabel } from "#/components/coss/field";
import { Form } from "#/components/coss/form";
import { Input } from "#/components/coss/input";
import { EnumFieldSelect } from "#/components/enumFieldSelect";
import { ImageCropDialog } from "#/components/imageCropDialog";
import { OptionSelectField } from "#/components/OptionSelectField";
import { PartyCombobox } from "#/components/PartyCombobox";
import { ALBUM_COVER_ASPECT_RATIO } from "#/constant/album";
import { ALBUM_TYPE_OPTIONS } from "#/enums/albumEnums";
import { languageQueries } from "#/lib/queries/language.queries";
import { makeLanguageOptions } from "#/lib/utils/language";
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
} from "#/store/albumUploadStoreType";

import { ReleaseDateField } from "../../ReleaseDateField";
import { CoverImageField } from "../CoverImageField";
import { UnsolvedCreditsAlert } from "../UnsolvedCreditsAlert";

type AlbumDraftEditDialogProps = {
	albumId: AlbumLocalId;
	onOpenChange: (open: boolean) => void;
};

type AlbumDraftEditDialogFormProps = {
	cover?: CoverAsset;
	album: AlbumDraft;
	form: EditAlbumDraftFormValue;
	updateForm: (nextValue: Partial<EditAlbumDraftFormValue>) => void;
	handleCoverImageChange: (
		event: React.ChangeEvent<HTMLInputElement>,
		target: CoverImageTarget,
	) => void;
};

type EditAlbumDraftFormValue = {
	albumArtistIds: number[];
	title: string;
	type: CreateAlbumRequest["type"];
	releaseDate: CreateAlbumRequest["releaseDate"];
	isUnsolvedAlbumCreditsCleared: boolean;
	languageId: LanguageItem["id"] | null;
};

function initFormValue(album: AlbumDraft): EditAlbumDraftFormValue {
	return {
		albumArtistIds: album.credits.map((credit) => Number(credit.partyId)),
		title: album.title,
		type: album.type,
		releaseDate: album.releaseDate ?? null,
		isUnsolvedAlbumCreditsCleared: false,
		languageId: album.languageId ?? null,
	};
}

type CoverImageTarget =
	| { type: "album" }
	| { discId: DiscLocalId; discNumber: DiscDraft["discNumber"]; type: "disc" };

type CoverImageCandidate = {
	file: File;
	src: string;
	target: CoverImageTarget;
};

function AlbumDraftEditDialogForm({
	cover,
	form,
	album,
	updateForm,
	handleCoverImageChange,
}: AlbumDraftEditDialogFormProps) {
	const titleId = useId();
	const albumCoverInputId = useId();
	const languageId = useId();
	const { data: languages } = useSuspenseQuery(languageQueries.getLanguages());
	const languageOptions = makeLanguageOptions(languages);

	const selectedLanguageOption =
		languageOptions.find((option) => option.id === form.languageId) ??
		languageOptions[0];

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

	const [pendingCover, setPendingCover] = useState<CoverAsset | null>(null);

	const coverPreview = pendingCover ?? albumCover;

	const updateAlbumDraft = useAlbumUploadStore(
		(state) => state.updateAlbumDraft,
	);

	const [form, setForm] = useState(() => initFormValue(album));
	const [isCoverCropOpen, setIsCoverCropOpen] = useState(false);
	const [coverImageCandidate, setCoverImageCandidate] =
		useState<CoverImageCandidate | null>(null);

	function updateForm(nextValue: Partial<EditAlbumDraftFormValue>) {
		setForm((current) => ({ ...current, ...nextValue }));
	}

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		updateAlbumDraft(albumId, {
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
			discCoversById: {},
			discSubtitlesById: {},
			replaceAudioSource: null,
			replaceTrackCredits: null,
			replaceTrackLanguageId: null,
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

		const coverAsset = await createCoverAsset(
			coverImageCandidate.file,
			coverImageCandidate.file.name,
			croppedArea,
		);

		if (coverAsset) {
			setPendingCover(coverAsset);
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
								album={album}
								updateForm={updateForm}
								handleCoverImageChange={handleCoverImageChange}
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
