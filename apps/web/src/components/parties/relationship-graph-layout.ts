import type {
	Relationship,
	RelationshipGraph,
	RelationshipParty,
} from "#/lib/queries/party-relationships.queries";

export const NODE_WIDTH = 224;
export const NODE_HEIGHT = 96;
const COLUMN_GAP = 64;
const ROW_GAP = 128;
const PADDING = 80;
export const RELATIONSHIP_LABEL_ROW_HEIGHT = 22;

export type GraphNode = { party: RelationshipParty; x: number; y: number };
export type GraphConnection = {
	sourcePartyId: number;
	targetPartyId: number;
	relationships: Relationship[];
};

export function relationshipLabelHeight(count: number) {
	return count * RELATIONSHIP_LABEL_ROW_HEIGHT + 2;
}

export function groupRelationships(relationships: Relationship[]) {
	const connections = new Map<string, GraphConnection>();
	for (const relationship of relationships) {
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

export function layoutRelationships(graph: RelationshipGraph, focusId: number) {
	const connections = groupRelationships(graph.relationships);
	const maxLabelHeight = Math.max(
		24,
		...connections.map((connection) =>
			relationshipLabelHeight(connection.relationships.length),
		),
	);
	const rowGap = Math.max(ROW_GAP, maxLabelHeight + 64);
	const padding = Math.max(PADDING, maxLabelHeight + 40);
	const levels = new Map<number, number>([[focusId, 0]]);
	const neighbours = new Map<number, { id: number; step: number }[]>();
	for (const edge of connections) {
		const source = Number(edge.sourcePartyId);
		const target = Number(edge.targetPartyId);
		neighbours.set(source, [
			...(neighbours.get(source) ?? []),
			{ id: target, step: -1 },
		]);
		neighbours.set(target, [
			...(neighbours.get(target) ?? []),
			{ id: source, step: 1 },
		]);
	}
	const queue = [focusId];
	for (const id of queue) {
		for (const neighbour of neighbours.get(id) ?? []) {
			if (levels.has(neighbour.id)) continue;
			levels.set(neighbour.id, (levels.get(id) ?? 0) + neighbour.step);
			queue.push(neighbour.id);
		}
	}
	const rows = new Map<number, RelationshipParty[]>();
	for (const party of graph.parties) {
		const level = levels.get(Number(party.partyId)) ?? 0;
		rows.set(level, [...(rows.get(level) ?? []), party]);
	}
	const orderedRows = [...rows.entries()].sort(([a], [b]) => a - b);
	const columns = Math.max(
		1,
		...orderedRows.map(([, parties]) => parties.length),
	);
	const width = PADDING * 2 + columns * NODE_WIDTH + (columns - 1) * COLUMN_GAP;
	const height =
		padding * 2 +
		orderedRows.length * NODE_HEIGHT +
		Math.max(0, orderedRows.length - 1) * rowGap;
	const nodes = new Map<number, GraphNode>();
	orderedRows.forEach(([, parties], row) => {
		const sorted = [...parties].sort(
			(a, b) =>
				a.name.localeCompare(b.name) || Number(a.partyId) - Number(b.partyId),
		);
		const focusIndex = sorted.findIndex(
			(party) => Number(party.partyId) === focusId,
		);
		if (focusIndex >= 0)
			sorted.splice(
				Math.floor(sorted.length / 2),
				0,
				...sorted.splice(focusIndex, 1),
			);
		const rowWidth =
			sorted.length * NODE_WIDTH + (sorted.length - 1) * COLUMN_GAP;
		sorted.forEach((party, column) =>
			nodes.set(Number(party.partyId), {
				party,
				x: (width - rowWidth) / 2 + column * (NODE_WIDTH + COLUMN_GAP),
				y: padding + row * (NODE_HEIGHT + rowGap),
			}),
		);
	});
	return { width, height, nodes, connections };
}

export function relationshipPath(
	edge: GraphConnection,
	nodes: Map<number, GraphNode>,
) {
	const source = nodes.get(Number(edge.sourcePartyId));
	const target = nodes.get(Number(edge.targetPartyId));
	if (!source || !target) return null;
	const sx = source.x + NODE_WIDTH / 2;
	const tx = target.x + NODE_WIDTH / 2;
	if (source.y === target.y) {
		const clearance =
			relationshipLabelHeight(edge.relationships.length) / 2 + 24;
		const arcY = source.y - clearance / 0.75;
		return {
			path: `M ${sx} ${source.y} C ${sx} ${arcY}, ${tx} ${arcY}, ${tx} ${target.y}`,
			x: (sx + tx) / 2,
			y: source.y - clearance,
			forwardArrow: target.x > source.x ? "→" : "←",
			reverseArrow: target.x > source.x ? "←" : "→",
		};
	}
	const goingDown = target.y > source.y;
	const sy = source.y + (goingDown ? NODE_HEIGHT : 0);
	const ty = target.y + (goingDown ? 0 : NODE_HEIGHT);
	const middle = (sy + ty) / 2;
	return {
		path: `M ${sx} ${sy} C ${sx} ${middle}, ${tx} ${middle}, ${tx} ${ty}`,
		x: (sx + tx) / 2,
		y: middle,
		forwardArrow: goingDown ? "↓" : "↑",
		reverseArrow: goingDown ? "↑" : "↓",
	};
}
