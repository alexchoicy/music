import type * as API from "@music/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { useId, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "#/components/base/alert";
import { Button } from "#/components/base/button";
import { Field, FieldLabel } from "#/components/base/field";
import { Input } from "#/components/base/input";
import { toastManager } from "#/components/base/toast";
import { FilterSelect } from "#/components/library/FilterSelect";
import {
	COUNTRY_CODE_OPTIONS,
	PARTY_GENDER_OPTIONS,
	PARTY_KIND_OPTIONS,
	PARTY_TYPE_OPTIONS,
} from "#/enums/partyEnums";
import { partyMutation, partyQueries } from "#/lib/queries/party.queries";
import { searchPartyByNormalizedName } from "#/lib/utils/party";
import { normalizeString } from "#/lib/utils/string";

type PartyForm = {
	name: string;
	type: API.PartyType;
	kind: API.PartyKind;
	gender: API.PartyGender;
	country: API.CountryCode;
};

export function PartyCreate() {
	const nameId = useId();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [form, setForm] = useState<PartyForm>({
		name: "",
		type: "Individual",
		kind: "Human",
		gender: "Unknown",
		country: "XX",
	});

	const { data: parties = [] } = useQuery(partyQueries.getParties());
	const name = form.name.trim();
	const existing = name
		? searchPartyByNormalizedName(parties, normalizeString(name))
		: undefined;

	const mutation = useMutation({
		...partyMutation.createParty(),
		onSuccess: async (result) => {
			await queryClient.invalidateQueries({ queryKey: ["parties"] });
			toastManager.add({ title: `Created ${name}`, type: "success" });
			await navigate({
				to: "/parties/$id/edit",
				params: { id: String(result.partyId) },
			});
		},
	});

	function update(next: Partial<PartyForm>) {
		setForm((current) => ({ ...current, ...next }));
	}

	return (
		<form
			className="flex w-full max-w-3xl flex-col gap-5"
			onSubmit={(event) => {
				event.preventDefault();
				if (!name || existing) return;
				mutation.mutate({
					...form,
					name,
					avatar: null,
					banner: null,
					musicBrainzID: null,
				});
			}}
		>
			<h1 className="text-xl font-semibold tracking-tight">Party</h1>

			<Field>
				<FieldLabel htmlFor={nameId}>Name</FieldLabel>
				<Input
					autoComplete="off"
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

			{existing && (
				<Alert variant="warning">
					<AlertTitle>{existing.name} already exists</AlertTitle>
					<AlertDescription>
						<Link
							className="underline"
							params={{ id: String(existing.partyId) }}
							to="/parties/$id"
						>
							Open the existing party
						</Link>
					</AlertDescription>
				</Alert>
			)}

			{mutation.error && (
				<Alert variant="error">
					<AlertDescription>{mutation.error.message}</AlertDescription>
				</Alert>
			)}

			<div className="flex justify-end">
				<Button
					disabled={!name || Boolean(existing)}
					loading={mutation.isPending}
					type="submit"
				>
					<PlusIcon aria-hidden="true" />
					Create party
				</Button>
			</div>
		</form>
	);
}
