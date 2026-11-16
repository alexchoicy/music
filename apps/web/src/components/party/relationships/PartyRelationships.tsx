import type * as API from "@music/api";
import { useQuery } from "@tanstack/react-query";
import { GitForkIcon, NetworkIcon } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "#/components/base/alert";
import { Button } from "#/components/base/button";
import { Spinner } from "#/components/base/spinner";
import { Toggle } from "#/components/base/toggle";
import {
	Tooltip,
	TooltipPopup,
	TooltipTrigger,
} from "#/components/base/tooltip";
import { LibraryEmptyState } from "#/components/library/LibraryStates";
import { partyRelationshipQueries } from "#/lib/queries/party-relationships.queries";

import { AddRelationshipDialog } from "./AddRelationshipDialog";
import { ManageRelationshipsDialog } from "./ManageRelationshipsDialog";
import { RelationshipGraphView } from "./RelationshipGraphView";
import { directRelationships } from "./relationshipLayout";
import { RELATIONSHIP_LABEL } from "./relationshipTypes";

function plural(count: number, noun: string, nouns = `${noun}s`) {
	return `${count} ${count === 1 ? noun : nouns}`;
}

export function PartyRelationships({ party }: { party: API.PartyDetails }) {
	const focusId = Number(party.partyId);
	const query = useQuery(partyRelationshipQueries.graph(focusId));
	const graph = query.data;
	const [directOnly, setDirectOnly] = useState(false);

	const all = graph?.relationships ?? [];
	const hasIndirect = all.some(
		(edge) =>
			Number(edge.sourcePartyId) !== focusId &&
			Number(edge.targetPartyId) !== focusId,
	);
	const visible =
		graph && directOnly && hasIndirect ? directRelationships(graph) : graph;
	const names = new Map(
		graph?.parties.map((item) => [Number(item.partyId), item.name]),
	);

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
					{visible && all.length > 0 && (
						<p className="text-xs text-muted-foreground">
							{plural(visible.parties.length, "party", "parties")} ·{" "}
							{plural(visible.relationships.length, "relationship")}
							{visible.relationships.length < all.length && ` of ${all.length}`}
						</p>
					)}
				</div>
				<div className="flex flex-wrap gap-2">
					{graph && <ManageRelationshipsDialog graph={graph} />}
					<AddRelationshipDialog graph={graph} party={party} />
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
			{visible &&
				(all.length === 0 ? (
					<LibraryEmptyState
						description={`Add groups, members or voice roles to map how ${party.name} connects to other parties.`}
						icon={<GitForkIcon aria-hidden="true" />}
						title="No relationships yet"
					/>
				) : (
					<>
						<RelationshipGraphView
							controls={
								hasIndirect && (
									<Tooltip>
										<TooltipTrigger
											render={
												<Toggle
													aria-label="Direct relationships only"
													onPressedChange={setDirectOnly}
													pressed={directOnly}
													size="sm"
												/>
											}
										>
											<NetworkIcon aria-hidden="true" />
										</TooltipTrigger>
										<TooltipPopup>Direct relationships only</TooltipPopup>
									</Tooltip>
								)
							}
							graph={visible}
						/>
						<ul aria-label="All relationships" className="sr-only">
							{visible.relationships.map((edge) => (
								<li key={edge.relationshipId}>
									{names.get(Number(edge.sourcePartyId))}{" "}
									{RELATIONSHIP_LABEL[edge.type].toLowerCase()}{" "}
									{names.get(Number(edge.targetPartyId))}
								</li>
							))}
						</ul>
					</>
				))}
		</section>
	);
}
