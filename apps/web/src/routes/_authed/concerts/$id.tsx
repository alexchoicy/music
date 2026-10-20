import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { ConcertFileList } from "#/components/concert/detail/ConcertFileList";
import {
	ConcertAlbums,
	ConcertHeading,
	ConcertPerformers,
} from "#/components/concert/detail/ConcertInfo";
import { ConcertVideoPlayer } from "#/components/concert/detail/ConcertVideoPlayer";
import { concertQueries } from "#/lib/queries/concert.queries";
import { getConcertCoverUrl } from "#/lib/utils/concert";
import { rethrowNotFound } from "#/lib/utils/routing";
import { cn } from "#/lib/utils/styles";

export const Route = createFileRoute("/_authed/concerts/$id")({
	loader: ({ context, params }) => {
		return context.queryClient
			.query({
				...concertQueries.getConcert(params.id),
				staleTime: "static",
			})
			.catch(rethrowNotFound);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	const { data: concert } = useSuspenseQuery(concertQueries.getConcert(id));
	const [isTheaterMode, setIsTheaterMode] = useState(false);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentFileId, setCurrentFileId] = useState<
		(typeof concert.files)[number]["concertFileId"] | null
	>(null);
	const files = [...concert.files].sort(
		(a, b) => Number(a.order) - Number(b.order),
	);
	const currentFile =
		files.find((file) => file.concertFileId === currentFileId) ?? null;
	const coverUrl = getConcertCoverUrl(concert.coverVariants);

	return (
		<main className="relative min-h-full w-full overflow-hidden">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 top-0 h-[480px] overflow-hidden"
			>
				{coverUrl && (
					<img
						alt=""
						className="absolute -inset-20 size-[calc(100%+10rem)] object-cover opacity-60 blur-[64px] saturate-[1.3]"
						src={coverUrl}
					/>
				)}
				<div className="absolute inset-0 bg-linear-to-b from-background/20 via-background/94 via-80% to-background" />
			</div>

			<div className="relative grid grid-cols-1 items-start gap-x-8 gap-y-10 px-4 pt-6 pb-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:grid-rows-[auto_1fr]">
				<div className={cn("min-w-0", isTheaterMode && "lg:col-span-2")}>
					<ConcertVideoPlayer
						coverUrl={coverUrl}
						currentFile={currentFile}
						files={files}
						isTheaterMode={isTheaterMode}
						onPlayingChange={setIsPlaying}
						onSelectFile={(file) => setCurrentFileId(file.concertFileId)}
						onToggleTheaterMode={() => setIsTheaterMode((value) => !value)}
					/>
				</div>

				<div
					className={cn(
						"flex min-w-0 flex-col gap-10 lg:col-start-2",
						isTheaterMode ? "lg:row-start-2" : "lg:row-span-2 lg:row-start-1",
					)}
				>
					<ConcertFileList
						currentFileId={currentFile?.concertFileId ?? null}
						files={files}
						isPlaying={isPlaying}
						onSelectFile={(file) => setCurrentFileId(file.concertFileId)}
					/>
					<ConcertPerformers concert={concert} />
				</div>

				<div className="flex min-w-0 flex-col gap-10 lg:col-start-1 lg:row-start-2">
					<ConcertHeading concert={concert} />
					<ConcertAlbums concert={concert} />
				</div>
			</div>
		</main>
	);
}
