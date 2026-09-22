import { useQuery } from "@tanstack/react-query";
import { GitForkIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "#/components/coss/alert";
import { Button } from "#/components/coss/button";
import { Spinner } from "#/components/coss/spinner";
import { toastManager } from "#/components/coss/toast";
import type { components } from "#/data/APIschema";
import {
	partyRelationshipQueries,
	relationshipLabels,
} from "#/lib/queries/party-relationships.queries";

import { AddRelationshipDialog } from "./AddRelationshipDialog";
import { ManageRelationshipsDialog } from "./ManageRelationshipsDialog";
import { PartyRelationshipGraph } from "./PartyRelationshipGraph";

export function PartyRelationships({
	party,
}: {
	party: components["schemas"]["PartyDetails"];
}) {
	const [anchorId, setAnchorId] = useState(Number(party.partyId));
	const [dialogOpen, setDialogOpen] = useState(false);
	const query = useQuery(partyRelationshipQueries.graph(anchorId));
	const graph = query.data;
	const anchor = graph?.parties.find(
		(item) => Number(item.partyId) === anchorId,
	);
	const initialParty = { partyId: anchorId, name: anchor?.name ?? party.name };
	const names = new Map(
		graph?.parties.map((item) => [Number(item.partyId), item.name]),
	);

	return (
		<section className="flex flex-col gap-5">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex flex-col gap-1">
					<h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
						<GitForkIcon
							aria-hidden="true"
							className="size-5 text-muted-foreground"
						/>
						Relationships
					</h2>
					{graph && (
						<p className="text-sm text-muted-foreground">
							{graph.parties.length}{" "}
							{graph.parties.length === 1 ? "party" : "parties"} ·{" "}
							{graph.relationships.length}{" "}
							{graph.relationships.length === 1
								? "relationship"
								: "relationships"}
						</p>
					)}
				</div>
				<div className="flex flex-wrap gap-2">
					{graph && <ManageRelationshipsDialog graph={graph} />}
					<Button onClick={() => setDialogOpen(true)} type="button">
						<PlusIcon aria-hidden="true" />
						Add relationship
					</Button>
				</div>
			</div>
			{query.isPending && (
				<div
					className="flex min-h-80 items-center justify-center gap-2 text-sm text-muted-foreground"
					role="status"
				>
					<Spinner />
					Loading relationships…
				</div>
			)}
			{query.isError && (
				<Alert variant="error">
					<AlertTitle>Unable to load relationships</AlertTitle>
					<AlertDescription>
						{query.error.message}
						<div>
							<Button
								onClick={() => void query.refetch()}
								size="sm"
								type="button"
								variant="outline"
							>
								Try again
							</Button>
						</div>
					</AlertDescription>
				</Alert>
			)}
			{graph && (
				<>
					{graph.relationships.length === 0 && (
						<p className="text-sm text-muted-foreground">
							No relationships yet. Add one to start this party’s graph.
						</p>
					)}
					<PartyRelationshipGraph graph={graph} />
					{graph.relationships.length > 0 && (
						<ul aria-label="All relationships" className="sr-only">
							{graph.relationships.map((edge) => (
								<li key={edge.relationshipId}>
									{names.get(Number(edge.sourcePartyId))} →{" "}
									{relationshipLabels[edge.type]} →{" "}
									{names.get(Number(edge.targetPartyId))}
								</li>
							))}
						</ul>
					)}
				</>
			)}
			{dialogOpen && (
				<AddRelationshipDialog
					initialParty={initialParty}
					onClose={() => setDialogOpen(false)}
					onCreated={(sourceId) => {
						setAnchorId(sourceId);
						setDialogOpen(false);
						toastManager.add({ title: "Relationship added", type: "success" });
					}}
				/>
			)}
		</section>
	);
}
