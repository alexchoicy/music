import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { ListIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "#/components/base/avatar";
import { Button } from "#/components/base/button";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
	DialogTrigger,
} from "#/components/base/dialog";
import { Input } from "#/components/base/input";
import { toastManager } from "#/components/base/toast";
import {
	Tooltip,
	TooltipPopup,
	TooltipTrigger,
} from "#/components/base/tooltip";
import { partyRelationshipMutation } from "#/lib/queries/party-relationships.queries";
import type {
	Relationship,
	RelationshipGraph,
	RelationshipParty,
} from "#/lib/queries/party-relationships.queries";
import { getPartyAvatarUrl } from "#/lib/utils/party";
import { getInitials } from "#/lib/utils/string";

import { RELATIONSHIP_LABEL, RelationshipSwatch } from "./relationshipTypes";

// Below this the whole list is visible at once, so a search box is only noise.
const SEARCH_THRESHOLD = 8;

const createRelationship = partyRelationshipMutation.create().mutationFn;
const deleteRelationship = partyRelationshipMutation.delete().mutationFn;

type Row = {
	edge: Relationship;
	source: RelationshipParty | undefined;
	target: RelationshipParty | undefined;
	sentence: string;
};

function refreshGraphs(queryClient: QueryClient) {
	return queryClient.invalidateQueries({ queryKey: ["party-relationships"] });
}

export function ManageRelationshipsDialog({
	graph,
}: {
	graph: RelationshipGraph;
}) {
	const [search, setSearch] = useState("");
	const focusId = Number(graph.focusPartyId);
	const parties = new Map(
		graph.parties.map((party) => [Number(party.partyId), party]),
	);
	const rows: Row[] = graph.relationships.map((edge) => {
		const source = parties.get(Number(edge.sourcePartyId));
		const target = parties.get(Number(edge.targetPartyId));
		return {
			edge,
			source,
			target,
			sentence: `${source?.name ?? "Unknown party"} ${RELATIONSHIP_LABEL[edge.type].toLowerCase()} ${target?.name ?? "Unknown party"}`,
		};
	});
	const term = search.trim().toLocaleLowerCase();
	const visible = rows.filter((row) =>
		row.sentence.toLocaleLowerCase().includes(term),
	);
	const touchesFocus = (row: Row) =>
		Number(row.edge.sourcePartyId) === focusId ||
		Number(row.edge.targetPartyId) === focusId;
	const direct = visible.filter(touchesFocus);
	const indirect = visible.filter((row) => !touchesFocus(row));
	const focusName = parties.get(focusId)?.name ?? "This party";

	return (
		<Dialog onOpenChange={(open) => !open && setSearch("")}>
			<DialogTrigger
				disabled={rows.length === 0}
				render={<Button variant="outline" />}
			>
				<ListIcon aria-hidden="true" />
				Manage
			</DialogTrigger>
			<DialogPopup>
				<DialogHeader>
					<DialogTitle>Manage relationships</DialogTitle>
					<DialogDescription>
						Removing a relationship keeps both parties in your library.
					</DialogDescription>
					{(rows.length > SEARCH_THRESHOLD || search !== "") && (
						<Input
							aria-label="Search relationships"
							className="mt-2"
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Search by party or relationship…"
							type="search"
							value={search}
						/>
					)}
				</DialogHeader>
				<DialogPanel>
					{visible.length === 0 ? (
						<p className="py-8 text-center text-sm text-muted-foreground">
							{rows.length === 0
								? "No relationships left."
								: "No matching relationships."}
						</p>
					) : (
						<div className="flex flex-col gap-5">
							<RelationshipList heading={focusName} rows={direct} />
							<RelationshipList
								heading={direct.length > 0 ? "Rest of the network" : undefined}
								rows={indirect}
							/>
						</div>
					)}
				</DialogPanel>
			</DialogPopup>
		</Dialog>
	);
}

function RelationshipList({
	heading,
	rows,
}: {
	heading: string | undefined;
	rows: Row[];
}) {
	if (rows.length === 0) return null;
	return (
		<section className="flex flex-col gap-1">
			{heading && (
				<h3 className="text-xs font-medium text-muted-foreground">{heading}</h3>
			)}
			<ul className="flex flex-col">
				{rows.map((row) => (
					<RelationshipRow key={row.edge.relationshipId} row={row} />
				))}
			</ul>
		</section>
	);
}

function RelationshipRow({ row }: { row: Row }) {
	const { edge, source, target, sentence } = row;
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: deleteRelationship,
		onSuccess: async () => {
			const toastId = toastManager.add({
				title: "Relationship removed",
				description: sentence,
				type: "success",
				actionProps: {
					children: "Undo",
					onClick: () => {
						toastManager.close(toastId);
						void createRelationship({
							sourcePartyId: Number(edge.sourcePartyId),
							targetPartyId: edge.targetPartyId,
							type: edge.type,
						})
							.then(() => refreshGraphs(queryClient))
							.catch((error: unknown) => {
								toastManager.add({
									title: "Could not restore relationship",
									description:
										error instanceof Error ? error.message : sentence,
									type: "error",
								});
							});
					},
				},
			});
			await refreshGraphs(queryClient);
		},
		onError: (error) => {
			toastManager.add({
				title: "Could not remove relationship",
				description: error.message,
				type: "error",
			});
		},
	});

	return (
		<li className="flex items-center gap-2 py-1.5">
			<div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
				<PartyName party={source} />
				<span className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<RelationshipSwatch type={edge.type} />
					{RELATIONSHIP_LABEL[edge.type].toLowerCase()}
				</span>
				<PartyName party={target} />
			</div>
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							aria-label={`Remove: ${sentence}`}
							loading={mutation.isPending || mutation.isSuccess}
							onClick={() => mutation.mutate(edge.relationshipId)}
							size="icon-sm"
							variant="ghost"
						/>
					}
				>
					<Trash2Icon aria-hidden="true" />
				</TooltipTrigger>
				<TooltipPopup>Remove</TooltipPopup>
			</Tooltip>
		</li>
	);
}

function PartyName({ party }: { party: RelationshipParty | undefined }) {
	const name = party?.name ?? "Unknown party";
	const avatarUrl = getPartyAvatarUrl(party?.avatarImages);
	return (
		<span className="flex max-w-full min-w-0 items-center gap-2">
			<Avatar className="size-6">
				{avatarUrl && <AvatarImage alt="" loading="lazy" src={avatarUrl} />}
				<AvatarFallback>{getInitials(name)}</AvatarFallback>
			</Avatar>
			<span className="truncate font-medium" title={name}>
				{name}
			</span>
		</span>
	);
}
