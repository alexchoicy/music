import type * as API from "@music/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "#/components/base/alert";
import { Button } from "#/components/base/button";
import { Input } from "#/components/base/input";
import { toastManager } from "#/components/base/toast";
import {
	invalidatePartyEdit,
	partyEditActions,
	partyQueries,
} from "#/lib/queries/party.queries";

type AliasDraft = {
	key: string;
	// null until the alias is saved
	id: number | null;
	name: string;
};

function toDrafts(party: API.PartyDetails): AliasDraft[] {
	return party.aliases.map((alias) => ({
		key: String(alias.id),
		id: Number(alias.id),
		name: alias.name,
	}));
}

export function PartyAliasesEditor({
	onDirtyChange,
	party,
}: {
	onDirtyChange: (isDirty: boolean) => void;
	party: API.PartyDetails;
}) {
	const queryClient = useQueryClient();
	const initial = toDrafts(party);
	const [aliases, setAliases] = useState(initial);
	const isDirty = JSON.stringify(aliases) !== JSON.stringify(initial);
	const hasBlank = aliases.some((alias) => !alias.name.trim());

	useEffect(() => {
		onDirtyChange(isDirty);
		return () => onDirtyChange(false);
	}, [isDirty, onDirtyChange]);

	const mutation = useMutation({
		mutationFn: () => {
			const savedNames = new Map(
				initial.map((alias) => [alias.id, alias.name]),
			);
			const keptIds = new Set(aliases.map((alias) => alias.id));
			return partyEditActions.updateAliases(party.partyId, {
				upsert: aliases
					.filter(
						(alias) =>
							alias.id === null ||
							savedNames.get(alias.id) !== alias.name.trim(),
					)
					.map((alias) => ({ id: alias.id, name: alias.name.trim() })),
				delete: initial.flatMap((alias) =>
					alias.id !== null && !keptIds.has(alias.id) ? [alias.id] : [],
				),
			});
		},
		onSuccess: async () => {
			invalidatePartyEdit(queryClient);
			const saved = await queryClient.query({
				...partyQueries.getParty(party.partyId),
				staleTime: 0,
			});
			setAliases(toDrafts(saved));
			toastManager.add({ title: "Aliases saved", type: "success" });
		},
	});

	return (
		<form
			className="flex max-w-3xl flex-col gap-5"
			onSubmit={(event) => {
				event.preventDefault();
				if (isDirty && !hasBlank) mutation.mutate();
			}}
		>
			<div className="flex flex-col gap-1">
				<h2 className="text-xl font-semibold tracking-tight">Aliases</h2>
				<p className="text-sm text-muted-foreground">
					Other names this party is known by. Search and uploads match on them
					too.
				</p>
			</div>

			{aliases.length > 0 ? (
				<ul className="flex flex-col gap-2">
					{aliases.map((alias, index) => (
						<li className="flex items-center gap-2" key={alias.key}>
							<Input
								aria-label={`Alias ${index + 1}`}
								autoFocus={alias.id === null && !alias.name}
								onChange={(event) =>
									setAliases((current) =>
										current.map((item) =>
											item.key === alias.key
												? { ...item, name: event.target.value }
												: item,
										),
									)
								}
								placeholder="Alias"
								value={alias.name}
							/>
							<Button
								aria-label={`Remove ${alias.name || `alias ${index + 1}`}`}
								onClick={() =>
									setAliases((current) =>
										current.filter((item) => item.key !== alias.key),
									)
								}
								size="icon"
								type="button"
								variant="ghost"
							>
								<Trash2Icon aria-hidden="true" />
							</Button>
						</li>
					))}
				</ul>
			) : (
				<p className="text-sm text-muted-foreground">No aliases yet.</p>
			)}

			<div>
				<Button
					onClick={() =>
						setAliases((current) => [
							...current,
							{ key: crypto.randomUUID(), id: null, name: "" },
						])
					}
					type="button"
					variant="outline"
				>
					<PlusIcon aria-hidden="true" />
					Add alias
				</Button>
			</div>

			{mutation.error && (
				<Alert variant="error">
					<AlertDescription>{mutation.error.message}</AlertDescription>
				</Alert>
			)}

			<div className="flex justify-end gap-2">
				<Button
					disabled={!isDirty || mutation.isPending}
					onClick={() => setAliases(initial)}
					type="button"
					variant="ghost"
				>
					Reset
				</Button>
				<Button
					disabled={!isDirty || hasBlank || mutation.isPending}
					type="submit"
				>
					{mutation.isPending ? "Saving…" : "Save aliases"}
				</Button>
			</div>
		</form>
	);
}
