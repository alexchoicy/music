import { Link } from "@tanstack/react-router";
import { ChevronRightIcon, Disc3Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "#/components/coss/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/coss/empty";
import { Tabs, TabsList, TabsPanel, TabsTab } from "#/components/coss/tabs";
import type { components } from "#/data/APIschema";

import { PartyAlbumGrid } from "./PartyAlbumGrid";

type PartyDetails = components["schemas"]["PartyDetails"];

type PartyDetailTabsProps = {
	party: PartyDetails;
};

const PREVIEW_ALBUM_LIMIT = 5;

export function PartyDetailTabs({ party }: PartyDetailTabsProps) {
	const [tab, setTab] = useState("overall");
	const hasAlbums = party.albums.length > 0;
	const hasFeaturedIn = party.appearsOnAlbums.length > 0;
	const previewAlbums = party.albums.slice(0, PREVIEW_ALBUM_LIMIT);
	const previewFeaturedIn = party.appearsOnAlbums.slice(0, PREVIEW_ALBUM_LIMIT);

	return (
		<Tabs className="gap-0" onValueChange={setTab} value={tab}>
			<div className="border-b">
				<TabsList variant="underline">
					<TabsTab value="overall">Overall</TabsTab>
					{hasAlbums && <TabsTab value="albums">Albums</TabsTab>}
					{hasFeaturedIn && <TabsTab value="featured-in">Featured In</TabsTab>}
				</TabsList>
			</div>

			<TabsPanel className="pt-6" value="overall">
				<div className="flex flex-col gap-8">
					{!hasAlbums && (
						<Empty className="min-h-80 rounded-2xl border bg-card">
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<Disc3Icon aria-hidden="true" />
								</EmptyMedia>
								<EmptyTitle>This bro have no album.</EmptyTitle>
								<EmptyDescription>Create it.</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<Button render={<Link to="/create" />}>Create it</Button>
							</EmptyContent>
						</Empty>
					)}

					{hasAlbums && (
						<section>
							<div className="mb-4 flex items-center justify-between gap-4">
								<h2 className="text-lg font-semibold text-foreground">
									Albums
								</h2>

								<Button
									className="gap-1 text-muted-foreground hover:text-foreground"
									onClick={() => {
										setTab("albums");
									}}
									size="sm"
									variant="ghost"
								>
									View All
									<ChevronRightIcon aria-hidden="true" />
								</Button>
							</div>

							<PartyAlbumGrid albums={previewAlbums} variant="preview" />
						</section>
					)}

					{hasFeaturedIn && (
						<section>
							<div className="mb-4 flex items-center justify-between gap-4">
								<h2 className="text-lg font-semibold text-foreground">
									Featured In
								</h2>

								<Button
									className="gap-1 text-muted-foreground hover:text-foreground"
									onClick={() => {
										setTab("featured-in");
									}}
									size="sm"
									variant="ghost"
								>
									View All
									<ChevronRightIcon aria-hidden="true" />
								</Button>
							</div>

							<PartyAlbumGrid albums={previewFeaturedIn} variant="preview" />
						</section>
					)}
				</div>
			</TabsPanel>

			{hasAlbums && (
				<TabsPanel className="pt-6" value="albums">
					<section className="flex flex-col gap-4">
						<div className="flex flex-col gap-1">
							<h2 className="font-heading text-xl font-semibold tracking-tight">
								Albums
							</h2>
							<p className="text-sm text-muted-foreground">
								{party.albums.length} album
								{party.albums.length === 1 ? "" : "s"} in library.
							</p>
						</div>

						<PartyAlbumGrid albums={party.albums} />
					</section>
				</TabsPanel>
			)}

			{hasFeaturedIn && (
				<TabsPanel className="pt-6" value="featured-in">
					<section className="flex flex-col gap-4">
						<div className="flex flex-col gap-1">
							<h2 className="font-heading text-xl font-semibold tracking-tight">
								Featured In
							</h2>
							<p className="text-sm text-muted-foreground">
								{party.appearsOnAlbums.length} album
								{party.appearsOnAlbums.length === 1 ? "" : "s"} featuring this
								party.
							</p>
						</div>

						<PartyAlbumGrid albums={party.appearsOnAlbums} />
					</section>
				</TabsPanel>
			)}
		</Tabs>
	);
}
