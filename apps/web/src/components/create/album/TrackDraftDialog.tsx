import { useId, useState } from "react";

import { LanguageSelect } from "#/components/album/edit/LanguageSelect";
import { Button } from "#/components/base/button";
import {
	Dialog,
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "#/components/base/dialog";
import { Field, FieldLabel } from "#/components/base/field";
import { Input } from "#/components/base/input";
import { FilterSelect } from "#/components/library/FilterSelect";
import { PartyCombobox } from "#/components/party/PartyCombobox";
import { DEFAULT_TRACK_AUDIO_SOURCE } from "#/constant/album";
import { MEDIA_SOURCE_OPTIONS } from "#/enums/albumEnums";
import {
	TRACK_CONTENT_TYPE_OPTIONS,
	TRACK_VERSION_TYPE_OPTIONS,
} from "#/enums/trackEnums";
import { formatFileSize } from "#/lib/utils/file";
import { useAlbumUploadStore } from "#/store/albumUploadStore";
import type { TrackLocalId } from "#/store/albumUploadStoreType";

import { toArtistCredits, UnmatchedArtistsAlert } from "./DraftCredits";

function isWholeNumber(value: string, min: number) {
	const number = Number(value);
	return value.trim() !== "" && Number.isInteger(number) && number >= min;
}

export function TrackDraftDialog({
	trackId,
	onClose,
}: {
	trackId: TrackLocalId;
	onClose: () => void;
}) {
	const titleId = useId();
	const discNumberId = useId();
	const trackNumberId = useId();
	const sourceUrlId = useId();
	const track = useAlbumUploadStore((state) => state.tracksById[trackId]);
	const disc = useAlbumUploadStore((state) => state.discsById[track.discId]);
	const updateTrackDraft = useAlbumUploadStore(
		(state) => state.updateTrackDraft,
	);
	const audio = track.audios[0];

	const [title, setTitle] = useState(track.title);
	const [artistIds, setArtistIds] = useState(() =>
		track.credits.map((credit) => Number(credit.partyId)),
	);
	const [isUnmatchedDismissed, setIsUnmatchedDismissed] = useState(false);
	const [discNumber, setDiscNumber] = useState(String(disc.discNumber));
	const [trackNumber, setTrackNumber] = useState(String(track.trackNumber));
	const [languageId, setLanguageId] = useState(
		track.languageId == null ? null : Number(track.languageId),
	);
	const [contentType, setContentType] = useState(track.contentType ?? "Music");
	const [versionType, setVersionType] = useState(
		track.versionType ?? "Original",
	);
	const [source, setSource] = useState(
		audio.source ?? DEFAULT_TRACK_AUDIO_SOURCE,
	);
	const [sourceUrl, setSourceUrl] = useState(audio.sourceUrl ?? "");

	const isValid =
		title.trim() !== "" &&
		isWholeNumber(discNumber, 1) &&
		isWholeNumber(trackNumber, 0);

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogPopup className="max-w-xl">
				<DialogHeader>
					<DialogTitle>Edit track</DialogTitle>
					<DialogDescription className="break-all">
						{audio.file.originalFileName} ·{" "}
						{formatFileSize(audio.file.sizeInBytes)}
					</DialogDescription>
				</DialogHeader>
				<DialogPanel>
					<div className="flex flex-col gap-4">
						<Field>
							<FieldLabel htmlFor={titleId}>Title</FieldLabel>
							<Input
								autoComplete="off"
								id={titleId}
								onChange={(event) => setTitle(event.target.value)}
								required
								value={title}
							/>
						</Field>
						<Field>
							<FieldLabel nativeLabel={false} render={<div />}>
								Artists
							</FieldLabel>
							<UnmatchedArtistsAlert
								isDismissed={isUnmatchedDismissed}
								names={track.unsolvedCredits}
								onDismissedChange={setIsUnmatchedDismissed}
							/>
							<PartyCombobox
								allowCreate
								ariaLabel="Track artists"
								placeholder="Search or create artists..."
								selectedIds={artistIds}
								setSelectedIds={setArtistIds}
							/>
						</Field>
						<div className="grid gap-4 sm:grid-cols-2">
							<Field>
								<FieldLabel htmlFor={discNumberId}>Disc number</FieldLabel>
								<Input
									id={discNumberId}
									min={1}
									onChange={(event) => setDiscNumber(event.target.value)}
									step={1}
									type="number"
									value={discNumber}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor={trackNumberId}>Track number</FieldLabel>
								<Input
									id={trackNumberId}
									min={0}
									onChange={(event) => setTrackNumber(event.target.value)}
									step={1}
									type="number"
									value={trackNumber}
								/>
							</Field>
							<FilterSelect
								label="Content"
								onValueChange={setContentType}
								options={TRACK_CONTENT_TYPE_OPTIONS}
								value={contentType}
							/>
							<FilterSelect
								label="Version"
								onValueChange={setVersionType}
								options={TRACK_VERSION_TYPE_OPTIONS}
								value={versionType}
							/>
						</div>
						<LanguageSelect onValueChange={setLanguageId} value={languageId} />
						<div className="grid gap-4 sm:grid-cols-2">
							<FilterSelect
								label="Audio source"
								onValueChange={setSource}
								options={MEDIA_SOURCE_OPTIONS}
								value={source}
							/>
							<Field>
								<FieldLabel htmlFor={sourceUrlId}>Source URL</FieldLabel>
								<Input
									autoComplete="off"
									id={sourceUrlId}
									onChange={(event) => setSourceUrl(event.target.value)}
									placeholder="Optional"
									type="url"
									value={sourceUrl}
								/>
							</Field>
						</div>
					</div>
				</DialogPanel>
				<DialogFooter>
					<DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
					<Button
						disabled={!isValid}
						onClick={() => {
							updateTrackDraft(trackId, {
								title: title.trim(),
								discNumber: Number(discNumber),
								trackNumber: Number(trackNumber),
								languageId,
								contentType,
								versionType,
								clearUnsolvedTrackCredits: isUnmatchedDismissed,
								credits: toArtistCredits(artistIds),
								source,
								sourceUrl: sourceUrl.trim() || null,
							});
							onClose();
						}}
					>
						Apply
					</Button>
				</DialogFooter>
			</DialogPopup>
		</Dialog>
	);
}
