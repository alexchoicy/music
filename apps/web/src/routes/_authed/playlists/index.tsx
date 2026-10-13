import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ListMusicIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "#/components/app/PageHeader";
import { Button } from "#/components/base/button";
import { LibraryEmptyState } from "#/components/library/LibraryStates";
import { suppressNativeContextMenu } from "#/components/library/suppressNativeContextMenu";
import { PlaylistNameDialog } from "#/components/playlist/PlaylistNameDialog";
import { PlaylistTile } from "#/components/playlist/PlaylistTile";
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
		<main
			className="flex min-h-full w-full min-w-0 flex-col gap-6 p-4 sm:p-6"
			onContextMenu={suppressNativeContextMenu}
		>
			<div className="flex flex-wrap items-end justify-between gap-4">
				<PageHeader title="Playlists" />
				<Button onClick={() => setCreating(true)}>
					<PlusIcon aria-hidden="true" />
					Create playlist
				</Button>
			</div>

			{playlists.length === 0 ? (
				<LibraryEmptyState
					description="Create a playlist, then add tracks from an album or a track’s menu."
					icon={<ListMusicIcon aria-hidden="true" />}
					title="No playlists yet"
				/>
			) : (
				<ul
					aria-label="Playlists"
					className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]"
				>
					{playlists.map((playlist) => (
						<li className="min-w-0" key={playlist.playlistId}>
							<PlaylistTile playlist={playlist} />
						</li>
					))}
				</ul>
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
