import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRightIcon,
	CirclePlusIcon,
	Disc3Icon,
	MicVocalIcon,
	SparklesIcon,
	UsersRoundIcon,
} from "lucide-react";

import { Button } from "#/components/coss/button";
import {
	NewAlbumTile,
	NewConcertRow,
	NewPartyRow,
} from "#/components/new/NewMedia";
import { NewPage, NewSectionHeader } from "#/components/new/NewPage";
import { useUserInfo } from "#/context/UserInfoContext";
import { ROLE } from "#/enums/userEnums";
import { albumQueries } from "#/lib/queries/album.queries";
import { concertQueries } from "#/lib/queries/concert.queries";
import { partyQueries } from "#/lib/queries/party.queries";

const recentAlbumsQuery = albumQueries.getAlbums({
	Sort: "CreatedAtDesc",
	Limit: 12,
});
const recentConcertsQuery = concertQueries.getConcerts({
	Sort: "CreatedAtDesc",
	Limit: 6,
});
const recentPartiesQuery = partyQueries.getParties({
	ExcludeNoAlbums: true,
	Sort: "CreatedAtDesc",
	Limit: 6,
});

export const Route = createFileRoute("/new/_authed/")({
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(recentAlbumsQuery),
			context.queryClient.ensureQueryData(recentConcertsQuery),
			context.queryClient.ensureQueryData(recentPartiesQuery),
		]),
	component: RouteComponent,
});

function RouteComponent() {
	const { data: albums } = useSuspenseQuery(recentAlbumsQuery);
	const { data: concerts } = useSuspenseQuery(recentConcertsQuery);
	const { data: parties } = useSuspenseQuery(recentPartiesQuery);
	const user = useUserInfo();
	const canCreate = !user.roles.includes(ROLE.User);

	return (
		<NewPage className="gap-12">
			<section className="relative overflow-hidden rounded-[2rem] border border-border/50 bg-card/50 px-6 py-8 sm:px-10 sm:py-11 lg:px-12">
				<div className="pointer-events-none absolute -top-32 right-0 size-80 rounded-full bg-primary/12 blur-3xl" />
				<div className="relative max-w-3xl">
					<p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[.16em] text-primary uppercase">
						<SparklesIcon className="size-4" />
						Your private archive
					</p>
					<h1 className="font-heading text-4xl font-semibold tracking-[-.045em] text-balance sm:text-6xl">
						Listen closely. Keep everything.
					</h1>
					<p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
						Welcome back, {user.userName}. Browse recent releases, revisit live
						recordings, or add something new to the collection.
					</p>
					{canCreate ? (
						<Button
							className="mt-6 rounded-full"
							render={<Link to="/new/create" />}
							size="lg"
						>
							<CirclePlusIcon />
							Add to library
						</Button>
					) : null}
				</div>
			</section>

			<section className="grid grid-cols-3 divide-x divide-border/60 border-y border-border/60 py-5">
				<LibraryStat
					icon={Disc3Icon}
					label="Recent albums"
					value={albums.length}
				/>
				<LibraryStat
					icon={UsersRoundIcon}
					label="Artists"
					value={parties.length}
				/>
				<LibraryStat
					icon={MicVocalIcon}
					label="Concerts"
					value={concerts.length}
				/>
			</section>

			<section className="grid gap-5">
				<NewSectionHeader
					action={<TextLink label="All albums" to="/new/albums" />}
					description="The latest additions to your shelves."
					title="Recently added"
				/>
				<div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
					{albums.slice(0, 6).map((album) => (
						<NewAlbumTile album={album} key={album.albumId} />
					))}
				</div>
			</section>

			<div className="grid gap-10 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,.75fr)] xl:gap-14">
				<section className="min-w-0">
					<NewSectionHeader
						action={<TextLink label="All concerts" to="/new/concerts" />}
						title="Live archive"
					/>
					<div className="mt-4 divide-y divide-border/60 border-y border-border/60">
						{concerts.slice(0, 5).map((concert) => (
							<NewConcertRow concert={concert} key={concert.concertId} />
						))}
					</div>
				</section>
				<section className="min-w-0">
					<NewSectionHeader
						action={<TextLink label="All artists" to="/new/parties" />}
						title="Artists to revisit"
					/>
					<div className="mt-4 divide-y divide-border/60 border-y border-border/60">
						{parties.slice(0, 5).map((party) => (
							<NewPartyRow key={party.partyId} party={party} />
						))}
					</div>
				</section>
			</div>
		</NewPage>
	);
}

function LibraryStat({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof Disc3Icon;
	label: string;
	value: number;
}) {
	return (
		<div className="flex min-w-0 flex-col items-center gap-1 px-2 text-center sm:flex-row sm:justify-center sm:gap-3">
			<Icon className="size-4 text-primary sm:size-5" />
			<span className="text-xl font-semibold tabular-nums sm:text-2xl">
				{value}
			</span>
			<span className="truncate text-[10px] text-muted-foreground sm:text-xs">
				{label}
			</span>
		</div>
	);
}

function TextLink({
	label,
	to,
}: {
	label: string;
	to: "/new/albums" | "/new/concerts" | "/new/parties";
}) {
	return (
		<Button
			className="gap-1 text-muted-foreground"
			render={<Link search={{ sort: "CreatedAtDesc" }} to={to} />}
			size="sm"
			variant="ghost"
		>
			{label}
			<ArrowRightIcon />
		</Button>
	);
}
