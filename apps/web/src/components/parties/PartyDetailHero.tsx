import { ExternalLinkIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "#/components/coss/avatar";
import { Badge } from "#/components/coss/badge";
import { Button } from "#/components/coss/button";
import type { components } from "#/data/APIschema";
import { COUNTRY_CODE, PARTY_KIND, PARTY_TYPE } from "#/enums/partyEnums";
import { getCoverUrl } from "#/lib/utils/album";
import { getInitials } from "#/lib/utils/string";

type PartyDetails = components["schemas"]["PartyDetails"];

type PartyDetailHeroProps = {
	party: PartyDetails;
};

export function PartyDetailHero({ party }: PartyDetailHeroProps) {
	const avatarUrl = getCoverUrl(party.avatarImages);
	const gender = party.gender !== "Unknown" ? party.gender : undefined;
	const description = party.description.trim();
	const hasAdditionalInfo =
		description.length > 0 || party.externalInfoLinks.length > 0;

	return (
		<section className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-4 gap-y-5 sm:grid-cols-[9rem_minmax(0,1fr)] lg:gap-x-5">
			<Avatar className="size-28 rounded-3xl border bg-muted shadow-sm/5 sm:size-36 lg:row-span-2">
				{avatarUrl && (
					<AvatarImage alt={`${party.name} avatar`} src={avatarUrl} />
				)}
				<AvatarFallback className="rounded-3xl text-2xl">
					{getInitials(party.name)}
				</AvatarFallback>
			</Avatar>

			<div className="flex min-w-0 flex-col gap-3">
				<div className="flex flex-wrap gap-1.5">
					{party.type && (
						<Badge variant="secondary">{PARTY_TYPE[party.type]}</Badge>
					)}
					<Badge variant="outline">{PARTY_KIND[party.kind]}</Badge>
					{gender && <Badge variant="outline">{gender}</Badge>}
				</div>

				<div className="flex min-w-0 flex-col gap-2">
					<h1 className="font-heading text-3xl font-semibold tracking-tight break-words sm:text-4xl">
						{party.name}
					</h1>
					<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
						<span>{COUNTRY_CODE[party.country]}</span>
						<span aria-hidden="true">&middot;</span>
						<span>
							{party.albums.length} album
							{party.albums.length === 1 ? "" : "s"} in library
						</span>
						{party.appearsOnAlbums.length > 0 && (
							<>
								<span aria-hidden="true">&middot;</span>
								<span>
									Appears on {party.appearsOnAlbums.length} album
									{party.appearsOnAlbums.length === 1 ? "" : "s"}
								</span>
							</>
						)}
					</div>
				</div>
			</div>

			{hasAdditionalInfo && (
				<div className="col-span-2 flex min-w-0 flex-col gap-4 lg:col-span-1 lg:col-start-2">
					{description && (
						<p className="max-w-3xl text-sm leading-6 text-muted-foreground">
							{description}
						</p>
					)}

					{party.externalInfoLinks.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{party.externalInfoLinks.map((link) => {
								return (
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
								);
							})}
						</div>
					)}
				</div>
			)}
		</section>
	);
}
