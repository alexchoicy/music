import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon, LockIcon } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { Avatar, AvatarFallback, AvatarImage } from "#/components/base/avatar";
import { Button } from "#/components/base/button";
import { Tabs, TabsList, TabsPanel, TabsTab } from "#/components/base/tabs";
import { LibraryEmptyState } from "#/components/library/LibraryStates";
import { PartyAliasesEditor } from "#/components/party/edit/PartyAliasesEditor";
import { PartyDetailsForm } from "#/components/party/edit/PartyDetailsForm";
import { PartyImagesEditor } from "#/components/party/edit/PartyImagesEditor";
import { PartyLinksEditor } from "#/components/party/edit/PartyLinksEditor";
import { useUserInfo } from "#/context/UserInfoContext";
import { partyQueries } from "#/lib/queries/party.queries";
import { getPartyAvatarUrl } from "#/lib/utils/party";
import { canEditContent } from "#/lib/utils/roles";
import { rethrowNotFound } from "#/lib/utils/routing";
import { getInitials } from "#/lib/utils/string";

const editTabs = ["details", "aliases", "links", "images"] as const;

const tabLabels: Record<(typeof editTabs)[number], string> = {
	details: "Details",
	aliases: "Aliases",
	links: "Links",
	images: "Images",
};

export const Route = createFileRoute("/_authed/parties/$id_/edit")({
	validateSearch: z.object({
		tab: z.enum(editTabs).optional(),
	}),
	loader: ({ context, params }) => {
		return context.queryClient
			.query({
				...partyQueries.getParty(params.id),
				staleTime: "static",
			})
			.catch(rethrowNotFound);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	const { tab = "details" } = Route.useSearch();
	const navigate = Route.useNavigate();
	const userInfo = useUserInfo();
	const { data: party } = useSuspenseQuery(partyQueries.getParty(id));
	const avatarUrl = getPartyAvatarUrl(party.avatarImages);
	const canEdit = canEditContent(userInfo);
	const [isDirty, setIsDirty] = useState(false);

	return (
		<main className="flex min-h-full w-full min-w-0 flex-col gap-7 p-4 sm:p-6">
			<header className="flex items-center gap-4">
				<Button
					aria-label="Back to party"
					render={<Link params={{ id }} to="/parties/$id" />}
					size="icon"
					variant="ghost"
				>
					<ArrowLeftIcon aria-hidden="true" />
				</Button>
				<Avatar size="md">
					{avatarUrl && <AvatarImage alt="" src={avatarUrl} />}
					<AvatarFallback>{getInitials(party.name)}</AvatarFallback>
				</Avatar>
				<div className="min-w-0">
					<p className="text-xs text-muted-foreground">Edit party</p>
					<h1 className="text-3xl font-bold tracking-tight wrap-anywhere lg:text-4xl">
						{party.name}
					</h1>
				</div>
			</header>

			{canEdit ? (
				<Tabs
					onValueChange={(value) =>
						void navigate({ search: { tab: value }, replace: true })
					}
					value={tab}
				>
					<TabsList
						aria-label="Edit party"
						className="mb-6"
						variant="underline"
					>
						{editTabs.map((value) => (
							<TabsTab
								disabled={isDirty && tab !== value}
								key={value}
								value={value}
							>
								{tabLabels[value]}
							</TabsTab>
						))}
					</TabsList>
					<TabsPanel value="details">
						<PartyDetailsForm onDirtyChange={setIsDirty} party={party} />
					</TabsPanel>
					<TabsPanel value="aliases">
						<PartyAliasesEditor onDirtyChange={setIsDirty} party={party} />
					</TabsPanel>
					<TabsPanel value="links">
						<PartyLinksEditor onDirtyChange={setIsDirty} party={party} />
					</TabsPanel>
					<TabsPanel value="images">
						<PartyImagesEditor party={party} />
					</TabsPanel>
				</Tabs>
			) : (
				<LibraryEmptyState
					description="Only uploaders and admins can edit parties."
					icon={<LockIcon aria-hidden="true" />}
					title="No permission"
				/>
			)}
		</main>
	);
}
