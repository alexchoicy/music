import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ListMusicIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "#/components/coss/button";
import { LibraryEmptyState } from "#/components/LibraryEmptyState";
import { PlaylistCard } from "#/components/playlists/PlaylistCard";
import { PlaylistNameDialog } from "#/components/playlists/PlaylistNameDialog";
import { useUserInfo } from "#/context/UserInfoContext";
import { playlistQueries } from "#/lib/queries/playlist.queries";

export const Route = createFileRoute("/_authed/playlists/")({
	component: PlaylistsPage,
});

function PlaylistsPage() {
	const user = useUserInfo();
	const { data: playlists } = useSuspenseQuery(playlistQueries.list(user.id));
	const [creating, setCreating] = useState(false);
	const navigate = useNavigate();
	return (
		<main className="flex min-h-full flex-col gap-6 p-4 sm:p-6">
			<header className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold sm:text-3xl">Playlists</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Your personal collections of library tracks.
					</p>
				</div>
				<Button type="button" onClick={() => setCreating(true)}>
					<PlusIcon aria-hidden="true" />
					Create playlist
				</Button>
			</header>
			{playlists.length === 0 ? (
				<LibraryEmptyState
					icon={<ListMusicIcon />}
					title="No playlists yet"
					description="Create a playlist, then add tracks from an album or a track’s menu."
				/>
			) : (
				<div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
					{playlists.map((playlist) => (
						<PlaylistCard key={playlist.playlistId} playlist={playlist} />
					))}
				</div>
			)}
			{creating && (
				<PlaylistNameDialog
					onClose={() => setCreating(false)}
					onCreated={(id) =>
						void navigate({ to: "/playlists/$id", params: { id: String(id) } })
					}
				/>
			)}
		</main>
	);
}
