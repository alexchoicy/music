import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useMusicUploadState } from "@/contexts/uploadMusicContext";
import { partyQueries } from "@/lib/queries/party.queries";
import { getMMSSFromMs } from "@/lib/utils/display";
import { Badge } from "../shadcn/badge";
import { Button } from "../shadcn/button";

type UploadAlbumTrackListItemProps = {
	trackId: string;
	// openEdit: (trackId: string) => void;
};

export function UploadAlbumTrackListItem({
	trackId,
	// openEdit,
}: UploadAlbumTrackListItemProps) {
	const { data: parties } = useQuery(partyQueries.getPartySearchList(""));

	const state = useMusicUploadState();
	const track = state.tracks[trackId];

	return (
		<div className="group flex items-center gap-4 py-2 rounded-md hover:bg-accent/50 transition-colors">
			<div className="w-8 text-center">{track.trackNumber}</div>

			<div className="flex-1 min-w-0">
				<div className="flex-row items-center gap-2">
					<div className="truncate">{track.title}</div>
					{track.isMC && (
						<Badge
							variant="secondary"
							className="dark:border-purple-500/50 dark:text-purple-300 border-purple-700/50 text-purple-500 text-xs px-1 py-0"
						>
							MC
						</Badge>
					)}
				</div>

				<div className="text-muted-foreground truncate gap-2">
					{track.trackCredits
						.map(
							(credit) =>
								parties?.find((party) => party.partyId === credit.partyId)
									?.partyName,
						)
						.filter(Boolean)
						.join(", ")}
					{track.unsolvedTrackCredits.length > 0 && (
						<Badge variant="destructive">
							{track.unsolvedTrackCredits.length} unsolved credits
						</Badge>
					)}
				</div>
			</div>

			<div className="text-muted-foreground">
				{getMMSSFromMs(track.durationInMs)}
			</div>

			<div className="w-20 flex text-center justify-end gap-1">
				<Button
					variant="ghost"
					className="h-9 w-9 p-2"
					// onClick={() => openEdit(trackId)}
				>
					<span>Edit</span>
				</Button>
				<Button
					variant="ghost"
					className="h-9 w-9 p-0 hover:bg-red-900/20 hover:text-red-400"
				>
					<X className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
