import { Graph, layout } from "@dagrejs/dagre";
import type { EdgeLabel, GraphLabel, NodeLabel } from "@dagrejs/dagre";

import type {
	Relationship,
	RelationshipGraph,
	RelationshipParty,
} from "#/lib/queries/party-relationships.queries";

export const NODE_WIDTH = 208;
export const NODE_HEIGHT = 64;
export const LABEL_ROW_HEIGHT = 24;
const STACKED_LABEL_PADDING = 8;
export const LABEL_WIDTH = 148;

export type LayoutNode = { party: RelationshipParty; x: number; y: number };
export type LayoutConnection = {
	sourcePartyId: number;
	targetPartyId: number;
	relationships: Relationship[];
	path: string;
	x: number;
	y: number;
};

type Point = { x: number; y: number };

// Relationships between the same two parties share one line and one label.
function groupRelationships(relationships: Relationship[]) {
	const connections = new Map<
		string,
		Pick<LayoutConnection, "sourcePartyId" | "targetPartyId" | "relationships">
	>();
	// Stable ordering keeps the layout independent of API traversal order.
	const ordered = [...relationships].sort(
		(a, b) =>
			Number(a.sourcePartyId) - Number(b.sourcePartyId) ||
			Number(a.targetPartyId) - Number(b.targetPartyId) ||
			a.type.localeCompare(b.type) ||
			a.relationshipId.localeCompare(b.relationshipId),
	);
	for (const relationship of ordered) {
		const source = Number(relationship.sourcePartyId);
		const target = Number(relationship.targetPartyId);
		const key = `${source}-${target}`;
		const connection = connections.get(key);
		if (connection) connection.relationships.push(relationship);
		else
			connections.set(key, {
				sourcePartyId: source,
				targetPartyId: target,
				relationships: [relationship],
			});
	}
	return [...connections.values()];
}

// Smooth vertical curves through the routed points, so lines leave and enter
// cards straight up or down.
function curvePath(points: Point[]) {
	const first = points.at(0);
	if (!first) return "";
	const rest = points.slice(1);
	let path = `M ${first.x} ${first.y}`;
	let previous = first;
	for (const point of rest) {
		const middle = (previous.y + point.y) / 2;
		path += ` C ${previous.x} ${middle} ${point.x} ${middle} ${point.x} ${point.y}`;
		previous = point;
	}
	return path;
}

// Space reserved for a line's label, so dagre keeps cards clear of it.
function labelHeight(count: number) {
	return count * LABEL_ROW_HEIGHT + (count > 1 ? STACKED_LABEL_PADDING : 0);
}

// Lays the graph out top to bottom: a relationship's target (the group, or the
// character voiced) sits above its source.
export function layoutRelationships(graph: RelationshipGraph) {
	const diagram = new Graph<GraphLabel, NodeLabel, EdgeLabel>();
	diagram.setGraph({
		rankdir: "BT",
		nodesep: 32,
		edgesep: 24,
		ranksep: 56,
		marginx: 48,
		marginy: 48,
	});
	const parties = [...graph.parties].sort(
		(a, b) =>
			a.name.localeCompare(b.name) || Number(a.partyId) - Number(b.partyId),
	);
	for (const party of parties) {
		diagram.setNode(String(party.partyId), {
			width: NODE_WIDTH,
			height: NODE_HEIGHT,
		});
	}
	const connections = groupRelationships(graph.relationships);
	for (const connection of connections) {
		diagram.setEdge(
			String(connection.sourcePartyId),
			String(connection.targetPartyId),
			{
				width: LABEL_WIDTH,
				height: labelHeight(connection.relationships.length),
				labelpos: "c",
			},
		);
	}
	layout(diagram);

	const nodes = new Map<number, LayoutNode>();
	for (const party of parties) {
		const position = diagram.node(String(party.partyId));
		nodes.set(Number(party.partyId), {
			party,
			x: (position.x ?? 0) - NODE_WIDTH / 2,
			y: (position.y ?? 0) - NODE_HEIGHT / 2,
		});
	}

	return {
		width: diagram.graph().width ?? 0,
		height: diagram.graph().height ?? 0,
		nodes,
		connections: connections.map((connection): LayoutConnection => {
			const edge = diagram.edge(
				String(connection.sourcePartyId),
				String(connection.targetPartyId),
			);
			return {
				...connection,
				path: curvePath(edge.points ?? []),
				x: edge.x ?? 0,
				y: edge.y ?? 0,
			};
		}),
	};
}
