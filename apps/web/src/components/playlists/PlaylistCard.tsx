import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import {
	Card,
	CardDescription,
	CardPanel,
	CardTitle,
} from "#/components/coss/card";
import { PlaylistActionsMenu } from "#/components/playlists/PlaylistActionsMenu";
import { PlaylistArtwork } from "#/components/playlists/PlaylistArtwork";
import { useUserInfo } from "#/context/UserInfoContext";
import { albumQueries } from "#/lib/queries/album.queries";
import { playlistQueries } from "#/lib/queries/playlist.queries";
import type { PlaylistListItem } from "#/lib/queries/playlist.queries";
import { formatDurationInHoursAndMinutes } from "#/lib/utils/music";
import {
	playlistCoverEntries,
	playlistEntryCoverUrl,
} from "#/lib/utils/playlist";

export function PlaylistCard({ playlist }: { playlist: PlaylistListItem }) {
	const user = useUserInfo();
	const { data: details } = useQuery({
		...playlistQueries.detail(user.id, playlist.playlistId),
		enabled: Number(playlist.trackCount) > 0,
	});
	const coverEntries = playlistCoverEntries(
		Number(playlist.trackCount) > 0 ? (details?.entries ?? []) : [],
	);
	const albumIds = [
		...new Set(coverEntries.map((entry) => String(entry.albumId))),
	];
	const albums = useQueries({
		queries: albumIds.map((id) => albumQueries.getAlbum(id)),
	});
	const coverUrls = coverEntries.map((entry) =>
		playlistEntryCoverUrl(
			entry,
			albums[albumIds.indexOf(String(entry.albumId))]?.data,
		),
	);
	return (
		<div className="group relative min-w-0 transition-transform hover:-translate-y-0.5">
			<Link
				to="/playlists/$id"
				params={{ id: String(playlist.playlistId) }}
				className="block h-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
			>
				<Card className="h-full overflow-hidden">
					<PlaylistArtwork coverUrls={coverUrls} />
					<CardPanel size="sm">
						<div className="grid gap-1 pr-8">
							<CardTitle render={<h2 />} size="sm">
								<span className="block truncate">{playlist.name}</span>
							</CardTitle>
							<CardDescription>
								{Number(playlist.trackCount) === 0
									? "Empty playlist"
									: `${playlist.trackCount} track${Number(playlist.trackCount) === 1 ? "" : "s"} · ${formatDurationInHoursAndMinutes(Number(playlist.totalDurationInMs)) ?? "0m"}`}
							</CardDescription>
						</div>
					</CardPanel>
				</Card>
			</Link>
			<div className="absolute right-3 bottom-4 sm:right-4 sm:bottom-5">
				<PlaylistActionsMenu playlist={playlist} />
			</div>
		</div>
	);
}
