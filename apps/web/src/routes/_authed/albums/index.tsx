import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { Disc3Icon, SearchIcon } from "lucide-react";
import { useDeferredValue } from "react";
import { z } from "zod";

import { AlbumCard } from "#/components/AlbumCard";
import { Card, CardPanel } from "#/components/coss/card";
import { Checkbox } from "#/components/coss/checkbox";
import { Field, FieldLabel } from "#/components/coss/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "#/components/coss/input-group";
import { Label } from "#/components/coss/label";
import { Skeleton } from "#/components/coss/skeleton";
import { EnumFieldSelect } from "#/components/enumFieldSelect";
import { LibraryEmptyState } from "#/components/LibraryEmptyState";
import { PartyCombobox } from "#/components/PartyCombobox";
import { ALBUM_TYPE_OPTIONS } from "#/enums/albumEnums";
import { albumQueries } from "#/lib/queries/album.queries";
import type { AlbumQuery } from "#/lib/queries/album.queries";

type AlbumTypeFilter = (typeof ALBUM_TYPE_OPTIONS)[number]["value"];
type AlbumSearch = {
	includeTrackCredit: boolean;
	partyIds: number[];
	search: string;
	types: AlbumTypeFilter[];
};

const ALBUM_TYPE_VALUES: ReadonlySet<string> = new Set(
	ALBUM_TYPE_OPTIONS.map((option) => option.value),
);

const albumSearchSchema = z
	.object({
		includeTrackCredit: z.boolean().catch(false).default(false),
		partyIds: z.array(z.coerce.number().int().positive()).catch([]).default([]),
		search: z.string().catch("").default(""),
		types: z
			.array(
				z.custom<AlbumTypeFilter>(
					(value) => typeof value === "string" && ALBUM_TYPE_VALUES.has(value),
				),
			)
			.catch([])
			.default([]),
	})
	.transform(
		(search): AlbumSearch => ({
			...search,
			includeTrackCredit:
				search.partyIds.length > 0 && search.includeTrackCredit,
		}),
	);

const albumSearchDefaults: AlbumSearch = {
	includeTrackCredit: false,
	partyIds: [],
	search: "",
	types: [],
};

export const Route = createFileRoute("/_authed/albums/")({
	validateSearch: albumSearchSchema,
	search: {
		middlewares: [stripSearchParams(albumSearchDefaults)],
	},
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate({ from: Route.fullPath });
	const filters = Route.useSearch();
	const deferredFilters = useDeferredValue(filters);
	const albumQuery: AlbumQuery = {
		IsIncludeInTrackCredit:
			deferredFilters.partyIds.length && deferredFilters.includeTrackCredit
				? true
				: undefined,
		PartyIds: deferredFilters.partyIds.length
			? deferredFilters.partyIds
			: undefined,
		Search: deferredFilters.search || undefined,
		Types: deferredFilters.types.length ? deferredFilters.types : undefined,
	};
	const {
		data: albums,
		isError,
		isPending,
	} = useQuery({
		...albumQueries.getAlbums(albumQuery),
		placeholderData: keepPreviousData,
	});

	function updateSearch(nextSearch: Partial<AlbumSearch>) {
		void navigate({
			replace: true,
			search: (current) => ({ ...current, ...nextSearch }),
		});
	}

	function setSelectedPartyIds(partyIds: number[]) {
		updateSearch({
			includeTrackCredit: partyIds.length > 0 && filters.includeTrackCredit,
			partyIds,
		});
	}

	return (
		<main className="flex min-h-full w-full flex-col gap-6 p-4 sm:p-6">
			<header className="flex flex-col gap-4">
				<div className="flex flex-col gap-2">
					<p className="text-sm font-medium text-muted-foreground">Library</p>
					<h1 className="font-heading text-3xl font-semibold tracking-tight">
						Albums
					</h1>
				</div>

				<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
					<InputGroup className="sm:max-w-sm">
						<InputGroupAddon>
							<SearchIcon aria-hidden="true" />
						</InputGroupAddon>
						<InputGroupInput
							aria-label="Search albums"
							placeholder="Search albums..."
							type="search"
							value={filters.search}
							onChange={(event) => {
								updateSearch({ search: event.target.value });
							}}
						/>
					</InputGroup>
					<Field className="sm:w-80">
						<div className="flex w-full items-center justify-between gap-3">
							<FieldLabel nativeLabel={false} render={<div />}>
								Party
							</FieldLabel>
							<div className="flex items-center gap-2">
								<Checkbox
									checked={
										filters.partyIds.length > 0 && filters.includeTrackCredit
									}
									disabled={filters.partyIds.length === 0}
									id="include-track-credit"
									onCheckedChange={(checked) => {
										updateSearch({ includeTrackCredit: checked === true });
									}}
								/>
								<Label className="text-xs" htmlFor="include-track-credit">
									Include track credit
								</Label>
							</div>
						</div>
						<PartyCombobox
							ariaLabel="Filter by parties"
							placeholder="Filter by parties..."
							selectedIds={filters.partyIds}
							setSelectedIds={setSelectedPartyIds}
						/>
					</Field>
					<div className="sm:w-56">
						<EnumFieldSelect
							label="Type"
							multiple
							onValueChange={(types) => updateSearch({ types })}
							options={ALBUM_TYPE_OPTIONS}
							placeholder="All types"
							value={filters.types}
						/>
					</div>
				</div>
			</header>

			{isPending ? (
				<AlbumGridSkeleton />
			) : isError ? (
				<LibraryEmptyState
					description="Try again in a moment."
					icon={<Disc3Icon aria-hidden="true" />}
					title="Unable to load albums"
				/>
			) : albums.length ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
					{albums.map((album) => {
						return <AlbumCard album={album} key={album.albumId} />;
					})}
				</div>
			) : (
				<LibraryEmptyState
					description="Albums will appear here after they are created."
					icon={<Disc3Icon aria-hidden="true" />}
					title="No albums yet"
				/>
			)}
		</main>
	);
}
function AlbumGridSkeleton() {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
			{Array.from({ length: 10 }, (_, index) => (
				<Card className="overflow-hidden" key={index}>
					<Skeleton className="aspect-square rounded-none" />
					<CardPanel className="flex flex-col gap-3 p-4">
						<div className="grid gap-2">
							<Skeleton className="h-5 w-3/4" />
							<Skeleton className="h-4 w-1/2" />
						</div>
						<Skeleton className="h-4 w-28" />
					</CardPanel>
				</Card>
			))}
		</div>
	);
}
