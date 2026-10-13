import { ExternalLinkIcon, PlayIcon, ShuffleIcon } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "#/components/base/avatar";
import { Badge } from "#/components/base/badge";
import { Button } from "#/components/base/button";
import { usePlayParty } from "#/components/party/usePlayParty";
import type { components } from "#/data/APIschema";
import { COUNTRY_CODE, PARTY_KIND, PARTY_TYPE } from "#/enums/partyEnums";
import { getPartyAvatarUrl } from "#/lib/utils/party";
import { getInitials } from "#/lib/utils/string";

type PartyDetails = components["schemas"]["PartyDetails"];

// Initials sit on a colour picked from the name, so it stays stable per party.
const INITIALS_PALETTE = [
	["#1d5c63", "#f0c987"],
	["#8a2f3d", "#f3d9c4"],
	["#2d3a6b", "#9fc3e8"],
	["#c9772e", "#2a1d12"],
	["#3a5a3a", "#d6e29a"],
	["#5b2d6e", "#f0a6c8"],
	["#222a30", "#7fd0c8"],
	["#1b2b4a", "#f2a65a"],
] as const;

function initialsColors(name: string) {
	let hash = 0;
	for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
	const [background, color] = INITIALS_PALETTE[hash % INITIALS_PALETTE.length];
	return { background, color };
}

function plural(count: number, noun: string) {
	return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function PartyHero({ party }: { party: PartyDetails }) {
	const playParty = usePlayParty();
	const [loading, setLoading] = useState<"play" | "shuffle" | null>(null);

	const avatarUrl = getPartyAvatarUrl(party.avatarImages);
	const description = party.description.trim();
	const aliases = party.aliases.map((alias) => alias.name).filter(Boolean);
	const albumCount = party.albums.length;
	const appearsOnCount = party.appearsOnAlbums.length;
	const stats = [
		albumCount > 0
			? `${plural(albumCount, "album")} in library`
			: "No albums in library",
		appearsOnCount > 0 ? `Appears on ${plural(appearsOnCount, "album")}` : null,
	].filter(Boolean);
	// Unknowns are left out rather than spelled out.
	const detailBadges = [
		PARTY_KIND[party.kind],
		party.gender && party.gender !== "Unknown" ? party.gender : null,
		party.country !== "XX" ? COUNTRY_CODE[party.country] : null,
	].filter((badge): badge is string => Boolean(badge));

	async function play(shuffle: boolean) {
		setLoading(shuffle ? "shuffle" : "play");
		await playParty(party, { shuffle });
		setLoading(null);
	}

	return (
		<div className="flex flex-col gap-7">
			<section
				aria-label="Party"
				className="grid items-start gap-6 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-8"
			>
				<Avatar size="hero">
					{avatarUrl && <AvatarImage alt="" src={avatarUrl} />}
					<AvatarFallback style={initialsColors(party.name)}>
						{getInitials(party.name)}
					</AvatarFallback>
				</Avatar>

				<div className="flex min-w-0 flex-col gap-3">
					<div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
						<div className="flex min-w-0 flex-col gap-3">
							<div className="flex flex-wrap gap-1.5">
								{party.type && (
									<Badge size="tag" variant="secondary">
										{PARTY_TYPE[party.type]}
									</Badge>
								)}
								{detailBadges.map((badge) => (
									<Badge key={badge} size="tag" variant="outline">
										{badge}
									</Badge>
								))}
							</div>
							<h1 className="text-3xl font-bold tracking-[-.03em] break-words sm:text-5xl sm:leading-[52px]">
								{party.name}
							</h1>
						</div>
						{albumCount > 0 && (
							<div className="flex shrink-0 items-center gap-2 sm:pt-1">
								<Button
									loading={loading === "play"}
									onClick={() => void play(false)}
									size="lg"
								>
									<PlayIcon aria-hidden="true" />
									Play
								</Button>
								<Button
									loading={loading === "shuffle"}
									onClick={() => void play(true)}
									size="lg"
									variant="outline"
								>
									<ShuffleIcon aria-hidden="true" />
									Shuffle
								</Button>
							</div>
						)}
					</div>

					<p className="text-sm text-sidebar-foreground">{stats.join(" · ")}</p>
					{aliases.length > 0 && (
						<p className="text-[13px] text-muted-foreground">
							Also known as {aliases.join(", ")}
						</p>
					)}
					{description && (
						<p className="max-w-160 text-sm leading-6 whitespace-pre-line text-muted-foreground">
							{description}
						</p>
					)}
					{party.externalInfoLinks.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{party.externalInfoLinks.map((link) => (
								<Button
									key={`${link.type}-${link.url}`}
									render={
										<a href={link.url} rel="noreferrer" target="_blank" />
									}
									size="sm"
									variant="outline"
								>
									{link.type}
									<ExternalLinkIcon aria-hidden="true" />
								</Button>
							))}
						</div>
					)}
				</div>
			</section>
		</div>
	);
}
