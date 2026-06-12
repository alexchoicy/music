import { useQuery } from "@tanstack/react-query";
import { FileAudioIcon } from "lucide-react";
import { useId, useState } from "react";
import type { FormEvent } from "react";

import { Badge } from "#/components/coss/badge";
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
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "#/components/coss/field";
import { Form } from "#/components/coss/form";
import { Input } from "#/components/coss/input";
import { Switch } from "#/components/coss/switch";
import { EnumFieldSelect } from "#/components/enumFieldSelect";
import { OptionSelectField } from "#/components/OptionSelectField";
import { PartyCombobox } from "#/components/PartyCombobox";
import type { PartyComboboxId } from "#/components/PartyCombobox";
import { UnsolvedCreditsAlert } from "#/components/UnsolvedCreditsAlert";
import { DEFAULT_TRACK_AUDIO_SOURCE } from "#/constant/album";
import { MEDIA_SOURCE_OPTIONS } from "#/enums/albumEnums";
import {
	TRACK_CONTENT_TYPE_OPTIONS,
	TRACK_VERSION_TYPE_OPTIONS,
} from "#/enums/trackEnums";
import { languageQueries } from "#/lib/queries/language.queries";
import { formatDuration, formatFileSize } from "#/lib/utils/file";
import { makeLanguageOptions } from "#/lib/utils/language";
import { useAlbumUploadStore } from "#/store/albumUploadStore";
import type {
	DiscDraft,
	TrackDraft,
	TrackLocalId,
	TrackAudioRequest,
	UpdateTrackDraftInput,
} from "#/store/albumUploadStoreType";

type TrackDraftEditDialogProps = {
	trackId: TrackLocalId;
	onOpenChange: (open: boolean) => void;
};

type TrackDraftEditDialogFormProps = {
	track: TrackDraft;
	form: EditTrackDraftFormValue;
	updateForm: (nextValue: Partial<EditTrackDraftFormValue>) => void;
};

type EditTrackDraftAudioFormValue = Omit<
	UpdateTrackDraftInput["audios"][number],
	"rank" | "sourceUrl"
> & {
	rank: string;
	sourceUrl: string;
};

type EditTrackDraftFormValue = Omit<
	UpdateTrackDraftInput,
	"audios" | "credits" | "discNumber" | "trackNumber"
> & {
	audios: EditTrackDraftAudioFormValue[];
	discNumber: string;
	trackNumber: string;
	trackArtistIds: number[];
};

function formatAudioSummary(audio: TrackAudioRequest) {
	const summary = [
		audio.file.extension.toUpperCase(),
		formatFileSize(audio.file.sizeInBytes),
		formatDuration(Number(audio.file.durationInMs ?? 0)),
		audio.file.audioSampleRate ? `${audio.file.audioSampleRate} Hz` : null,
		audio.file.bitrate ? `${audio.file.bitrate} bps` : null,
	].filter(Boolean);

	return summary.join(" · ");
}

function makeAudioFormValue(
	audio: TrackAudioRequest,
	index: number,
): EditTrackDraftAudioFormValue {
	return {
		blake3Hash: audio.file.blake3Hash,
		rank: String(audio.rank ?? index),
		pinned: audio.pinned ?? index === 0,
		source: audio.source ?? DEFAULT_TRACK_AUDIO_SOURCE,
		sourceUrl: audio.sourceUrl ?? "",
	};
}

function makeAudioFormValues(
	audios: TrackAudioRequest[],
): EditTrackDraftAudioFormValue[] {
	const usedRanks = new Set<string>();
	let nextRank = 0;
	let pinnedIndex = -1;

	const formAudios = audios.map((audio, index) => {
		const formAudio = makeAudioFormValue(audio, index);
		let rank = formAudio.rank;

		if (rank === "" || usedRanks.has(rank)) {
			while (usedRanks.has(String(nextRank))) nextRank += 1;
			rank = String(nextRank);
		}

		usedRanks.add(rank);
		if (formAudio.pinned && pinnedIndex === -1) pinnedIndex = index;

		return { ...formAudio, rank };
	});

	const selectedPinnedIndex = pinnedIndex === -1 ? 0 : pinnedIndex;
	return formAudios.map((audio, index) => ({
		...audio,
		pinned: index === selectedPinnedIndex,
	}));
}

function initFormValue(
	track: TrackDraft,
	disc: DiscDraft,
): EditTrackDraftFormValue {
	return {
		title: track.title,
		discNumber: String(disc.discNumber),
		trackNumber: String(track.trackNumber),
		languageId: track.languageId ?? null,
		contentType: track.contentType ?? "Music",
		versionType: track.versionType ?? "Original",
		clearUnsolvedTrackCredits: false,
		trackArtistIds: track.credits.map((credit) => Number(credit.partyId)),
		audios: makeAudioFormValues(track.audios),
	};
}

function TrackDraftEditDialogForm({
	track,
	form,
	updateForm,
}: TrackDraftEditDialogFormProps) {
	const titleId = useId();
	const discNumberId = useId();
	const trackNumberId = useId();
	const languageId = useId();
	const audioFieldId = useId();

	const { data: languages = [] } = useQuery(languageQueries.getLanguages());
	const languageOptions = makeLanguageOptions(languages);
	const selectedLanguageOption =
		languageOptions.find((option) => option.id === form.languageId) ??
		languageOptions[0];

	function updateAudioForm(
		index: number,
		nextValue: Partial<EditTrackDraftAudioFormValue>,
	) {
		const nextAudios = form.audios.map((audio, audioIndex) => {
			if (audioIndex === index) return { ...audio, ...nextValue };
			if (nextValue.pinned === true) return { ...audio, pinned: false };
			return audio;
		});

		updateForm({ audios: nextAudios });
	}

	return (
		<>
			<div className="grid gap-4 sm:grid-cols-2">
				<Field className="sm:col-span-2" name="title">
					<FieldLabel htmlFor={titleId}>Track title</FieldLabel>
					<Input
						autoComplete="off"
						id={titleId}
						name="title"
						onChange={(event) => {
							updateForm({ title: event.target.value });
						}}
						required
						type="text"
						value={form.title}
					/>
					<FieldError match="valueMissing">Track title is required.</FieldError>
				</Field>

				<Field className="sm:col-span-2" name="trackArtists">
					<FieldLabel>Track artists</FieldLabel>
					<UnsolvedCreditsAlert
						onClear={(isCleared) => {
							updateForm({ clearUnsolvedTrackCredits: isCleared });
						}}
						title="Unsolved Track Credits"
						unsolvedCredits={track.unsolvedCredits}
						isCleared={form.clearUnsolvedTrackCredits}
					/>
					<PartyCombobox
						ariaLabel="Track artists"
						placeholder="Search or create track artists..."
						selectedIds={form.trackArtistIds}
						setSelectedIds={(selectedIds: PartyComboboxId[]) => {
							updateForm({ trackArtistIds: selectedIds });
						}}
					/>
				</Field>

				<Field name="discNumber">
					<FieldLabel htmlFor={discNumberId}>Disc number</FieldLabel>
					<Input
						id={discNumberId}
						min={1}
						name="discNumber"
						onChange={(event) => {
							updateForm({ discNumber: event.target.value });
						}}
						required
						step={1}
						type="number"
						value={form.discNumber}
					/>
					<FieldError match="valueMissing">Disc number is required.</FieldError>
					<FieldError match="rangeUnderflow">
						Disc number must be at least 1.
					</FieldError>
					<FieldError match="stepMismatch">
						Disc number must be a whole number.
					</FieldError>
				</Field>

				<Field name="trackNumber">
					<FieldLabel htmlFor={trackNumberId}>Track number</FieldLabel>
					<Input
						id={trackNumberId}
						min={0}
						name="trackNumber"
						onChange={(event) => {
							updateForm({ trackNumber: event.target.value });
						}}
						required
						step={1}
						type="number"
						value={form.trackNumber}
					/>
					<FieldError match="valueMissing">
						Track number is required.
					</FieldError>
					<FieldError match="rangeUnderflow">
						Track number must be at least 0.
					</FieldError>
					<FieldError match="stepMismatch">
						Track number must be a whole number.
					</FieldError>
				</Field>

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

				<EnumFieldSelect
					label="Content type"
					name="contentType"
					onValueChange={(contentType) => updateForm({ contentType })}
					options={TRACK_CONTENT_TYPE_OPTIONS}
					placeholder="Select content type"
					value={form.contentType}
				/>

				<EnumFieldSelect
					label="Version type"
					name="versionType"
					onValueChange={(versionType) => updateForm({ versionType })}
					options={TRACK_VERSION_TYPE_OPTIONS}
					placeholder="Select version type"
					value={form.versionType}
				/>
			</div>
			<section className="grid gap-3">
				<div className="space-y-1">
					<h3 className="text-sm font-semibold">Files</h3>
					<p className="text-xs text-muted-foreground">
						Edit source metadata for each audio file attached to this track.
					</p>
				</div>
				{track.audios.length > 0 ? (
					<div className="grid gap-3">
						{track.audios.map((audio, index) => {
							const formAudio =
								form.audios[index] ?? makeAudioFormValue(audio, index);
							const rankId = `${audioFieldId}-rank-${index}`;
							const pinnedId = `${audioFieldId}-pinned-${index}`;
							const sourceUrlId = `${audioFieldId}-source-url-${index}`;

							return (
								<div
									className="grid gap-4 rounded-xl border bg-muted/20 p-4"
									key={audio.file.blake3Hash}
								>
									<div className="flex min-w-0 items-start justify-between gap-3">
										<div className="flex min-w-0 gap-3">
											<div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground">
												<FileAudioIcon aria-hidden="true" className="size-5" />
											</div>
											<div className="min-w-0 space-y-1">
												<p className="truncate text-sm font-medium">
													{audio.file.originalFileName}
												</p>
												<p className="text-xs text-muted-foreground">
													{formatAudioSummary(audio)}
												</p>
											</div>
										</div>
										{formAudio.pinned && (
											<Badge size="sm" variant="secondary">
												Pinned
											</Badge>
										)}
									</div>

									<div className="grid gap-4 sm:grid-cols-[minmax(0,7rem)_minmax(0,7rem)_minmax(0,1fr)]">
										<Field name={`audioRank-${index}`}>
											<FieldLabel htmlFor={rankId}>Rank</FieldLabel>
											<Input
												id={rankId}
												min={0}
												name={`audioRank-${index}`}
												onChange={(event) => {
													updateAudioForm(index, {
														rank: event.target.value,
													});
												}}
												required
												step={1}
												type="number"
												value={formAudio.rank}
											/>
											<FieldError match="valueMissing">
												Audio rank is required.
											</FieldError>
											<FieldError match="rangeUnderflow">
												Audio rank must be at least 0.
											</FieldError>
											<FieldError match="stepMismatch">
												Audio rank must be a whole number.
											</FieldError>
										</Field>

										<Field name={`audioPinned-${index}`}>
											<FieldLabel htmlFor={pinnedId}>Pin</FieldLabel>
											<div className="flex h-8 items-center">
												<Switch
													checked={formAudio.pinned}
													id={pinnedId}
													onCheckedChange={(pinned) =>
														updateAudioForm(index, { pinned })
													}
												/>
											</div>
										</Field>

										<EnumFieldSelect
											label="Source"
											name={`audioSource-${index}`}
											onValueChange={(source) =>
												updateAudioForm(index, { source })
											}
											options={MEDIA_SOURCE_OPTIONS}
											placeholder="Select source"
											value={formAudio.source}
										/>
									</div>

									<Field name={`audioSourceUrl-${index}`}>
										<FieldLabel htmlFor={sourceUrlId}>Source URL</FieldLabel>
										<Input
											autoComplete="off"
											id={sourceUrlId}
											name={`audioSourceUrl-${index}`}
											onChange={(event) =>
												updateAudioForm(index, {
													sourceUrl: event.target.value,
												})
											}
											placeholder="Optional"
											type="url"
											value={formAudio.sourceUrl}
										/>
										<FieldError match="typeMismatch">
											Enter a valid source URL.
										</FieldError>
										<FieldDescription>
											Leave empty to save a null source URL.
										</FieldDescription>
									</Field>
								</div>
							);
						})}
					</div>
				) : (
					<div className="rounded-xl border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
						No audio files are attached to this track.
					</div>
				)}
			</section>
		</>
	);
}

export function TrackDraftEditDialog({
	trackId,
	onOpenChange,
}: TrackDraftEditDialogProps) {
	const track = useAlbumUploadStore((state) => state.tracksById[trackId]);
	const disc = useAlbumUploadStore((state) => state.discsById[track.discId]);
	const [form, setForm] = useState(() => initFormValue(track, disc));
	const updateTrackDraft = useAlbumUploadStore(
		(state) => state.updateTrackDraft,
	);

	function updateForm(nextValue: Partial<EditTrackDraftFormValue>) {
		setForm((current) => ({ ...current, ...nextValue }));
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		updateTrackDraft(trackId, {
			title: form.title,
			discNumber: Number(form.discNumber),
			trackNumber: Number(form.trackNumber),
			languageId: form.languageId,
			contentType: form.contentType,
			versionType: form.versionType,
			clearUnsolvedTrackCredits: form.clearUnsolvedTrackCredits,
			credits: form.trackArtistIds.map((partyId) => ({
				partyId,
				credit: "Artist",
			})),
			audios: form.audios.map((audio) => ({
				...audio,
				rank: Number(audio.rank),
				sourceUrl: audio.sourceUrl.trim() || null,
			})),
		});
		onOpenChange(false);
	}

	return (
		<Dialog onOpenChange={onOpenChange} open disablePointerDismissal>
			<DialogPopup className="max-w-2xl" showCloseButton={false}>
				<DialogHeader>
					<DialogTitle>Edit track draft</DialogTitle>
					<DialogDescription>{track.title}</DialogDescription>
				</DialogHeader>
				<Form className="contents" onSubmit={handleSubmit}>
					<DialogPanel className="grid gap-5">
						<TrackDraftEditDialogForm
							form={form}
							track={track}
							updateForm={updateForm}
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
	);
}
