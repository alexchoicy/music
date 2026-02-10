import { useQuery } from "@tanstack/react-query";
import { Disc3 } from "lucide-react";
import { useMusicUploadState } from "@/contexts/uploadMusicContext";
import { partyQueries } from "@/lib/queries/party.queries";
import { checkIfVariousArtists } from "@/lib/utils/music";
import { Badge } from "../shadcn/badge";
import { Button } from "../shadcn/button";

export function UploadAlbumDetail({
	albumId,
	openAlbumEdit,
}: {
	albumId: string;
	openAlbumEdit: (albumId: string) => void;
}) {
	const state = useMusicUploadState();
	const { data: parties } = useQuery(partyQueries.getPartySearchList(""));

	const album = state.albums[albumId];
	const albumCover = state.albumCovers[albumId];

	const numberOfDiscs = album.OrderedAlbumDiscsIds.length;
	const numberOfTracks = album.OrderedAlbumDiscsIds.reduce(
		(sum, discId) => sum + state.discs[discId].OrderedTrackIds.length,
		0,
	);

	const isVariousArtists = checkIfVariousArtists(album.unsolvedAlbumCredits);

	return (
		<div className="flex items-center gap-4 w-full">
			<div className="w-16 h-16 rounded-lg flex flex-row items-center justify-center shrink-0">
				{albumCover ? (
					<img
						src={albumCover.croppedURL || albumCover.localURL}
						alt="Album Art"
						className="w-full h-full object-cover rounded-lg"
					/>
				) : (
					<div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
						<Disc3 className="w-6 h-6" />
					</div>
				)}
			</div>

			<div className="flex-1">
				<div className="flex flex-row items-center space-x-2">
					<h2 className="text-lg font-semibold">{album.title}</h2>
					<Badge
						className="text-center dark:border-purple-500/50 dark:text-purple-300 border-purple-700/50 text-purple-500 text-xs px-1 py-0"
						variant="secondary"
					>
						{album.type}
					</Badge>
				</div>

				<div className="text-gray-400 flex-row">
					{album.albumCredits.map((credit) => (
						<div key={credit.partyId}>
							{parties?.find((party) => party.partyId === credit.partyId)
								?.partyName || "Unknown Artist"}
						</div>
					))}

					<span className="flex flex-row items-center gap-2 mt-2">
						{album.unsolvedAlbumCredits.length > 0 && (
							<Badge variant="destructive">
								{album.unsolvedAlbumCredits.length} unsolved credits
							</Badge>
						)}

						{album.albumCredits.length === 0 && (
							<Badge variant="destructive">No credits</Badge>
						)}

						{isVariousArtists && (
							<Badge variant="destructive">Various Artists</Badge>
						)}
					</span>
				</div>

				<div className="flex items-center gap-4 mt-1">
					<p className="text-sm text-gray-500">{numberOfTracks} tracks</p>
					<p className="text-sm text-gray-500">{numberOfDiscs} discs</p>
				</div>
			</div>

			<div>
				<Button
					variant="ghost"
					onClick={() => {
						console.log("Opening edit dialog for album:", albumId);
						openAlbumEdit(album.id);
					}}
				>
					Edit
				</Button>
			</div>
		</div>
	);
}
