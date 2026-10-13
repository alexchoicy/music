import { useHotkey } from "@tanstack/react-hotkeys";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRightIcon, Disc3Icon, PlusIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { AlbumTile } from "#/components/album/AlbumTile";
import { Button } from "#/components/base/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/base/empty";
import { ScrollArea } from "#/components/base/scroll-area";
import { Tabs, TabsList, TabsPanel, TabsTab } from "#/components/base/tabs";
import { TileRow } from "#/components/home/HomeSection";
import { PartyRelationships } from "#/components/party/relationships/PartyRelationships";
import { useUserInfo } from "#/context/UserInfoContext";
import type { components } from "#/data/APIschema";
import { ROLE } from "#/enums/userEnums";
import { albumQueries } from "#/lib/queries/album.queries";
import { albumDetailsToAudioPlayerTracks } from "#/store/audioPlayer/audioPlayerFunction";
import { useAudioPlayerStore } from "#/store/audioPlayer/audioPlayerStore";

type PartyDetails = components["schemas"]["PartyDetails"];
type Album = components["schemas"]["AlbumListItem"];

const ALBUM_GRID_CLASS =
	"grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]";

function Count({ value }: { value: number }) {
	return (
		<span className="text-xs text-muted-foreground tabular-nums">{value}</span>
	);
}

function revealTab(tab: Element | null | undefined) {
	const viewport = tab?.closest<HTMLElement>(
		'[data-slot="scroll-area-viewport"]',
	);
	if (!tab || !viewport) return;
	const tabRect = tab.getBoundingClientRect();
	const viewportRect = viewport.getBoundingClientRect();
	// Leave room for the focus ring.
	const left = tabRect.left - 4;
	const right = tabRect.right + 4;
	if (left < viewportRect.left) {
		viewport.scrollLeft -= viewportRect.left - left;
	} else if (right > viewportRect.right) {
		viewport.scrollLeft += right - viewportRect.right;
	}
}

function AlbumSection({
	albums,
	onViewAll,
	title,
}: {
	albums: Album[];
	onViewAll: () => void;
	title: string;
}) {
	return (
		<section className="flex flex-col gap-4">
			<div className="flex items-center justify-between gap-4">
				<h2 className="flex items-baseline gap-2 text-xl font-semibold tracking-tight">
					{title}
					<Count value={albums.length} />
				</h2>
				<Button onClick={onViewAll} size="sm" variant="ghost">
					View all
					<ChevronRightIcon aria-hidden="true" />
				</Button>
			</div>
			<TileRow items={albums}>
				{(album, className) => (
					<AlbumTile
						album={album}
						className={className}
						key={album.albumId}
						showMeta={false}
					/>
				)}
			</TileRow>
		</section>
	);
}

function AlbumGrid({ albums }: { albums: Album[] }) {
	return (
		<ul className={ALBUM_GRID_CLASS}>
			{albums.map((album) => (
				<li className="min-w-0" key={album.albumId}>
					<AlbumTile album={album} showMeta={false} />
				</li>
			))}
		</ul>
	);
}

export function PartyTabs({ party }: { party: PartyDetails }) {
	const queryClient = useQueryClient();
	const userInfo = useUserInfo();
	const panelsRef = useRef<HTMLDivElement>(null);
	const [tab, setTab] = useState("overview");
	const playAlbum = useAudioPlayerStore((state) => state.playAlbum);
	const addToQueue = useAudioPlayerStore((state) => state.addToQueue);
	const hasAlbums = party.albums.length > 0;
	const hasFeaturedIn = party.appearsOnAlbums.length > 0;
	const canCreate = !userInfo.roles.includes(ROLE.User);
	const tabs = [
		"overview",
		"relationships",
		hasAlbums ? "albums" : null,
		hasFeaturedIn ? "featured-in" : null,
	].filter((value): value is string => value !== null);

	function visibleAlbumLinks() {
		const panel = panelsRef.current?.querySelector(
			'[data-slot="tabs-content"]:not([hidden])',
		);
		return Array.from(
			panel?.querySelectorAll<HTMLAnchorElement>('a[href^="/albums/"]') ?? [],
		).filter((link) => link.getClientRects().length > 0);
	}

	function focusAlbum(direction: "down" | "left" | "right" | "up") {
		const links = visibleAlbumLinks();
		if (!links.length) return;
		const firstTop = links[0].getBoundingClientRect().top;
		const nextRow = links.findIndex(
			(link) => link.getBoundingClientRect().top !== firstTop,
		);
		const columns = nextRow === -1 ? links.length : nextRow;
		const current = links.indexOf(document.activeElement as HTMLAnchorElement);
		const next =
			current === -1
				? 0
				: {
						down: current + columns,
						left: current - 1,
						right: current + 1,
						up: current - columns,
					}[direction];
		links.at(Math.max(0, Math.min(links.length - 1, next)))?.focus();
	}

	async function focusedAlbumTracks() {
		const active = document.activeElement;
		if (
			!(active instanceof HTMLAnchorElement) ||
			!visibleAlbumLinks().includes(active)
		) {
			return;
		}
		const match = active.pathname.match(/^\/albums\/(\d+)$/);
		if (!match) return;
		const details = await queryClient.ensureQueryData(
			albumQueries.getAlbum(Number(match[1])),
		);
		return albumDetailsToAudioPlayerTracks(details);
	}

	useEffect(() => {
		revealTab(
			panelsRef.current?.querySelector('[data-slot="tabs-tab"][data-active]'),
		);
	}, [tab]);

	useHotkey("T", () => setTab(tabs[(tabs.indexOf(tab) + 1) % tabs.length]));
	useHotkey("W", () => focusAlbum("up"));
	useHotkey("A", () => focusAlbum("left"));
	useHotkey("S", () => focusAlbum("down"));
	useHotkey("D", () => focusAlbum("right"));
	useHotkey("G", async () => {
		const tracks = await focusedAlbumTracks();
		if (tracks) playAlbum(tracks);
	});
	useHotkey("Control+Q", async () => {
		const tracks = await focusedAlbumTracks();
		if (tracks) addToQueue(tracks);
	});

	let overview: ReactNode;
	if (hasAlbums || hasFeaturedIn) {
		overview = (
			<div className="flex flex-col gap-10">
				{hasAlbums && (
					<AlbumSection
						albums={party.albums}
						onViewAll={() => setTab("albums")}
						title="Albums"
					/>
				)}
				{hasFeaturedIn && (
					<AlbumSection
						albums={party.appearsOnAlbums}
						onViewAll={() => setTab("featured-in")}
						title="Featured in"
					/>
				)}
			</div>
		);
	} else {
		overview = (
			<Empty>
				<EmptyHeader>
					<EmptyMedia>
						<Disc3Icon
							aria-hidden="true"
							className="size-8 text-muted-foreground"
						/>
					</EmptyMedia>
					<EmptyTitle>No albums for {party.name} yet</EmptyTitle>
					<EmptyDescription>
						Add an album and credit this party on it. It will show up here.
					</EmptyDescription>
				</EmptyHeader>
				{canCreate && (
					<EmptyContent>
						<Button render={<Link to="/create" />}>
							<PlusIcon aria-hidden="true" />
							Create album
						</Button>
					</EmptyContent>
				)}
			</Empty>
		);
	}

	return (
		<Tabs onValueChange={setTab} ref={panelsRef} value={tab}>
			<ScrollArea
				className="-mx-0.5 -mt-0.5 mb-4.5 h-auto w-auto"
				clampContentMinWidth={false}
				scrollFade
			>
				{/* Room for the focus ring inside the scroll viewport. */}
				<div className="p-0.5">
					<TabsList
						aria-label="Party sections"
						className="w-max min-w-full"
						onFocus={(event) => revealTab(event.target)}
						variant="underline"
					>
						<TabsTab value="overview">Overview</TabsTab>
						<TabsTab value="relationships">Relationships</TabsTab>
						{hasAlbums && (
							<TabsTab value="albums">
								Albums
								<Count value={party.albums.length} />
							</TabsTab>
						)}
						{hasFeaturedIn && (
							<TabsTab value="featured-in">
								Featured in
								<Count value={party.appearsOnAlbums.length} />
							</TabsTab>
						)}
					</TabsList>
				</div>
			</ScrollArea>

			<TabsPanel value="overview">{overview}</TabsPanel>
			<TabsPanel value="relationships">
				<PartyRelationships key={party.partyId} party={party} />
			</TabsPanel>
			{hasAlbums && (
				<TabsPanel value="albums">
					<AlbumGrid albums={party.albums} />
				</TabsPanel>
			)}
			{hasFeaturedIn && (
				<TabsPanel value="featured-in">
					<AlbumGrid albums={party.appearsOnAlbums} />
				</TabsPanel>
			)}
		</Tabs>
	);
}
