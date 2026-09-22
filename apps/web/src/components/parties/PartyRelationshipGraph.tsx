import { Link } from "@tanstack/react-router";
import { useEffect, useId, useMemo, useRef } from "react";

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
	relationshipPath,
	relationshipLabelHeight,
	RELATIONSHIP_LABEL_ROW_HEIGHT,
} from "./relationship-graph-layout";

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
	const viewport = useRef<HTMLDivElement>(null);
	const layout = useMemo(
		() => layoutRelationships(graph, Number(graph.focusPartyId)),
		[graph],
	);
	const focus = layout.nodes.get(Number(graph.focusPartyId));

	useEffect(() => {
		const container = viewport.current;
		if (!container || !focus) return;
		container.scrollLeft = focus.x + NODE_WIDTH / 2 - container.clientWidth / 2;
	}, [focus]);

	return (
		<div
			aria-label="Relationship graph"
			className="min-h-[65vh] overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-ring"
			ref={viewport}
			role="region"
			style={{
				backgroundImage:
					"radial-gradient(var(--color-border) 1px, transparent 1px)",
				backgroundSize: "20px 20px",
			}}
			tabIndex={0}
		>
			<div
				className="relative mx-auto"
				style={{ width: layout.width, height: layout.height }}
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
						const line = relationshipPath(connection, layout.nodes);
						if (!line) return null;
						const { relationships } = connection;
						const hasForward = relationships.some(
							(edge) => Number(edge.sourcePartyId) === connection.sourcePartyId,
						);
						const hasReverse = relationships.some(
							(edge) => Number(edge.sourcePartyId) === connection.targetPartyId,
						);
						const bidirectional = hasForward && hasReverse;
						const colorType =
							relationships.length === 1 ? relationships[0].type : "multiple";
						const labelHeight = relationshipLabelHeight(relationships.length);
						const labelWidth = bidirectional ? 160 : 140;
						const labelLeft = line.x - labelWidth / 2;
						return (
							<g
								key={`${connection.sourcePartyId}-${connection.targetPartyId}`}
							>
								<path
									d={line.path}
									fill="none"
									markerStart={
										hasReverse ? `url(#${id}-${colorType})` : undefined
									}
									markerEnd={
										hasForward ? `url(#${id}-${colorType})` : undefined
									}
									stroke={relationshipColors[colorType]}
									strokeWidth="1.75"
								/>
								<rect
									className="fill-card stroke-border"
									height={labelHeight}
									rx="12"
									width={labelWidth}
									x={labelLeft}
									y={line.y - labelHeight / 2}
								/>
								{relationships.map((edge, index) => {
									const label =
										edge.type === "VoiceActorOf"
											? "Voice actor for"
											: relationshipLabels[edge.type];
									const y =
										line.y +
										(index - (relationships.length - 1) / 2) *
											RELATIONSHIP_LABEL_ROW_HEIGHT;
									const arrow =
										Number(edge.sourcePartyId) === connection.sourcePartyId
											? line.forwardArrow
											: line.reverseArrow;
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
												{bidirectional ? `${arrow} ${label}` : label}
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
							className="absolute flex items-center gap-3 rounded-xl border bg-card px-4 text-left shadow-sm transition-shadow hover:ring-2 hover:ring-ring/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
			</div>
		</div>
	);
}
