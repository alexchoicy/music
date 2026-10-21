import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { Disc3Icon } from "lucide-react";
import { useRef } from "react";
import { z } from "zod";

import { AlbumTile } from "#/components/album/AlbumTile";
import { ALBUM_TYPE_ICON } from "#/components/album/AlbumTypeBadge";
import { usePlayAlbum } from "#/components/album/usePlayAlbum";
import { PageHeader } from "#/components/app/PageHeader";
import { FilterChips } from "#/components/library/FilterChips";
import { FilterSelect } from "#/components/library/FilterSelect";
import {
	LibraryEmptyState,
	TileGridSkeleton,
} from "#/components/library/LibraryStates";
import {
	LibraryFooter,
	ResetFiltersButton,
	SearchField,
} from "#/components/library/LibraryToolbar";
import { useGridFocusHotkeys } from "#/components/library/useGridFocusHotkeys";
import { PartyFilterField } from "#/components/party/PartyFilterCombobox";
import { ALBUM_TYPE_OPTIONS } from "#/enums/albumEnums";
import {
	DEFAULT_LIST_SORT,
	isListSortOption,
	LIST_SORT_OPTIONS,
} from "#/enums/listSortEnums";
import type { ListSortOption } from "#/enums/listSortEnums";
import { useDebouncedValue } from "#/hooks/use-debounced-value";
import { albumQueries } from "#/lib/queries/album.queries";
import type { AlbumQuery } from "#/lib/queries/album.queries";
import { languageQueries } from "#/lib/queries/language.queries";

type AlbumTypeFilter = (typeof ALBUM_TYPE_OPTIONS)[number]["value"];
type AlbumSearch = {
	includeTrackCredit: boolean;
	languageIds: number[];
	partyIds: number[];
	search: string;
	sort: ListSortOption;
	types: AlbumTypeFilter[];
};

const ALBUM_TYPE_VALUES: ReadonlySet<string> = new Set(
	ALBUM_TYPE_OPTIONS.map((option) => option.value),
);

const albumSearchSchema = z
	.object({
		includeTrackCredit: z.boolean().catch(false).default(false),
		languageIds: z
			.array(z.coerce.number().int().positive())
			.catch([])
			.default([]),
		partyIds: z.array(z.coerce.number().int().positive()).catch([]).default([]),
		search: z.string().catch("").default(""),
		sort: z
			.custom<ListSortOption>(isListSortOption)
			.catch(DEFAULT_LIST_SORT)
			.default(DEFAULT_LIST_SORT),
		types: z
			.array(
				z.custom<AlbumTypeFilter>(
					(value) => typeof value === "string" && ALBUM_TYPE_VALUES.has(value),
				),
			)
			.catch([])
			.default([]),
	})
	.transform((search): AlbumSearch => ({
		...search,
		includeTrackCredit: search.partyIds.length > 0 && search.includeTrackCredit,
	}));

const albumSearchDefaults: AlbumSearch = {
	includeTrackCredit: false,
	languageIds: [],
	partyIds: [],
	search: "",
	sort: DEFAULT_LIST_SORT,
	types: [],
};

export const Route = createFileRoute("/_authed/albums/")({
	validateSearch: albumSearchSchema,
	loaderDeps: ({ search }) => search,
	search: {
		middlewares: [stripSearchParams(albumSearchDefaults)],
	},
	loader: async ({ cause, context, deps }) => {
		if (cause === "stay") return;
		const list = context.queryClient.query(
			albumQueries.getAlbums(toAlbumQuery(deps)),
		);
		if (import.meta.env.SSR) await list;
		else list.catch(() => {});
	},
	component: RouteComponent,
});

function toAlbumQuery(filters: AlbumSearch, search = filters.search) {
	return {
		IsIncludeInTrackCredit:
			filters.partyIds.length && filters.includeTrackCredit ? true : undefined,
		LanguageIds: filters.languageIds.length ? filters.languageIds : undefined,
		PartyIds: filters.partyIds.length ? filters.partyIds : undefined,
		Search: search || undefined,
		Sort: filters.sort,
		Types: filters.types.length ? filters.types : undefined,
	} satisfies AlbumQuery;
}

const ALBUM_GRID_CLASS =
	"grid min-w-0 grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]";

const ALBUM_TYPE_CHIPS = ALBUM_TYPE_OPTIONS.map((option) => {
	const Icon = ALBUM_TYPE_ICON[option.value];
	return { ...option, icon: <Icon aria-hidden="true" /> };
});

function isDefaultSearch(search: AlbumSearch) {
	return (
		!search.search &&
		search.partyIds.length === 0 &&
		search.languageIds.length === 0 &&
		search.types.length === 0 &&
		search.sort === DEFAULT_LIST_SORT
	);
}

function RouteComponent() {
	const navigate = useNavigate({ from: Route.fullPath });
	const albumGridRef = useRef<HTMLUListElement>(null);
	const playAlbum = usePlayAlbum();
	const filters = Route.useSearch();
	const debouncedSearch = useDebouncedValue(filters.search, 250);
	const {
		data: albums,
		isError,
		isPending,
	} = useQuery({
		...albumQueries.getAlbums(toAlbumQuery(filters, debouncedSearch)),
		placeholderData: keepPreviousData,
	});
	function playFocusedAlbum(
		index: number,
		options?: { queue?: boolean; next?: boolean },
	) {
		const album = albums?.[index];
		if (album) void playAlbum(album, options);
	}
	useGridFocusHotkeys(albumGridRef, {
		onPlay: (index) => playFocusedAlbum(index),
		onPlayNext: (index) => playFocusedAlbum(index, { next: true }),
		onQueue: (index) => playFocusedAlbum(index, { queue: true }),
	});
	const { data: languages = [] } = useQuery(languageQueries.getLanguages());
	const languageOptions = languages.map((language) => ({
		label: language.language,
		value: String(language.id),
	}));

	function updateSearch(nextSearch: Partial<AlbumSearch>) {
		void navigate({
			replace: true,
			search: (current) => ({ ...current, ...nextSearch }),
		});
	}

	return (
		<main className="flex min-h-full w-full min-w-0 flex-col gap-6 p-4 sm:p-6">
			<PageHeader title="Albums" />

			<div
				aria-label="Filter albums"
				className="flex flex-col gap-4"
				role="search"
			>
				<div className="flex flex-wrap items-end gap-3">
					<SearchField
						label="Search albums"
						onValueChange={(search) => updateSearch({ search })}
						value={filters.search}
					/>
					<PartyFilterField
						creditLabel="Include track credit"
						includeCredit={filters.includeTrackCredit}
						label="Parties"
						onIncludeCreditChange={(includeTrackCredit) =>
							updateSearch({ includeTrackCredit })
						}
						onSelectedIdsChange={(partyIds) =>
							updateSearch({
								includeTrackCredit:
									partyIds.length > 0 && filters.includeTrackCredit,
								partyIds,
							})
						}
						selectedIds={filters.partyIds}
					/>
					<FilterSelect
						className="sm:w-50"
						label="Language"
						multiple
						onValueChange={(languageIds) =>
							updateSearch({ languageIds: languageIds.map(Number) })
						}
						options={languageOptions}
						placeholder="All languages"
						value={filters.languageIds.map(String)}
					/>
					<FilterSelect
						className="sm:ms-auto sm:w-56"
						label="Sort"
						onValueChange={(sort) => updateSearch({ sort })}
						options={LIST_SORT_OPTIONS}
						value={filters.sort}
					/>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<FilterChips
						allLabel="All types"
						label="Type"
						multiple
						onValueChange={(types) => updateSearch({ types })}
						options={ALBUM_TYPE_CHIPS}
						value={filters.types}
					/>
					<div className="ms-auto">
						<ResetFiltersButton
							disabled={isDefaultSearch(filters)}
							onClick={() => updateSearch(albumSearchDefaults)}
						/>
					</div>
				</div>
			</div>

			{isPending ? (
				<TileGridSkeleton gridClassName={ALBUM_GRID_CLASS} shape="square" />
			) : isError ? (
				<LibraryEmptyState
					description="Try again in a moment."
					icon={<Disc3Icon aria-hidden="true" />}
					title="Unable to load albums"
				/>
			) : albums.length === 0 ? (
				<LibraryEmptyState
					description={
						isDefaultSearch(filters)
							? "Albums will appear here after they are created."
							: "No albums match these filters."
					}
					icon={<Disc3Icon aria-hidden="true" />}
					title={isDefaultSearch(filters) ? "No albums yet" : "No matches"}
				/>
			) : (
				<>
					<ul
						aria-label="Albums"
						ref={albumGridRef}
						className={ALBUM_GRID_CLASS}
					>
						{albums.map((album) => (
							<li className="min-w-0" key={album.albumId}>
								<AlbumTile album={album} />
							</li>
						))}
					</ul>
					<LibraryFooter>
						<p className="text-xs text-muted-foreground">
							{albums.length} {albums.length === 1 ? "album" : "albums"}
						</p>
					</LibraryFooter>
				</>
			)}
		</main>
	);
}
