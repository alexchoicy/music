import { createFileRoute } from "@tanstack/react-router";
import { AlbumIcon, MicVocalIcon, PlayIcon, UsersIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { z } from "zod";

import { Tabs, TabsList, TabsPanel, TabsTab } from "#/components/base/tabs";
import { AlbumCreate } from "#/components/create/album/AlbumCreate";
import { ConcertCreate } from "#/components/create/concert/ConcertCreate";
import { PartyCreate } from "#/components/create/party/PartyCreate";
import { YouTubeCoverImport } from "#/components/create/youtube/YouTubeCoverImport";
import { albumQueries } from "#/lib/queries/album.queries";
import { languageQueries } from "#/lib/queries/language.queries";
import { partyQueries } from "#/lib/queries/party.queries";

const CREATE_TABS = ["album", "concert", "cover", "party"] as const;

const TAB_ITEMS: Record<
	(typeof CREATE_TABS)[number],
	{ icon: LucideIcon; label: string }
> = {
	album: { icon: AlbumIcon, label: "Album" },
	concert: { icon: MicVocalIcon, label: "Concert" },
	cover: { icon: PlayIcon, label: "Cover" },
	party: { icon: UsersIcon, label: "Party" },
};

export const Route = createFileRoute("/_authed/create/")({
	validateSearch: z.object({
		tab: z.enum(CREATE_TABS).optional(),
	}),
	component: RouteComponent,
	loader: ({ context }) => {
		context.queryClient.query(albumQueries.getAlbums()).catch(() => {});
		context.queryClient.query(languageQueries.getLanguages()).catch(() => {});
		context.queryClient.query(partyQueries.getParties()).catch(() => {});
	},
});

function RouteComponent() {
	const { tab = "album" } = Route.useSearch();
	const navigate = Route.useNavigate();

	return (
		<main className="flex min-h-full w-full min-w-0 flex-col p-4 sm:p-6">
			<Tabs
				onValueChange={(value) =>
					void navigate({
						search: { tab: value === "album" ? undefined : value },
						replace: true,
					})
				}
				value={tab}
			>
				<TabsList aria-label="Create" className="mx-auto mb-4" size="lg">
					{CREATE_TABS.map((value) => {
						const { icon: Icon, label } = TAB_ITEMS[value];
						return (
							<TabsTab key={value} value={value}>
								<Icon aria-hidden="true" />
								{label}
							</TabsTab>
						);
					})}
				</TabsList>
				<TabsPanel value="album">
					<AlbumCreate />
				</TabsPanel>
				<TabsPanel value="concert">
					<ConcertCreate />
				</TabsPanel>
				<TabsPanel value="cover">
					<YouTubeCoverImport />
				</TabsPanel>
				<TabsPanel value="party">
					<PartyCreate />
				</TabsPanel>
			</Tabs>
		</main>
	);
}
