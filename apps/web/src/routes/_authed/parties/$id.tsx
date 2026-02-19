import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { AlbumDisplayTab } from "@/components/party/albumDisplayTab";
import { OverallTab } from "@/components/party/overallTab";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { ScrollArea, ScrollBar } from "@/components/shadcn/scroll-area";
import { AppLayout } from "@/components/ui/appLayout";
import { partyQueries } from "@/lib/queries/party.queries";
import { cn } from "@/lib/utils/style";

export const Route = createFileRoute("/_authed/parties/$id")({
	component: RouteComponent,
	loader: ({ context, params }) => {
		const { id } = params;
		context.queryClient.ensureQueryData(partyQueries.getParty(id));
	},
});

function RouteComponent() {
	return (
		<AppLayout
			header={
				<div>
					<Button variant="outline" disabled>
						Edit
					</Button>
				</div>
			}
		>
			<Suspense fallback={<div>Loading...</div>}>
				<PartyContent />
			</Suspense>
		</AppLayout>
	);
}

export type TabValue =
	| "overall"
	| "albums"
	| "single"
	| "featured"
	| "family"
	| "info";

function PartyContent() {
	const { id } = Route.useParams();
	const { data: party } = useSuspenseQuery(partyQueries.getParty(id));

	const [activeTab, setActiveTab] = useState<TabValue>("overall");

	const leftTabs: { value: TabValue; label: string }[] = [
		{ value: "overall", label: "Overall" },
		{ value: "albums", label: "Albums" },
		{ value: "single", label: "Singles" },
		{ value: "featured", label: "Featured In" },
	];

	const rightTabs: { value: TabValue; label: string }[] = [
		{ value: "family", label: "Family" },
		{ value: "info", label: "Info" },
	];

	const albums = party.partyAlbums.filter((item) => item.type === "Album");
	const single = party.partyAlbums.filter((item) => item.type === "Single");

	return (
		<div>
			<div className="relative h-80 w-full overflow-hidden ">
				<div className="absolute inset-0">
					{party.bannerUrl ? (
						<img
							src={
								party.bannerUrl.find((item) => item.variant === "Original")?.url
							}
							alt={`${party.partyName} banner`}
							className="w-full h-full object-cover"
						/>
					) : (
						<div className="w-full h-full bg-muted" />
					)}
				</div>
				<div className="absolute bottom-0 left-0 p-6 md:p-8 flex items-end gap-5">
					<div className="relative size-24 md:size-32 rounded-full border-4 border-background shadow-xl overflow-hidden shrink-0">
						{party.iconUrl ? (
							<img
								src={
									party.iconUrl.find((item) => item.variant === "Original")?.url
								}
								alt={`${party.partyName} banner`}
								className="w-full h-full object-cover"
							/>
						) : (
							<div className="w-full h-full bg-muted" />
						)}
					</div>
					<div className="flex flex-col gap-2 pb-1 min-w-0">
						<div className="text-2xl font-bold text-amber-50 text-balance">
							{party.partyName}
						</div>
						<div className="flex items-center gap-3">
							<Badge variant="default">{party.type}</Badge>
						</div>
					</div>
				</div>
			</div>
			<div className="sticky z-30 border-b border-border">
				<ScrollArea className="w-full">
					<div className="flex w-max min-w-full justify-between">
						<div className="flex items-center">
							{leftTabs.map((tab) => (
								<button
									key={tab.value}
									type="button"
									role="tab"
									aria-selected={activeTab === tab.value}
									onClick={() => setActiveTab(tab.value)}
									className={cn(
										"relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
										activeTab === tab.value
											? "text-foreground"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									{tab.label}
									{activeTab === tab.value && (
										<span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
									)}
								</button>
							))}
						</div>
						<div className="flex items-center">
							{rightTabs.map((tab) => (
								<button
									key={tab.value}
									type="button"
									role="tab"
									aria-selected={activeTab === tab.value}
									onClick={() => setActiveTab(tab.value)}
									className={cn(
										"relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
										activeTab === tab.value
											? "text-foreground"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									{tab.label}
									{activeTab === tab.value && (
										<span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
									)}
								</button>
							))}
						</div>
					</div>
					<ScrollBar orientation="horizontal" />
				</ScrollArea>
			</div>

			<div className="flex-1">
				{activeTab === "overall" && (
					<OverallTab
						onViewClick={setActiveTab}
						albums={albums}
						single={single}
						featured={party.partyPartOfAlbums}
					/>
				)}
				{activeTab === "albums" && <AlbumDisplayTab albums={albums} />}
				{activeTab === "single" && <AlbumDisplayTab albums={single} />}
				{activeTab === "featured" && (
					<AlbumDisplayTab albums={party.partyPartOfAlbums} />
				)}
			</div>
		</div>
	);
}
