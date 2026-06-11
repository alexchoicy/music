import { useId, useState } from "react";
import { useShallow } from "zustand/react/shallow";

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
import { Field, FieldDescription, FieldLabel } from "#/components/coss/field";
import { Form } from "#/components/coss/form";
import { Input } from "#/components/coss/input";
import { Label } from "#/components/coss/label";
import { OptionSelectField } from "#/components/OptionSelectField";
import { useAlbumUploadStore } from "#/store/albumUploadStore";
import type { AlbumLocalId } from "#/store/albumUploadStoreType";

type AlbumDraftMergeDialogProps = {
	albumId: AlbumLocalId;
	onOpenChange: (open: boolean) => void;
};

const SELECT_ALBUM_OPTION_VALUE = "__select_album__";

export function AlbumDraftMergeDialog({
	albumId,
	onOpenChange,
}: AlbumDraftMergeDialogProps) {
	const targetAlbumId = useId();
	const mergeAsNewDiscId = useId();
	const newDiscSubtitleId = useId();

	const candidateAlbums = useAlbumUploadStore(
		useShallow((state) =>
			Object.values(state.albumsById).filter(
				(album) => album.localId !== albumId,
			),
		),
	);
	const mergeAlbumDraft = useAlbumUploadStore((state) => state.mergeAlbumDraft);

	const [selectedTargetAlbumId, setSelectedTargetAlbumId] =
		useState<AlbumLocalId | null>(null);
	const [mergeAsNewDisc, setMergeAsNewDisc] = useState(false);
	const [newDiscSubtitle, setNewDiscSubtitle] = useState("");

	const targetAlbumOptions = [
		{
			id: null,
			label: "Select album",
			value: SELECT_ALBUM_OPTION_VALUE,
		},
		...candidateAlbums.map((album) => ({
			id: album.localId,
			label: album.title,
			value: album.localId,
		})),
	];
	const selectedTargetAlbumOption =
		targetAlbumOptions.find((option) => option.id === selectedTargetAlbumId) ??
		targetAlbumOptions[0];

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!selectedTargetAlbumId) return;

		mergeAlbumDraft(albumId, {
			targetAlbumId: selectedTargetAlbumId,
			mergeAsNewDisc,
			newDiscSubtitle: newDiscSubtitle.trim(),
		});
		onOpenChange(false);
	}

	return (
		<Dialog onOpenChange={onOpenChange} open disablePointerDismissal>
			<DialogPopup className="max-w-lg" showCloseButton={false}>
				<DialogHeader>
					<DialogTitle>Merge album draft</DialogTitle>
					<DialogDescription>
						Move tracks from this draft into another album draft.
					</DialogDescription>
				</DialogHeader>
				<Form className="contents" onSubmit={handleSubmit}>
					<DialogPanel className="grid gap-5">
						<OptionSelectField
							description={
								candidateAlbums.length === 0
									? "No other album drafts found."
									: "The selected album keeps its album-level metadata."
							}
							id={targetAlbumId}
							label="Merge into album"
							name="targetAlbumId"
							onValueChange={(id) => setSelectedTargetAlbumId(id ?? null)}
							options={targetAlbumOptions}
							placeholder="Select album"
							value={selectedTargetAlbumOption}
						/>

						<div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
							<Checkbox
								checked={mergeAsNewDisc}
								id={mergeAsNewDiscId}
								onCheckedChange={(checked) => {
									setMergeAsNewDisc(checked === true);
								}}
							/>
							<div className="grid gap-1 leading-none">
								<Label htmlFor={mergeAsNewDiscId}>Merge as new disc</Label>
								<p className="text-xs leading-snug text-muted-foreground">
									Create a new disc in the target album instead of merging by
									disc number.
								</p>
							</div>
						</div>

						<Field name="newDiscSubtitle">
							<FieldLabel htmlFor={newDiscSubtitleId}>
								New disc subtitle
							</FieldLabel>
							<Input
								autoComplete="off"
								disabled={!mergeAsNewDisc}
								id={newDiscSubtitleId}
								name="newDiscSubtitle"
								onChange={(event) => setNewDiscSubtitle(event.target.value)}
								placeholder="Optional"
								type="text"
								value={newDiscSubtitle}
							/>
							<FieldDescription>
								Used only when merging as a new disc.
							</FieldDescription>
						</Field>
					</DialogPanel>
					<DialogFooter>
						<DialogClose render={<Button variant="ghost" />}>
							Cancel
						</DialogClose>
						<Button disabled={!selectedTargetAlbumId} type="submit">
							Merge draft
						</Button>
					</DialogFooter>
				</Form>
			</DialogPopup>
		</Dialog>
	);
}
