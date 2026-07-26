import { createFileRoute } from "@tanstack/react-router";

import { albumQueries } from "#/lib/queries/album.queries";
import { languageQueries } from "#/lib/queries/language.queries";
import { partyQueries } from "#/lib/queries/party.queries";
import { CreatePage } from "#/routes/_authed/create/index";

export const Route = createFileRoute("/new/_authed/create/")({
	loader: ({ context }) => {
		context.queryClient.prefetchQuery(albumQueries.getAlbums());
		context.queryClient.prefetchQuery(languageQueries.getLanguages());
		context.queryClient.prefetchQuery(partyQueries.getParties());
	},
	component: () => <CreatePage newStyle />,
});
