import { Graph, layout } from "@dagrejs/dagre";
import type { EdgeLabel, GraphLabel, NodeLabel } from "@dagrejs/dagre";

import type {
	Relationship,
	RelationshipGraph,
	RelationshipParty,
} from "#/lib/queries/party-relationships.queries";

export const NODE_WIDTH = 224;
export const NODE_HEIGHT = 96;
export const RELATIONSHIP_LABEL_ROW_HEIGHT = 22;
export const RELATIONSHIP_LABEL_WIDTH = 160;

export type GraphNode = { party: RelationshipParty; x: number; y: number };
type GraphConnection = {
	sourcePartyId: number;
	targetPartyId: number;
	relationships: Relationship[];
};

export function relationshipLabelHeight(count: number) {
	return count * RELATIONSHIP_LABEL_ROW_HEIGHT + 2;
}

function groupRelationships(relationships: Relationship[]) {
	const connections = new Map<string, GraphConnection>();
	// Stable input ordering keeps the layout independent of API traversal order.
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
		const key = `${Math.min(source, target)}-${Math.max(source, target)}`;
		const connection = connections.get(key);
		if (connection) {
			connection.relationships.push(relationship);
		} else {
			connections.set(key, {
				sourcePartyId: source,
				targetPartyId: target,
				relationships: [relationship],
			});
		}
	}
	return [...connections.values()];
}

export function layoutRelationships(graph: RelationshipGraph) {
	const diagram = new Graph<GraphLabel, NodeLabel, EdgeLabel>();
	diagram.setGraph({
		// Source → target: members/affiliates sit below their groups/organizations.
		rankdir: "BT",
		nodesep: 48,
		edgesep: 32,
		ranksep: 96,
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
				width: RELATIONSHIP_LABEL_WIDTH,
				height: relationshipLabelHeight(connection.relationships.length),
				labelpos: "c",
			},
		);
	}
	// Rank the whole graph, minimize crossings, and reserve space for labels.
	// Dagre routes multi-parent links and cycles without discarding their direction.
	layout(diagram);
	const nodes = new Map<number, GraphNode>();
	for (const party of parties) {
		const position = diagram.node(String(party.partyId));
		nodes.set(Number(party.partyId), {
			party,
			x: position.x! - NODE_WIDTH / 2,
			y: position.y! - NODE_HEIGHT / 2,
		});
	}
	return {
		width: diagram.graph().width!,
		height: diagram.graph().height!,
		nodes,
		connections: connections.map((connection) => {
			const edge = diagram.edge(
				String(connection.sourcePartyId),
				String(connection.targetPartyId),
			);
			const source = nodes.get(connection.sourcePartyId)!;
			const target = nodes.get(connection.targetPartyId)!;
			const forwardArrow =
				target.y === source.y
					? target.x > source.x
						? "→"
						: "←"
					: target.y > source.y
						? "↓"
						: "↑";
			const reverseArrow = { "→": "←", "←": "→", "↓": "↑", "↑": "↓" }[
				forwardArrow
			];
			return {
				...connection,
				bidirectional: connection.relationships.some(
					(relationship) =>
						Number(relationship.sourcePartyId) === connection.targetPartyId,
				),
				path: edge
					.points!.map(
						(point, index) =>
							`${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
					)
					.join(" "),
				x: edge.x!,
				y: edge.y!,
				forwardArrow,
				reverseArrow,
			};
		}),
	};
}
