import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PartyDetailHero } from "#/components/parties/PartyDetailHero";
import { PartyDetailTabs } from "#/components/parties/PartyDetailTabs";
import { partyQueries } from "#/lib/queries/party.queries";
import { getPartyAvatarUrl } from "#/lib/utils/party";

export const Route = createFileRoute("/_authed/parties/$id")({
	loader: ({ context, params }) => {
		return context.queryClient.ensureQueryData(
			partyQueries.getParty(params.id),
		);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	const { data: party } = useSuspenseQuery(partyQueries.getParty(id));
	const avatarUrl = getPartyAvatarUrl(party?.avatarImages);

	return (
		<main className="relative min-h-full w-full overflow-hidden bg-background">
			<div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] overflow-hidden [mask-image:var(--party-bg-mask)] [--party-bg-mask:linear-gradient(to_bottom,black_0%,black_55%,transparent_100%)]">
				{avatarUrl && (
					<img
						alt=""
						className="absolute -inset-16 h-[calc(100%+8rem)] w-[calc(100%+8rem)] scale-110 object-cover opacity-20 blur-3xl saturate-150"
						src={avatarUrl}
					/>
				)}
				<div className="absolute inset-0 bg-linear-to-b from-background/20 via-background/85 to-background" />
			</div>

			<div className="relative flex min-h-full w-full flex-col gap-6 p-4 sm:p-6">
				<PartyDetailHero party={party} />
				<PartyDetailTabs party={party} />
			</div>
		</main>
	);
}
