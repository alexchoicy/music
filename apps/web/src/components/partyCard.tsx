import { Link } from "@tanstack/react-router";
import { User } from "lucide-react";
import type { components } from "@/data/APIschema";
import { Badge } from "./shadcn/badge";
import { Card } from "./shadcn/card";

type PartyCardProps = {
	party: components["schemas"]["PartyModel"];
};

export function PartyCard({ party }: PartyCardProps) {
	return (
		<Link to="/parties/$id" params={{ id: party.partyId.toString() }}>
			<Card className="relative mx-auto w-full max-w-96 pt-0">
				{party.avatarImages && party.avatarImages.length > 0 ? (
					<div className="relative aspect-square overflow-hidden bg-muted">
						<img
							src={party.avatarImages?.[0]?.url}
							alt={`${party.partyName}`}
							className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
						/>
						<Badge className="absolute right-2 top-2 bg-black/60 backdrop-blur-sm">
							{party.type}
						</Badge>
					</div>
				) : (
					<div className="relative aspect-square overflow-hidden bg-muted">
						<User className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
						<Badge className="absolute right-2 top-2 bg-black/60 backdrop-blur-sm">
							{party.type}
						</Badge>
					</div>
				)}
				<div className="space-y-2 pl-4">
					<h3 className="line-clamp-2 text-balance font-semibold leading-tight">
						{party.partyName}
					</h3>
				</div>
			</Card>
		</Link>
	);
}
