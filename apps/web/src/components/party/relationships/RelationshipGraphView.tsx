import { Link } from "@tanstack/react-router";
import { useId, useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "#/components/base/avatar";
import { PARTY_KIND, PARTY_TYPE } from "#/enums/partyEnums";
import type {
	RelationshipGraph,
	RelationshipType,
} from "#/lib/queries/party-relationships.queries";
import { getPartyAvatarUrl } from "#/lib/utils/party";
import { getInitials } from "#/lib/utils/string";
import { cn } from "#/lib/utils/styles";

import { RelationshipCanvas } from "./RelationshipCanvas";
import {
	LABEL_ROW_HEIGHT,
	layoutRelationships,
	NODE_HEIGHT,
	NODE_WIDTH,
} from "./relationshipLayout";

export const RELATIONSHIP_COLOR: Record<RelationshipType, string> = {
	MemberOf: "var(--color-primary)",
	VoiceActorOf: "var(--color-chart-2)",
	AffiliatedWith: "var(--color-chart-4)",
};

// Read as "<source> <label> <target>".
export const RELATIONSHIP_LABEL: Record<RelationshipType, string> = {
	MemberOf: "Member of",
	VoiceActorOf: "Voice actor for",
	AffiliatedWith: "Affiliated with",
};

const MIXED_COLOR = "var(--color-muted-foreground)";

export function RelationshipGraphView({ graph }: { graph: RelationshipGraph }) {
	const markerId = useId().replaceAll(":", "");
	const layout = useMemo(() => layoutRelationships(graph), [graph]);
	const focusId = Number(graph.focusPartyId);
	const focusNode = layout.nodes.get(focusId);
	const [activeId, setActiveId] = useState<number | null>(null);
	const isConnected = (connection: {
		sourcePartyId: number;
		targetPartyId: number;
	}) =>
		activeId === null ||
		connection.sourcePartyId === activeId ||
		connection.targetPartyId === activeId;
	const linkedIds = new Set(
		activeId === null
			? []
			: layout.connections
					.filter(isConnected)
					.flatMap((item) => [item.sourcePartyId, item.targetPartyId]),
	);

	const colors = [
		...new Set([...Object.values(RELATIONSHIP_COLOR), MIXED_COLOR]),
	];

	return (
		<RelationshipCanvas
			focus={
				focusNode
					? {
							x: focusNode.x + NODE_WIDTH / 2,
							y: focusNode.y + NODE_HEIGHT / 2,
						}
					: undefined
			}
			height={layout.height}
			key={graph.focusPartyId}
			width={layout.width}
		>
			<svg
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 overflow-visible"
				height={layout.height}
				width={layout.width}
			>
				<defs>
					{colors.map((color, index) => (
						<marker
							id={`${markerId}-${index}`}
							key={color}
							markerHeight="8"
							markerWidth="8"
							orient="auto-start-reverse"
							refX="7"
							refY="4"
						>
							<path
								d="M 1 1 L 7 4 L 1 7"
								fill="none"
								stroke={color}
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="1.5"
							/>
						</marker>
					))}
				</defs>
				{layout.connections.map((connection) => {
					const types = new Set(
						connection.relationships.map((edge) => edge.type),
					);
					const onlyType = [...types].at(0);
					const color =
						types.size === 1 && onlyType
							? RELATIONSHIP_COLOR[onlyType]
							: MIXED_COLOR;
					return (
						<path
							className="transition-opacity duration-150 motion-reduce:transition-none"
							d={connection.path}
							fill="none"
							key={`${connection.sourcePartyId}-${connection.targetPartyId}`}
							markerEnd={`url(#${markerId}-${colors.indexOf(color)})`}
							opacity={isConnected(connection) ? 0.9 : 0.15}
							stroke={color}
							strokeWidth="1.5"
						/>
					);
				})}
			</svg>

			{layout.connections.map((connection) => {
				const stacked = connection.relationships.length > 1;
				return (
					<div
						className={cn(
							"pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col bg-popover px-2.5 shadow-pop transition-opacity duration-150 motion-reduce:transition-none",
							stacked ? "rounded-lg py-1" : "rounded-full",
							!isConnected(connection) && "opacity-25",
						)}
						key={`${connection.sourcePartyId}-${connection.targetPartyId}`}
						style={{ left: connection.x, top: connection.y }}
					>
						{connection.relationships.map((edge) => (
							<span
								className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap"
								key={edge.relationshipId}
								style={{ height: LABEL_ROW_HEIGHT }}
							>
								<span
									aria-hidden="true"
									className="size-1.5 rounded-full"
									style={{ background: RELATIONSHIP_COLOR[edge.type] }}
								/>
								{RELATIONSHIP_LABEL[edge.type]}
							</span>
						))}
					</div>
				);
			})}

			{[...layout.nodes.entries()].map(([partyId, node]) => {
				const avatarUrl = getPartyAvatarUrl(node.party.avatarImages);
				const isFocus = partyId === focusId;
				const meta = [
					node.party.type ? PARTY_TYPE[node.party.type] : null,
					node.party.kind !== "Human" ? PARTY_KIND[node.party.kind] : null,
				]
					.filter(Boolean)
					.join(" · ");
				return (
					<Link
						aria-current={isFocus ? "page" : undefined}
						className={cn(
							"absolute flex items-center gap-3 rounded-xl bg-popover px-3 shadow-pop transition-[opacity,box-shadow] duration-150 outline-none hover:shadow-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none",
							isFocus && "shadow-glow-primary hover:shadow-glow-primary",
							activeId !== null &&
								!linkedIds.has(partyId) &&
								partyId !== activeId &&
								"opacity-40",
						)}
						draggable={false}
						key={partyId}
						onBlur={() => setActiveId(null)}
						onFocus={() => setActiveId(partyId)}
						onPointerEnter={() => setActiveId(partyId)}
						onPointerLeave={() => setActiveId(null)}
						params={{ id: String(partyId) }}
						style={{
							left: node.x,
							top: node.y,
							width: NODE_WIDTH,
							height: NODE_HEIGHT,
						}}
						to="/parties/$id"
					>
						<Avatar size="md">
							{avatarUrl && <AvatarImage alt="" src={avatarUrl} />}
							<AvatarFallback>{getInitials(node.party.name)}</AvatarFallback>
						</Avatar>
						<span className="flex min-w-0 flex-col">
							<span
								className={cn(
									"truncate text-sm font-semibold",
									isFocus && "text-primary",
								)}
								title={node.party.name}
							>
								{node.party.name}
							</span>
							{meta && (
								<span className="truncate text-xs text-muted-foreground">
									{meta}
								</span>
							)}
						</span>
					</Link>
				);
			})}
		</RelationshipCanvas>
	);
}
