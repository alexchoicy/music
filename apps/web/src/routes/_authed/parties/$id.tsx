import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { suppressNativeContextMenu } from "#/components/library/suppressNativeContextMenu";
import { PartyHero } from "#/components/party/detail/PartyHero";
import { PartyTabs } from "#/components/party/detail/PartyTabs";
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
	const avatarUrl = getPartyAvatarUrl(party.avatarImages);

	return (
		<main
			className="relative min-h-full w-full overflow-hidden"
			onContextMenu={suppressNativeContextMenu}
		>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] overflow-hidden"
			>
				{avatarUrl && (
					<img
						alt=""
						className="absolute -inset-20 size-[calc(100%+10rem)] object-cover opacity-30 blur-[64px] saturate-[1.3]"
						src={avatarUrl}
					/>
				)}
				<div className="absolute inset-0 bg-linear-to-b from-background/20 via-background/94 via-80% to-background" />
			</div>

			<div className="relative flex w-full flex-col gap-7 px-4 py-6 sm:px-8 lg:px-14">
				<PartyHero party={party} />
				<PartyTabs party={party} />
			</div>
		</main>
	);
}
