import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { ArtworkPlayButton } from "#/components/app/ArtworkPlayButton";
import { PlaylistActionsMenu } from "#/components/playlist/PlaylistActionsMenu";
import { PlaylistArtwork } from "#/components/playlist/PlaylistArtwork";
import { PlaylistContextMenu } from "#/components/playlist/PlaylistContextMenu";
import { usePlayPlaylist } from "#/components/playlist/usePlayPlaylist";
import { useUserInfo } from "#/context/UserInfoContext";
import { albumQueries } from "#/lib/queries/album.queries";
import { playlistQueries } from "#/lib/queries/playlist.queries";
import type { PlaylistListItem } from "#/lib/queries/playlist.queries";
import { formatDurationInHoursAndMinutes } from "#/lib/utils/music";
import {
	playlistCoverEntries,
	playlistEntryCoverUrl,
} from "#/lib/utils/playlist";

export function PlaylistTile({ playlist }: { playlist: PlaylistListItem }) {
	const user = useUserInfo();
	const playPlaylist = usePlayPlaylist();
	const trackCount = Number(playlist.trackCount);
	const { data: details } = useQuery({
		...playlistQueries.detail(user.id, playlist.playlistId),
		enabled: trackCount > 0,
	});
	const coverEntries = playlistCoverEntries(
		trackCount > 0 ? (details?.entries ?? []) : [],
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
	const meta =
		trackCount === 0
			? "Empty playlist"
			: `${trackCount} ${trackCount === 1 ? "track" : "tracks"} · ${
					formatDurationInHoursAndMinutes(Number(playlist.totalDurationInMs)) ??
					"0m"
				}`;

	return (
		<PlaylistContextMenu
			playlist={playlist}
			render={
				<div className="group/tile relative flex min-w-0 flex-col gap-3" />
			}
		>
			<div className="pointer-events-none relative z-10 transition-transform duration-150 ease-out group-hover/tile:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover/tile:translate-y-0">
				<PlaylistArtwork className="w-full" coverUrls={coverUrls} />
				{trackCount > 0 && (
					<ArtworkPlayButton
						label={`Play ${playlist.name}`}
						onPlay={() => void playPlaylist(playlist)}
					/>
				)}
			</div>
			<div className="flex min-w-0 items-start gap-2">
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<Link
						className="truncate text-sm font-semibold outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-offset-6 focus-visible:after:outline-ring"
						params={{ id: String(playlist.playlistId) }}
						title={playlist.name}
						to="/playlists/$id"
					>
						{playlist.name}
					</Link>
					<span className="truncate text-xs text-muted-foreground">{meta}</span>
				</div>
				<div className="relative z-10 -me-1 opacity-100 transition-opacity group-focus-within/tile:opacity-100 group-hover/tile:opacity-100 md:opacity-0">
					<PlaylistActionsMenu playlist={playlist} />
				</div>
			</div>
		</PlaylistContextMenu>
	);
}
