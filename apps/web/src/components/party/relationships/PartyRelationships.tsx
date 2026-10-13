import { useQuery } from "@tanstack/react-query";
import { GitForkIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "#/components/base/alert";
import { Button } from "#/components/base/button";
import { Spinner } from "#/components/base/spinner";
import { toastManager } from "#/components/base/toast";
import { LibraryEmptyState } from "#/components/library/LibraryStates";
import type { components } from "#/data/APIschema";
import { partyRelationshipQueries } from "#/lib/queries/party-relationships.queries";
import type { RelationshipType } from "#/lib/queries/party-relationships.queries";
import { AddRelationshipDialog } from "#/old-components/parties/AddRelationshipDialog";
import { ManageRelationshipsDialog } from "#/old-components/parties/ManageRelationshipsDialog";

import {
	RELATIONSHIP_COLOR,
	RELATIONSHIP_LABEL,
	RelationshipGraphView,
} from "./RelationshipGraphView";

function plural(count: number, noun: string, nouns = `${noun}s`) {
	return `${count} ${count === 1 ? noun : nouns}`;
}

export function PartyRelationships({
	party,
}: {
	party: components["schemas"]["PartyDetails"];
}) {
	const [anchorId, setAnchorId] = useState(Number(party.partyId));
	const [adding, setAdding] = useState(false);
	const query = useQuery(partyRelationshipQueries.graph(anchorId));
	const graph = query.data;
	const anchor = graph?.parties.find(
		(item) => Number(item.partyId) === anchorId,
	);
	const names = new Map(
		graph?.parties.map((item) => [Number(item.partyId), item.name]),
	);
	const types = [
		...new Set(graph?.relationships.map((edge) => edge.type) ?? []),
	] as RelationshipType[];

	return (
		<section
			aria-labelledby="party-relationships"
			className="flex flex-col gap-4"
		>
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div className="flex flex-col gap-1">
					<h2
						className="text-xl font-semibold tracking-[-.01em]"
						id="party-relationships"
					>
						Relationships
					</h2>
					{graph && graph.relationships.length > 0 && (
						<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
							<span>
								{plural(graph.parties.length, "party", "parties")} ·{" "}
								{plural(graph.relationships.length, "relationship")}
							</span>
							<ul
								aria-label="Legend"
								className="flex flex-wrap gap-x-3 gap-y-1"
							>
								{types.map((type) => (
									<li className="flex items-center gap-1.5" key={type}>
										<span
											aria-hidden="true"
											className="h-0.5 w-3 rounded-full"
											style={{ background: RELATIONSHIP_COLOR[type] }}
										/>
										{RELATIONSHIP_LABEL[type]}
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
				<div className="flex flex-wrap gap-2">
					{graph && graph.relationships.length > 0 && (
						<ManageRelationshipsDialog graph={graph} />
					)}
					<Button onClick={() => setAdding(true)}>
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
					<AlertTitle>Could not load relationships</AlertTitle>
					<AlertDescription>
						{query.error.message}{" "}
						<Button
							onClick={() => void query.refetch()}
							size="sm"
							variant="outline"
						>
							Try again
						</Button>
					</AlertDescription>
				</Alert>
			)}
			{graph &&
				(graph.relationships.length === 0 ? (
					<LibraryEmptyState
						description={`Add groups, members or voice roles to map how ${party.name} connects to other parties.`}
						icon={<GitForkIcon aria-hidden="true" />}
						title="No relationships yet"
					/>
				) : (
					<>
						<RelationshipGraphView graph={graph} />
						<ul aria-label="All relationships" className="sr-only">
							{graph.relationships.map((edge) => (
								<li key={edge.relationshipId}>
									{names.get(Number(edge.sourcePartyId))}{" "}
									{RELATIONSHIP_LABEL[edge.type].toLowerCase()}{" "}
									{names.get(Number(edge.targetPartyId))}
								</li>
							))}
						</ul>
					</>
				))}

			{adding && (
				<AddRelationshipDialog
					initialParty={{ partyId: anchorId, name: anchor?.name ?? party.name }}
					onClose={() => setAdding(false)}
					onCreated={(sourceId) => {
						setAnchorId(sourceId);
						setAdding(false);
						toastManager.add({ title: "Relationship added", type: "success" });
					}}
				/>
			)}
		</section>
	);
}
