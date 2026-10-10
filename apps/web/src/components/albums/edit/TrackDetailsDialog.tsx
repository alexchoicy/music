import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";

import { Alert, AlertDescription } from "#/components/coss/alert";
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
import { Field, FieldLabel } from "#/components/coss/field";
import { Input } from "#/components/coss/input";
import { EnumFieldSelect } from "#/components/enumFieldSelect";
import { OptionSelectField } from "#/components/OptionSelectField";
import { PartyCombobox } from "#/components/PartyCombobox";
import {
	TRACK_CONTENT_TYPE_OPTIONS,
	TRACK_VERSION_TYPE_OPTIONS,
} from "#/enums/trackEnums";
import { languageQueries } from "#/lib/queries/language.queries";
import { makeLanguageOptions } from "#/lib/utils/language";

import type { TrackDraft } from "./trackDraft";

export function TrackDetailsDialog({
	track,
	onClose,
	onSave,
}: {
	track: TrackDraft;
	onClose: () => void;
	onSave: (track: TrackDraft) => void;
}) {
	const titleId = useId();
	const languageFieldId = useId();
	const [draft, setDraft] = useState(track);
	const { data: languages = [] } = useQuery(languageQueries.getLanguages());
	const languageOptions = makeLanguageOptions(languages);
	const selectedLanguage =
		languageOptions.find(
			(option) => option.id !== null && Number(option.id) === draft.languageId,
		) ?? languageOptions[0];

	function update(next: Partial<TrackDraft>) {
		setDraft((current) => ({ ...current, ...next }));
	}

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
					<DialogDescription>
						Changes apply when you save the track list.
					</DialogDescription>
				</DialogHeader>
				<DialogPanel>
					<div className="grid gap-4">
						{track.otherAlbumCount > 0 && (
							<Alert variant="warning">
								<AlertDescription>
									This track is also on {track.otherAlbumCount} other album
									{track.otherAlbumCount === 1 ? "" : "s"}. Title, type,
									language and artists change there too.
								</AlertDescription>
							</Alert>
						)}
						<Field>
							<FieldLabel htmlFor={titleId}>Title</FieldLabel>
							<Input
								id={titleId}
								onChange={(event) => update({ title: event.target.value })}
								required
								value={draft.title}
							/>
						</Field>
						<Field>
							<FieldLabel nativeLabel={false} render={<div />}>
								Artists
							</FieldLabel>
							<PartyCombobox
								allowCreate
								ariaLabel="Track artists"
								placeholder="Search or create artists..."
								selectedIds={draft.artistIds}
								setSelectedIds={(artistIds) => update({ artistIds })}
							/>
						</Field>
						<div className="grid gap-4 sm:grid-cols-2">
							<EnumFieldSelect
								label="Content"
								onValueChange={(contentType) => update({ contentType })}
								options={TRACK_CONTENT_TYPE_OPTIONS}
								value={draft.contentType}
							/>
							<EnumFieldSelect
								label="Version"
								onValueChange={(versionType) => update({ versionType })}
								options={TRACK_VERSION_TYPE_OPTIONS}
								value={draft.versionType}
							/>
						</div>
						<OptionSelectField
							id={languageFieldId}
							label="Language"
							name="trackLanguageId"
							onValueChange={(id) =>
								update({ languageId: id == null ? null : Number(id) })
							}
							options={languageOptions}
							placeholder="Select language"
							value={selectedLanguage}
						/>
					</div>
				</DialogPanel>
				<DialogFooter>
					<DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
					<Button
						disabled={!draft.title.trim()}
						onClick={() => {
							onSave(draft);
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
