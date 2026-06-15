import { Card, CardHeader, CardPanel, CardTitle } from "#/components/coss/card";
import { formatDate } from "#/lib/utils/date";
import { formatDurationInHoursMinutesSeconds } from "#/lib/utils/music";

import type { AlbumDetails } from "./albumDetailUtils";

type AlbumInfoCardProps = {
	album: AlbumDetails;
};

export function AlbumInfoCard({ album }: AlbumInfoCardProps) {
	const releaseDate = formatDate(album.releaseDate);
	const duration =
		formatDurationInHoursMinutesSeconds(album.totalDurationInMs) ?? "0s";

	return (
		<Card>
			<CardHeader>
				<CardTitle>Album Info</CardTitle>
			</CardHeader>
			<CardPanel className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 text-sm">
				{releaseDate && (
					<>
						<span className="text-muted-foreground">Release Date</span>
						<span className="font-medium">{releaseDate}</span>
					</>
				)}
				<span className="text-muted-foreground">Type</span>
				<span className="font-medium">{album.type}</span>
				<span className="text-muted-foreground">Tracks</span>
				<span className="font-medium tabular-nums">
					{album.totalTrackCount}
				</span>
				<span className="text-muted-foreground">Duration</span>
				<span className="font-medium tabular-nums">{duration}</span>
			</CardPanel>
		</Card>
	);
}
