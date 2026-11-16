import type * as API from "@music/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";

import { ReleaseDateField } from "#/components/album/edit/ReleaseDateField";
import { Alert, AlertDescription } from "#/components/base/alert";
import { Button } from "#/components/base/button";
import { Field, FieldDescription, FieldLabel } from "#/components/base/field";
import { Input } from "#/components/base/input";
import { Textarea } from "#/components/base/textarea";
import { toastManager } from "#/components/base/toast";
import { FilterSelect } from "#/components/library/FilterSelect";
import {
	COUNTRY_CODE_OPTIONS,
	PARTY_GENDER_OPTIONS,
	PARTY_KIND_OPTIONS,
	PARTY_TYPE_OPTIONS,
} from "#/enums/partyEnums";
import {
	invalidatePartyEdit,
	partyEditActions,
	partyQueries,
} from "#/lib/queries/party.queries";

type DetailsForm = {
	name: string;
	description: string;
	musicBrainzId: string;
	country: API.CountryCode;
	debutDate: string | null;
	type: API.PartyType;
	kind: API.PartyKind;
	gender: API.PartyGender;
};

function toForm(party: API.PartyDetails): DetailsForm {
	return {
		name: party.name,
		description: party.description,
		musicBrainzId: party.musicBrainzId ?? "",
		country: party.country,
		debutDate: party.debutDate ?? null,
		type: party.type ?? "Individual",
		kind: party.kind,
		gender: party.gender ?? "Unknown",
	};
}

export function PartyDetailsForm({
	onDirtyChange,
	party,
}: {
	onDirtyChange: (isDirty: boolean) => void;
	party: API.PartyDetails;
}) {
	const nameId = useId();
	const musicBrainzId = useId();
	const descriptionId = useId();
	const queryClient = useQueryClient();
	const initial = toForm(party);
	const [form, setForm] = useState<DetailsForm>(initial);
	const isDirty = JSON.stringify(form) !== JSON.stringify(initial);

	useEffect(() => {
		onDirtyChange(isDirty);
		return () => onDirtyChange(false);
	}, [isDirty, onDirtyChange]);

	const mutation = useMutation({
		mutationFn: () => {
			// Only changed fields are sent, a new MusicBrainz ID starts a metadata lookup
			const changed = Object.fromEntries(
				Object.entries({
					...form,
					name: form.name.trim(),
					musicBrainzId: form.musicBrainzId.trim() || null,
				}).filter(
					([key, value]) =>
						(value ?? "") !== (initial[key as keyof DetailsForm] ?? ""),
				),
			) as API.UpdatePartyRequest;
			return partyEditActions.updateDetails(party.partyId, changed);
		},
		onSuccess: async () => {
			invalidatePartyEdit(queryClient);
			const saved = await queryClient.query({
				...partyQueries.getParty(party.partyId),
				staleTime: 0,
			});
			setForm(toForm(saved));
			toastManager.add({ title: "Party details saved", type: "success" });
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
				if (form.name.trim() && isDirty) mutation.mutate();
			}}
		>
			<Field>
				<FieldLabel htmlFor={nameId}>Name</FieldLabel>
				<Input
					id={nameId}
					onChange={(event) => update({ name: event.target.value })}
					required
					value={form.name}
				/>
			</Field>

			<div className="grid gap-4 sm:grid-cols-2">
				<FilterSelect
					label="Type"
					onValueChange={(type) => update({ type })}
					options={PARTY_TYPE_OPTIONS}
					value={form.type}
				/>
				<FilterSelect
					label="Kind"
					onValueChange={(kind) => update({ kind })}
					options={PARTY_KIND_OPTIONS}
					value={form.kind}
				/>
				<FilterSelect
					label="Gender"
					onValueChange={(gender) => update({ gender })}
					options={PARTY_GENDER_OPTIONS}
					value={form.gender}
				/>
				<FilterSelect
					label="Country"
					onValueChange={(country) => update({ country })}
					options={COUNTRY_CODE_OPTIONS}
					value={form.country}
				/>
			</div>

			<ReleaseDateField
				label="Debut date"
				name="debutDate"
				onChange={(debutDate) => update({ debutDate })}
				placeholder="Select debut date"
				value={form.debutDate}
			/>

			<Field>
				<FieldLabel htmlFor={musicBrainzId}>MusicBrainz ID</FieldLabel>
				<Input
					autoComplete="off"
					id={musicBrainzId}
					onChange={(event) => update({ musicBrainzId: event.target.value })}
					placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
					value={form.musicBrainzId}
				/>
				<FieldDescription>
					Changing it looks the party up again and refreshes its details.
				</FieldDescription>
			</Field>

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
					disabled={!isDirty || !form.name.trim() || mutation.isPending}
					type="submit"
				>
					{mutation.isPending ? "Saving…" : "Save details"}
				</Button>
			</div>
		</form>
	);
}
