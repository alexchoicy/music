import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { User } from "lucide-react";
import { Suspense } from "react";
import { AlbumInfoCard } from "@/components/album/albumInfoCard";
import { AlbumTrackList } from "@/components/album/albumTrackList";
import { Avatar, AvatarFallback } from "@/components/shadcn/avatar";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/shadcn/card";
import { AppLayout } from "@/components/ui/appLayout";
import { useAudioPlayer } from "@/contexts/audioPlayerContext";
import { albumQueries } from "@/lib/queries/album.queries";
import { buildAudioPlayerItem } from "@/lib/utils/music";

export const Route = createFileRoute("/_authed/albums/$id")({
	component: RouteComponent,
	loader: ({ context, params }) => {
		const { id } = params;

		context.queryClient.ensureQueryData(albumQueries.item(id));
	},
});

function RouteComponent() {
	return (
		<AppLayout>
			<Suspense fallback={<div>Loading...</div>}>
				<AlbumContent />
			</Suspense>
		</AppLayout>
	);
}

function AlbumContent() {
	const { id } = Route.useParams();
	const { data: album } = useSuspenseQuery(albumQueries.item(id));

	const trackParties = album.discs.flatMap((disc) =>
		disc.tracks.flatMap((track) => track.credits.map((credit) => credit.name)),
	);

	const { playWithPlaylist, playWithPlaylistByTrackId } = useAudioPlayer();

	const handlePlay = (trackId?: number) => {
		const items = buildAudioPlayerItem(album);

		if (trackId) {
			playWithPlaylistByTrackId(items, trackId);
		} else {
			playWithPlaylist(items);
		}
	};

	return (
		<div className="flex flex-col gap-4">
			<AlbumInfoCard album={album} handlePlay={handlePlay} />
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<Card className="lg:col-span-2">
					<AlbumTrackList album={album} />
				</Card>
				<Card className="h-max">
					<CardHeader>
						<CardTitle>Parties</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{trackParties.length > 0 &&
							Array.from(new Set(trackParties)).map((party) => (
								<div
									key={party}
									className="flex items-center gap-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer p-2"
								>
									<Avatar>
										{/*<AvatarImage :src="artist.image" />*/}
										<AvatarFallback>
											<User className="size-fit" />
										</AvatarFallback>
									</Avatar>
									<div className="flex-1 min-w-0">
										<h4 className="text-muted-foreground truncate font-medium">
											{party}
										</h4>
									</div>
								</div>
							))}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
