import { Link } from "@tanstack/react-router";
import { ListEndIcon, PlayIcon, ShuffleIcon, UserIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "#/components/base/avatar";
import { Badge } from "#/components/base/badge";
import {
	ContextMenu,
	ContextMenuItem,
	ContextMenuLinkItem,
	ContextMenuPopup,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "#/components/base/context-menu";
import { usePlayParty } from "#/components/party/usePlayParty";
import type { components } from "#/data/APIschema";
import { COUNTRY_CODE, PARTY_KIND, PARTY_TYPE } from "#/enums/partyEnums";
import { getInitials } from "#/lib/utils/string";
import { cn } from "#/lib/utils/styles";

type Party = components["schemas"]["PartyItems"];

type PartyTileProps = {
	party: Party;
	className?: string;
	variant?: "home" | "library";
};

export function PartyTile({
	party,
	className,
	variant = "home",
}: PartyTileProps) {
	const playParty = usePlayParty();
	const isLibrary = variant === "library";
	const albumCount = Number(party.albumCount);
	const countLabel = isLibrary
		? albumCount === 0
			? "No albums"
			: `${albumCount} ${albumCount === 1 ? "album" : "albums"}`
		: `${albumCount} ${albumCount === 1 ? "release" : "releases"}`;
	const showKind = isLibrary && party.kind !== "Human";
	const meta = [
		COUNTRY_CODE[party.country],
		party.type ? PARTY_TYPE[party.type] : null,
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<ContextMenu>
			<ContextMenuTrigger
				render={
					<Link
						className={cn(
							"group/tile flex min-w-0 flex-col items-center gap-3 rounded-xl pb-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
							className,
						)}
						params={{ id: String(party.partyId) }}
						to="/parties/$id"
					/>
				}
			>
				<span className="relative transition-transform duration-150 ease-out group-hover/tile:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover/tile:translate-y-0">
					<Avatar size={isLibrary ? "portrait-lg" : "portrait"}>
						{party.coverUrl && (
							<AvatarImage alt="" loading="lazy" src={party.coverUrl} />
						)}
						<AvatarFallback>{getInitials(party.name)}</AvatarFallback>
					</Avatar>
					<span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_--theme(--color-white/8%)]" />
					{showKind && (
						<Badge
							className="absolute -bottom-3 left-1/2 -translate-x-1/2"
							size="tag"
							variant="artwork"
						>
							{PARTY_KIND[party.kind]}
						</Badge>
					)}
				</span>
				<span
					className={cn(
						"flex max-w-full min-w-0 flex-col items-center gap-0.5 text-center",
						showKind && "mt-3",
					)}
				>
					<span
						className="max-w-full truncate text-sm font-semibold"
						title={party.name}
					>
						{party.name}
					</span>
					{meta && (
						<span className="max-w-full truncate text-xs text-muted-foreground">
							{meta}
						</span>
					)}
					<span className="text-xs text-muted-foreground">{countLabel}</span>
				</span>
			</ContextMenuTrigger>
			<ContextMenuPopup className="w-52">
				<ContextMenuItem
					disabled={albumCount === 0}
					onClick={() => void playParty(party)}
				>
					<PlayIcon aria-hidden="true" />
					Play all
				</ContextMenuItem>
				<ContextMenuItem
					disabled={albumCount === 0}
					onClick={() => void playParty(party, { shuffle: true })}
				>
					<ShuffleIcon aria-hidden="true" />
					Shuffle
				</ContextMenuItem>
				<ContextMenuItem
					disabled={albumCount === 0}
					onClick={() => void playParty(party, { queue: true })}
				>
					<ListEndIcon aria-hidden="true" />
					Add to queue
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuLinkItem
					render={
						<Link params={{ id: String(party.partyId) }} to="/parties/$id" />
					}
				>
					<UserIcon aria-hidden="true" />
					Open page
				</ContextMenuLinkItem>
			</ContextMenuPopup>
		</ContextMenu>
	);
}
