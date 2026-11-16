import type * as API from "@music/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "#/components/base/alert";
import { Button } from "#/components/base/button";
import { Input } from "#/components/base/input";
import {
	Select,
	SelectItem,
	SelectPopup,
	SelectTrigger,
	SelectValue,
} from "#/components/base/select";
import { toastManager } from "#/components/base/toast";
import {
	PARTY_EXTERNAL_INFO_TYPE,
	PARTY_EXTERNAL_INFO_TYPE_OPTIONS,
} from "#/enums/partyEnums";
import {
	invalidatePartyEdit,
	partyEditActions,
	partyQueries,
} from "#/lib/queries/party.queries";

type LinkDraft = {
	key: string;
	// null until the link is saved
	id: number | null;
	type: API.PartyExternalInfoType;
	externalId: string;
};

function toDrafts(party: API.PartyDetails): LinkDraft[] {
	return (party.externalInfos ?? []).map((info) => ({
		key: String(info.id),
		id: Number(info.id),
		type: info.type,
		externalId: info.externalId,
	}));
}

export function PartyLinksEditor({
	onDirtyChange,
	party,
}: {
	onDirtyChange: (isDirty: boolean) => void;
	party: API.PartyDetails;
}) {
	const queryClient = useQueryClient();
	const initial = toDrafts(party);
	const [links, setLinks] = useState(initial);
	const isDirty = JSON.stringify(links) !== JSON.stringify(initial);
	const hasBlank = links.some((link) => !link.externalId.trim());

	useEffect(() => {
		onDirtyChange(isDirty);
		return () => onDirtyChange(false);
	}, [isDirty, onDirtyChange]);

	const mutation = useMutation({
		mutationFn: () => {
			const savedIds = new Map(
				initial.map((link) => [link.id, link.externalId]),
			);
			const keptIds = new Set(links.map((link) => link.id));
			return partyEditActions.updateExternalInfos(party.partyId, {
				upsert: links
					.filter(
						(link) =>
							link.id === null ||
							savedIds.get(link.id) !== link.externalId.trim(),
					)
					.map((link) => ({
						id: link.id,
						type: link.type,
						externalId: link.externalId.trim(),
					})),
				delete: initial.flatMap((link) =>
					link.id !== null && !keptIds.has(link.id) ? [link.id] : [],
				),
			});
		},
		onSuccess: async () => {
			invalidatePartyEdit(queryClient);
			const saved = await queryClient.query({
				...partyQueries.getParty(party.partyId),
				staleTime: 0,
			});
			setLinks(toDrafts(saved));
			toastManager.add({ title: "Links saved", type: "success" });
		},
	});

	function update(key: string, next: Partial<LinkDraft>) {
		setLinks((current) =>
			current.map((link) => (link.key === key ? { ...link, ...next } : link)),
		);
	}

	return (
		<form
			className="flex max-w-3xl flex-col gap-5"
			onSubmit={(event) => {
				event.preventDefault();
				if (isDirty && !hasBlank) mutation.mutate();
			}}
		>
			<div className="flex flex-col gap-1">
				<h2 className="text-xl font-semibold tracking-tight">Links</h2>
				<p className="text-sm text-muted-foreground">
					Paste a full URL, or just the ID or handle used on that service.
				</p>
			</div>

			{links.length > 0 ? (
				<ul className="flex flex-col gap-3 sm:gap-2">
					{links.map((link) => {
						const label = PARTY_EXTERNAL_INFO_TYPE[link.type];
						return (
							<li
								className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[12rem_minmax(0,1fr)_auto]"
								key={link.key}
							>
								<div className="col-span-2 sm:col-span-1">
									<Select
										// A saved link keeps its service, remove it to use another
										disabled={link.id !== null}
										items={PARTY_EXTERNAL_INFO_TYPE_OPTIONS}
										onValueChange={(option) => {
											if (option) update(link.key, { type: option.value });
										}}
										value={
											PARTY_EXTERNAL_INFO_TYPE_OPTIONS.find(
												(option) => option.value === link.type,
											) ?? null
										}
									>
										<SelectTrigger aria-label="Service">
											<SelectValue />
										</SelectTrigger>
										<SelectPopup>
											{PARTY_EXTERNAL_INFO_TYPE_OPTIONS.map((option) => (
												<SelectItem key={option.value} value={option}>
													{option.label}
												</SelectItem>
											))}
										</SelectPopup>
									</Select>
								</div>
								<Input
									aria-label={`${label} URL or ID`}
									autoComplete="off"
									maxLength={256}
									onChange={(event) =>
										update(link.key, { externalId: event.target.value })
									}
									placeholder="URL, ID or handle"
									value={link.externalId}
								/>
								<Button
									aria-label={`Remove ${label} link`}
									onClick={() =>
										setLinks((current) =>
											current.filter((item) => item.key !== link.key),
										)
									}
									size="icon"
									type="button"
									variant="ghost"
								>
									<Trash2Icon aria-hidden="true" />
								</Button>
							</li>
						);
					})}
				</ul>
			) : (
				<p className="text-sm text-muted-foreground">No links yet.</p>
			)}

			<div>
				<Button
					onClick={() =>
						setLinks((current) => [
							...current,
							{
								key: crypto.randomUUID(),
								id: null,
								type: "OfficialWebsite",
								externalId: "",
							},
						])
					}
					type="button"
					variant="outline"
				>
					<PlusIcon aria-hidden="true" />
					Add link
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
					onClick={() => setLinks(initial)}
					type="button"
					variant="ghost"
				>
					Reset
				</Button>
				<Button
					disabled={!isDirty || hasBlank || mutation.isPending}
					type="submit"
				>
					{mutation.isPending ? "Saving…" : "Save links"}
				</Button>
			</div>
		</form>
	);
}
