import type { RelationshipType } from "#/lib/queries/party-relationships.queries";

// Read as "<source> <label> <target>".
export const RELATIONSHIP_LABEL: Record<RelationshipType, string> = {
	MemberOf: "Member of",
	VoiceActorOf: "Voice actor for",
	AffiliatedWith: "Affiliated with",
};

export const RELATIONSHIP_COLOR: Record<RelationshipType, string> = {
	MemberOf: "var(--color-primary)",
	VoiceActorOf: "var(--color-chart-2)",
	AffiliatedWith: "var(--color-chart-3)",
};

export function RelationshipSwatch({ type }: { type: RelationshipType }) {
	return (
		<span
			aria-hidden="true"
			className="size-1.5 shrink-0 rounded-full"
			style={{ background: RELATIONSHIP_COLOR[type] }}
		/>
	);
}
