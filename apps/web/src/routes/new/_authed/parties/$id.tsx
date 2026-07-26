import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon, UsersRoundIcon } from "lucide-react";

import { Button } from "#/components/coss/button";
import { NewEmptyState, NewPage } from "#/components/new/NewPage";
import { PartyDetailHero } from "#/components/parties/PartyDetailHero";
import { PartyDetailTabs } from "#/components/parties/PartyDetailTabs";
import { partyQueries } from "#/lib/queries/party.queries";
import { getPartyAvatarUrl } from "#/lib/utils/party";

export const Route = createFileRoute("/new/_authed/parties/$id")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(partyQueries.getParty(params.id)),
	component: RouteComponent,
	errorComponent: () => (
		<NewPage>
			<NewEmptyState
				description="This artist may have been removed, or the server is unavailable."
				icon={<UsersRoundIcon />}
				title="Artist unavailable"
			/>
		</NewPage>
	),
});

function RouteComponent() {
	const { id } = Route.useParams();
	const { data: party } = useSuspenseQuery(partyQueries.getParty(id));
	const avatarUrl = getPartyAvatarUrl(party.avatarImages);

	return (
		<main className="relative min-h-full overflow-hidden">
			{avatarUrl ? (
				<div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] overflow-hidden [mask-image:linear-gradient(to_bottom,black,transparent)]">
					<img
						alt=""
						className="absolute -inset-20 size-[calc(100%+10rem)] object-cover opacity-15 blur-3xl saturate-150"
						src={avatarUrl}
					/>
					<div className="absolute inset-0 bg-linear-to-b from-background/20 to-background" />
				</div>
			) : null}
			<NewPage className="relative max-w-[1440px] gap-7">
				<Button
					className="w-fit text-muted-foreground"
					render={<Link to="/new/parties" />}
					size="sm"
					variant="ghost"
				>
					<ArrowLeftIcon />
					Artists
				</Button>
				<PartyDetailHero party={party} />
				<PartyDetailTabs party={party} routePrefix="/new" />
			</NewPage>
		</main>
	);
}
