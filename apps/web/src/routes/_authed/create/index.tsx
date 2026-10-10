import { createFileRoute } from "@tanstack/react-router";
import { AlbumIcon, MicVocalIcon, UsersIcon, YoutubeIcon } from "lucide-react";
import { lazy, Suspense } from "react";
import { z } from "zod";

import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "#/components/coss/tabs";
import { albumQueries } from "#/lib/queries/album.queries";
import { languageQueries } from "#/lib/queries/language.queries";
import { partyQueries } from "#/lib/queries/party.queries";

const AlbumTabContent = lazy(() =>
	import("#/components/create/albumTabContent").then((module) => ({
		default: module.AlbumTabContent,
	})),
);

const ConcertTabContent = lazy(() =>
	import("#/components/create/concertTabContent").then((module) => ({
		default: module.ConcertTabContent,
	})),
);

const YouTubeCoverTabContent = lazy(() =>
	import("#/components/create/youtubeCoverTabContent").then((module) => ({
		default: module.YouTubeCoverTabContent,
	})),
);

const PartyTabContent = lazy(() =>
	import("#/components/create/partyTabContent").then((module) => ({
		default: module.PartyTabContent,
	})),
);

const CREATE_TABS = ["album", "concert", "cover", "party"] as const;

export const Route = createFileRoute("/_authed/create/")({
	validateSearch: z.object({
		tab: z.enum(CREATE_TABS).optional(),
	}),
	component: RouteComponent,
	loader: ({ context }) => {
		context.queryClient.prefetchQuery(albumQueries.getAlbums());
		context.queryClient.prefetchQuery(languageQueries.getLanguages());
		context.queryClient.prefetchQuery(partyQueries.getParties());
	},
});

function RouteComponent() {
	const { tab = "album" } = Route.useSearch();
	const navigate = Route.useNavigate();

	return (
		<main className="flex min-h-full w-full flex-col p-4 sm:p-6">
			<Tabs
				className="min-h-0 flex-1 gap-4"
				onValueChange={(value) =>
					navigate({
						search: {
							tab:
								value === "album"
									? undefined
									: (value as (typeof CREATE_TABS)[number]),
						},
						replace: true,
					})
				}
				value={tab}
			>
				<TabsList className="mx-auto">
					<TabsTrigger className="h-11 px-6 sm:h-10 sm:px-6" value="album">
						<AlbumIcon />
						Album
					</TabsTrigger>
					<TabsTrigger className="h-11 px-6 sm:h-10 sm:px-6" value="concert">
						<MicVocalIcon />
						Concert
					</TabsTrigger>
					<TabsTrigger className="h-11 px-6 sm:h-10 sm:px-6" value="cover">
						<YoutubeIcon />
						Cover
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
					<Suspense fallback={<CreateTabFallback label="album" />}>
						<AlbumTabContent />
					</Suspense>
				</TabsContent>
				<TabsContent
					className="min-h-0 flex-1 border-t pt-4 sm:pt-6"
					value="concert"
				>
					<Suspense fallback={<CreateTabFallback label="concert" />}>
						<ConcertTabContent />
					</Suspense>
				</TabsContent>
				<TabsContent
					className="min-h-0 flex-1 border-t pt-4 sm:pt-6"
					value="cover"
				>
					<Suspense fallback={<CreateTabFallback label="cover" />}>
						<YouTubeCoverTabContent />
					</Suspense>
				</TabsContent>
				<TabsContent
					className="min-h-0 flex-1 border-t pt-4 sm:pt-6"
					value="party"
				>
					<Suspense fallback={<CreateTabFallback label="party" />}>
						<PartyTabContent />
					</Suspense>
				</TabsContent>
			</Tabs>
		</main>
	);
}

function CreateTabFallback({ label }: { label: string }) {
	return (
		<section className="rounded-lg border bg-card p-4 text-sm text-muted-foreground shadow-sm">
			Loading {label} tools...
		</section>
	);
}
