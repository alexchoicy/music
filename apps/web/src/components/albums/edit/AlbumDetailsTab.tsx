import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";

import { Alert, AlertDescription } from "#/components/coss/alert";
import { Button } from "#/components/coss/button";
import { Field, FieldDescription, FieldLabel } from "#/components/coss/field";
import { Input } from "#/components/coss/input";
import { Textarea } from "#/components/coss/textarea";
import { toastManager } from "#/components/coss/toast";
import { EnumFieldSelect } from "#/components/enumFieldSelect";
import { OptionSelectField } from "#/components/OptionSelectField";
import { PartyCombobox } from "#/components/PartyCombobox";
import { ReleaseDateField } from "#/components/ReleaseDateField";
import { ALBUM_TYPE_OPTIONS } from "#/enums/albumEnums";
import {
	albumEditActions,
	applyAlbumEdit,
} from "#/lib/queries/albumEdit.queries";
import type {
	AlbumEditDetails,
	UpdateAlbumDetailsRequest,
} from "#/lib/queries/albumEdit.queries";
import { languageQueries } from "#/lib/queries/language.queries";
import { makeLanguageOptions } from "#/lib/utils/language";

type DetailsForm = Omit<UpdateAlbumDetailsRequest, "version"> & {
	artistIds: number[];
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

function isSameForm(a: DetailsForm, b: DetailsForm) {
	return JSON.stringify(a) === JSON.stringify(b);
}

export function AlbumDetailsTab({ album }: { album: AlbumEditDetails }) {
	const titleId = useId();
	const descriptionId = useId();
	const languageFieldId = useId();
	const queryClient = useQueryClient();
	const initial = toForm(album);
	const [form, setForm] = useState<DetailsForm>(initial);
	const isDirty = !isSameForm(form, initial);

	const { data: languages = [] } = useQuery(languageQueries.getLanguages());
	const languageOptions = makeLanguageOptions(languages);
	const selectedLanguage =
		languageOptions.find(
			(option) => option.id !== null && Number(option.id) === form.languageId,
		) ?? languageOptions[0];

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
			className="grid max-w-3xl gap-5"
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
				<EnumFieldSelect
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

			<OptionSelectField
				id={languageFieldId}
				label="Language"
				name="languageId"
				onValueChange={(id) =>
					update({ languageId: id == null ? null : Number(id) })
				}
				options={languageOptions}
				placeholder="Select language"
				value={selectedLanguage}
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
