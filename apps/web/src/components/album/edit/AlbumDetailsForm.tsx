import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";

import { Alert, AlertDescription } from "#/components/base/alert";
import { Button } from "#/components/base/button";
import { Field, FieldDescription, FieldLabel } from "#/components/base/field";
import { Input } from "#/components/base/input";
import { Textarea } from "#/components/base/textarea";
import { toastManager } from "#/components/base/toast";
import { FilterSelect } from "#/components/library/FilterSelect";
import { ALBUM_TYPE_OPTIONS } from "#/enums/albumEnums";
import {
	albumEditActions,
	applyAlbumEdit,
} from "#/lib/queries/albumEdit.queries";
import type {
	AlbumEditDetails,
	UpdateAlbumDetailsRequest,
} from "#/lib/queries/albumEdit.queries";
import { PartyCombobox } from "#/old-components/PartyCombobox";
import { ReleaseDateField } from "#/old-components/ReleaseDateField";

import { LanguageSelect } from "./LanguageSelect";

type DetailsForm = Omit<UpdateAlbumDetailsRequest, "version"> & {
	artistIds: number[];
	languageId: number | null;
};

function toForm(album: AlbumEditDetails): DetailsForm {
	return {
		title: album.title,
		description: album.description,
		type: album.type,
		languageId: album.languageId == null ? null : Number(album.languageId),
		releaseDate: album.releaseDate ?? null,
		artistIds: album.artistIds.map(Number),
	};
}

export function AlbumDetailsForm({
	album,
	onDirtyChange,
}: {
	album: AlbumEditDetails;
	onDirtyChange: (isDirty: boolean) => void;
}) {
	const titleId = useId();
	const descriptionId = useId();
	const queryClient = useQueryClient();
	const initial = toForm(album);
	const [form, setForm] = useState<DetailsForm>(initial);
	const isDirty = JSON.stringify(form) !== JSON.stringify(initial);

	useEffect(() => {
		onDirtyChange(isDirty);
		return () => onDirtyChange(false);
	}, [isDirty, onDirtyChange]);

	const mutation = useMutation({
		mutationFn: () =>
			albumEditActions.updateDetails(album.albumId, {
				...form,
				title: form.title.trim(),
				version: album.version,
			}),
		onSuccess: (updated) => {
			applyAlbumEdit(queryClient, album.albumId, updated);
			setForm(toForm(updated));
			toastManager.add({ title: "Album details saved", type: "success" });
		},
	});

	function update(next: Partial<DetailsForm>) {
		setForm((current) => ({ ...current, ...next }));
	}

	return (
		<form
			className="flex max-w-3xl flex-col gap-5"
			onSubmit={(event) => {
				event.preventDefault();
				if (form.title.trim() && isDirty) mutation.mutate();
			}}
		>
			<Field>
				<FieldLabel htmlFor={titleId}>Title</FieldLabel>
				<Input
					id={titleId}
					onChange={(event) => update({ title: event.target.value })}
					required
					value={form.title}
				/>
			</Field>

			<Field>
				<FieldLabel nativeLabel={false} render={<div />}>
					Artists
				</FieldLabel>
				<PartyCombobox
					allowCreate
					ariaLabel="Album artists"
					placeholder="Search or create artists..."
					selectedIds={form.artistIds}
					setSelectedIds={(artistIds) => update({ artistIds })}
				/>
				<FieldDescription>
					Leave empty to credit the album to “Unknown”.
				</FieldDescription>
			</Field>

			<div className="grid gap-4 sm:grid-cols-2">
				<FilterSelect
					label="Type"
					onValueChange={(type) => update({ type })}
					options={ALBUM_TYPE_OPTIONS}
					value={form.type}
				/>
				<ReleaseDateField
					label="Release date"
					name="releaseDate"
					onChange={(releaseDate) => update({ releaseDate })}
					value={form.releaseDate ?? null}
				/>
			</div>

			<LanguageSelect
				onValueChange={(languageId) => update({ languageId })}
				value={form.languageId}
			/>

			<Field>
				<FieldLabel htmlFor={descriptionId}>Description</FieldLabel>
				<Textarea
					id={descriptionId}
					onChange={(event) => update({ description: event.target.value })}
					rows={4}
					value={form.description}
				/>
			</Field>

			{mutation.error && (
				<Alert variant="error">
					<AlertDescription>{mutation.error.message}</AlertDescription>
				</Alert>
			)}

			<div className="flex justify-end gap-2">
				<Button
					disabled={!isDirty || mutation.isPending}
					onClick={() => setForm(initial)}
					type="button"
					variant="ghost"
				>
					Reset
				</Button>
				<Button
					disabled={!isDirty || !form.title.trim() || mutation.isPending}
					type="submit"
				>
					{mutation.isPending ? "Saving…" : "Save details"}
				</Button>
			</div>
		</form>
	);
}
