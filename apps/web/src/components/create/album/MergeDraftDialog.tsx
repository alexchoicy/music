import { useId, useState } from "react";

import { Button } from "#/components/base/button";
import { Checkbox } from "#/components/base/checkbox";
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
import { Label } from "#/components/base/label";
import { FilterSelect } from "#/components/library/FilterSelect";
import { useAlbumUploadStore } from "#/store/albumUploadStore";
import type { AlbumLocalId } from "#/store/albumUploadStoreType";

export function MergeDraftDialog({
	albumId,
	onClose,
}: {
	albumId: AlbumLocalId;
	onClose: () => void;
}) {
	const asNewDiscId = useId();
	const subtitleId = useId();
	const albumOrder = useAlbumUploadStore((state) => state.albumOrder);
	const albumsById = useAlbumUploadStore((state) => state.albumsById);
	const title = albumsById[albumId].title;
	const targetOptions = albumOrder
		.filter((id) => id !== albumId)
		.map((id) => ({ value: id, label: albumsById[id].title }));
	const mergeAlbumDraft = useAlbumUploadStore((state) => state.mergeAlbumDraft);

	const [targetAlbumId, setTargetAlbumId] = useState(
		targetOptions[0]?.value ?? "",
	);
	const [mergeAsNewDisc, setMergeAsNewDisc] = useState(false);
	const [newDiscSubtitle, setNewDiscSubtitle] = useState("");

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogPopup className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Merge into another album</DialogTitle>
					<DialogDescription>
						Tracks of “{title}” move to the chosen album, which keeps its own
						title, artists, and cover.
					</DialogDescription>
				</DialogHeader>
				<DialogPanel>
					<div className="flex flex-col gap-4">
						<FilterSelect
							label="Merge into"
							onValueChange={setTargetAlbumId}
							options={targetOptions}
							value={targetAlbumId}
						/>
						<div className="flex items-center gap-2">
							<Checkbox
								checked={mergeAsNewDisc}
								id={asNewDiscId}
								onCheckedChange={(checked) => setMergeAsNewDisc(checked)}
							/>
							<Label htmlFor={asNewDiscId}>
								Add as a new disc instead of matching disc numbers
							</Label>
						</div>
						{mergeAsNewDisc && (
							<Field>
								<FieldLabel htmlFor={subtitleId}>New disc subtitle</FieldLabel>
								<Input
									autoComplete="off"
									id={subtitleId}
									onChange={(event) => setNewDiscSubtitle(event.target.value)}
									placeholder="Optional"
									value={newDiscSubtitle}
								/>
							</Field>
						)}
					</div>
				</DialogPanel>
				<DialogFooter>
					<DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
					<Button
						disabled={!targetAlbumId}
						onClick={() => {
							mergeAlbumDraft(albumId, {
								targetAlbumId,
								mergeAsNewDisc,
								newDiscSubtitle: mergeAsNewDisc ? newDiscSubtitle.trim() : "",
							});
							onClose();
						}}
					>
						Merge
					</Button>
				</DialogFooter>
			</DialogPopup>
		</Dialog>
	);
}
