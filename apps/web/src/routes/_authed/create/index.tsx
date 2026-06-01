import { createFileRoute } from "@tanstack/react-router";
import { AlbumIcon, MicVocalIcon, UsersIcon } from "lucide-react";

import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "#/components/coss/tabs";
import { AlbumTabContent } from "#/components/create/albumTabContent";
import { ConcertTabContent } from "#/components/create/concertTabContent";
import { PartyTabContent } from "#/components/create/partyTabContent";
import { languageQueries } from "#/lib/queries/language.queries";
import { partyQueries } from "#/lib/queries/party.queries";

export const Route = createFileRoute("/_authed/create/")({
	component: RouteComponent,
	loader: ({ context }) => {
		context.queryClient.prefetchQuery(languageQueries.getLanguages());
		context.queryClient.prefetchQuery(partyQueries.getParties());
	},
});

function RouteComponent() {
	return (
		<main className="flex min-h-full w-full flex-col p-4 sm:p-6">
			<Tabs className="min-h-0 flex-1 gap-4" defaultValue="album">
				<TabsList className="mx-auto">
					<TabsTrigger className="h-11 px-6 sm:h-10 sm:px-6" value="album">
						<AlbumIcon />
						Album
					</TabsTrigger>
					<TabsTrigger className="h-11 px-6 sm:h-10 sm:px-6" value="concert">
						<MicVocalIcon />
						Concert
					</TabsTrigger>
					<TabsTrigger className="h-11 px-6 sm:h-10 sm:px-6" value="party">
						<UsersIcon />
						Party
					</TabsTrigger>
				</TabsList>

				<TabsContent
					className="min-h-0 flex-1 border-t pt-4 sm:pt-6"
					value="album"
				>
					<AlbumTabContent />
				</TabsContent>
				<TabsContent
					className="min-h-0 flex-1 border-t pt-4 sm:pt-6"
					value="concert"
				>
					<ConcertTabContent />
				</TabsContent>
				<TabsContent
					className="min-h-0 flex-1 border-t pt-4 sm:pt-6"
					value="party"
				>
					<PartyTabContent />
				</TabsContent>
			</Tabs>
		</main>
	);
}
