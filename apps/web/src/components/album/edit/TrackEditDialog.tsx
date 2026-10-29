import { useId, useState } from "react";

import { Alert, AlertDescription } from "#/components/base/alert";
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
import { Textarea } from "#/components/base/textarea";
import { FilterSelect } from "#/components/library/FilterSelect";
import {
	TRACK_CONTENT_TYPE_OPTIONS,
	TRACK_VERSION_TYPE_OPTIONS,
} from "#/enums/trackEnums";
import { PartyCombobox } from "#/old-components/PartyCombobox";

import { LanguageSelect } from "./LanguageSelect";
import type { TrackDraft } from "./trackDraft";

export function TrackEditDialog({
	track,
	onClose,
	onSave,
}: {
	track: TrackDraft;
	onClose: () => void;
	onSave: (track: TrackDraft) => void;
}) {
	const titleId = useId();
	const descriptionId = useId();
	const [draft, setDraft] = useState(track);

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
					<div className="flex flex-col gap-4">
						{track.otherAlbumCount > 0 && (
							<Alert variant="warning">
								<AlertDescription>
									This track is also on {track.otherAlbumCount} other album
									{track.otherAlbumCount === 1 ? "" : "s"}. These changes show
									up there too.
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
							<FilterSelect
								label="Content"
								onValueChange={(contentType) => update({ contentType })}
								options={TRACK_CONTENT_TYPE_OPTIONS}
								value={draft.contentType}
							/>
							<FilterSelect
								label="Version"
								onValueChange={(versionType) => update({ versionType })}
								options={TRACK_VERSION_TYPE_OPTIONS}
								value={draft.versionType}
							/>
						</div>
						<LanguageSelect
							onValueChange={(languageId) => update({ languageId })}
							value={draft.languageId}
						/>
						<Field>
							<FieldLabel htmlFor={descriptionId}>Description</FieldLabel>
							<Textarea
								id={descriptionId}
								onChange={(event) =>
									update({ description: event.target.value })
								}
								rows={3}
								value={draft.description}
							/>
						</Field>
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
