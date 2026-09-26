import { Link } from "@tanstack/react-router";
import { useId, useMemo } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "#/components/coss/avatar";
import { relationshipLabels } from "#/lib/queries/party-relationships.queries";
import type {
	RelationshipGraph,
	RelationshipType,
} from "#/lib/queries/party-relationships.queries";
import { getPartyAvatarUrl } from "#/lib/utils/party";
import { getInitials } from "#/lib/utils/string";

import {
	layoutRelationships,
	NODE_HEIGHT,
	NODE_WIDTH,
	relationshipLabelHeight,
	RELATIONSHIP_LABEL_ROW_HEIGHT,
	RELATIONSHIP_LABEL_WIDTH,
} from "./relationship-graph-layout";
import { RelationshipGraphCanvas } from "./RelationshipGraphCanvas";

const relationshipColors: Record<RelationshipType | "multiple", string> = {
	MemberOf: "var(--color-primary)",
	VoiceActorOf: "var(--color-chart-2)",
	AffiliatedWith: "var(--color-chart-4)",
	multiple: "var(--color-muted-foreground)",
};

export function PartyRelationshipGraph({
	graph,
}: {
	graph: RelationshipGraph;
}) {
	const id = useId().replaceAll(":", "");
	const layout = useMemo(() => layoutRelationships(graph), [graph]);
	const focus = layout.nodes.get(Number(graph.focusPartyId));

	return (
		<RelationshipGraphCanvas
			key={graph.focusPartyId}
			width={layout.width}
			height={layout.height}
			focus={focus}
		>
			<svg
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 overflow-visible"
				height={layout.height}
				width={layout.width}
			>
				<defs>
					{Object.entries(relationshipColors).map(([type, color]) => (
						<marker
							id={`${id}-${type}`}
							key={type}
							markerHeight="7"
							markerWidth="7"
							orient="auto-start-reverse"
							refX="7"
							refY="3.5"
						>
							<path d="M 0 0 L 7 3.5 L 0 7 Z" fill={color} />
						</marker>
					))}
				</defs>
				{layout.connections.map((connection) => {
					const { relationships } = connection;
					const colorType =
						relationships.length === 1 ? relationships[0].type : "multiple";
					return (
						<path
							key={`${connection.sourcePartyId}-${connection.targetPartyId}`}
							d={connection.path}
							fill="none"
							markerEnd={`url(#${id}-${colorType})`}
							stroke={relationshipColors[colorType]}
							strokeWidth="1.75"
							strokeLinejoin="round"
						/>
					);
				})}

				{layout.connections.map((connection) => {
					const { relationships } = connection;
					const labelHeight = relationshipLabelHeight(relationships.length);
					const labelLeft = connection.x - RELATIONSHIP_LABEL_WIDTH / 2;
					return (
						<g key={`${connection.sourcePartyId}-${connection.targetPartyId}`}>
							<rect
								className="fill-card stroke-border"
								height={labelHeight}
								rx="12"
								width={RELATIONSHIP_LABEL_WIDTH}
								x={labelLeft}
								y={connection.y - labelHeight / 2}
							/>
							{relationships.map((edge, index) => {
								const label =
									edge.type === "VoiceActorOf"
										? "Voice actor for"
										: relationshipLabels[edge.type];
								const y =
									connection.y +
									(index - (relationships.length - 1) / 2) *
										RELATIONSHIP_LABEL_ROW_HEIGHT;
								return (
									<g key={edge.relationshipId}>
										<circle
											cx={labelLeft + 14}
											cy={y}
											r="3"
											fill={relationshipColors[edge.type]}
										/>
										<text
											className="fill-foreground text-[11px]"
											dominantBaseline="middle"
											x={labelLeft + 25}
											y={y}
										>
											{label}
										</text>
									</g>
								);
							})}
						</g>
					);
				})}
			</svg>
			{[...layout.nodes.entries()].map(([partyId, node]) => {
				const avatarUrl = getPartyAvatarUrl(node.party.avatarImages);
				return (
					<Link
						aria-label={`Open ${node.party.name}`}
						aria-current={
							partyId === Number(graph.focusPartyId) ? "page" : undefined
						}
						draggable={false}
						className="absolute flex items-center gap-3 rounded-xl border bg-card px-4 text-left shadow-sm transition-shadow hover:ring-2 hover:ring-ring/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-[current=page]:border-primary aria-[current=page]:ring-2 aria-[current=page]:ring-primary/25"
						key={partyId}
						params={{ id: String(partyId) }}
						to="/parties/$id"
						style={{
							left: node.x,
							top: node.y,
							width: NODE_WIDTH,
							height: NODE_HEIGHT,
						}}
					>
						<Avatar>
							<AvatarImage alt="" src={avatarUrl ?? undefined} />
							<AvatarFallback>{getInitials(node.party.name)}</AvatarFallback>
						</Avatar>
						<span className="flex min-w-0 flex-1 flex-col gap-1">
							<span
								className="truncate text-sm font-semibold"
								title={node.party.name}
							>
								{node.party.name}
							</span>
							<span className="text-xs text-muted-foreground">
								{node.party.type}
							</span>
						</span>
					</Link>
				);
			})}
		</RelationshipGraphCanvas>
	);
}
