import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { ConcertDetails } from "#/components/concerts/ConcertDetails";
import { ConcertFilesPanel } from "#/components/concerts/ConcertFilesPanel";
import { ConcertPlayer } from "#/components/concerts/ConcertPlayer";
import { concertQueries } from "#/lib/queries/concert.queries";
import { getCoverUrl } from "#/lib/utils/album";
import { cn } from "#/lib/utils/styles";

export const Route = createFileRoute("/_authed/concerts/$id")({
	loader: ({ context, params }) => {
		return context.queryClient.ensureQueryData(
			concertQueries.getConcert(params.id),
		);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	const { data: concert } = useSuspenseQuery(concertQueries.getConcert(id));
	const [isTheaterMode, setIsTheaterMode] = useState(false);
	const [currentFileId, setCurrentFileId] = useState<
		(typeof concert.files)[number]["concertFileId"] | null
	>(null);
	const currentFile =
		concert.files.find((file) => file.concertFileId === currentFileId) ?? null;
	const coverUrl = getCoverUrl(concert.coverVariants);

	return (
		<main className="relative min-h-full w-full overflow-hidden bg-background text-foreground">
			<div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] overflow-hidden [mask-image:var(--concert-bg-mask)] [--concert-bg-mask:linear-gradient(to_bottom,black_0%,black_55%,transparent_100%)]">
				{coverUrl && (
					<img
						alt=""
						className="absolute -inset-16 h-[calc(100%+8rem)] w-[calc(100%+8rem)] scale-110 object-cover opacity-30 blur-3xl saturate-150"
						src={coverUrl}
					/>
				)}
				<div className="absolute inset-0 bg-linear-to-b from-background/20 via-background/85 to-background" />
			</div>

			<div
				className={cn(
					"relative gap-6 p-4 sm:p-6",
					isTheaterMode
						? "grid xl:grid-cols-[minmax(0,1fr)_22rem]"
						: "flex flex-col",
				)}
			>
				<section
					className={cn(
						"gap-5",
						isTheaterMode
							? "xl:col-span-2"
							: "grid xl:grid-cols-[minmax(0,1fr)_22rem]",
					)}
				>
					<ConcertPlayer
						currentFile={currentFile}
						isTheaterMode={isTheaterMode}
						onToggleTheaterMode={() => setIsTheaterMode((value) => !value)}
					/>
					{!isTheaterMode && (
						<ConcertFilesPanel
							currentPlayingId={currentFile?.concertFileId}
							files={concert.files}
							onSelectFile={(file) => setCurrentFileId(file.concertFileId)}
						/>
					)}
				</section>
				<ConcertDetails concert={concert} />

				{isTheaterMode && (
					<ConcertFilesPanel
						currentPlayingId={currentFile?.concertFileId}
						files={concert.files}
						onSelectFile={(file) => setCurrentFileId(file.concertFileId)}
					/>
				)}
			</div>
		</main>
	);
}
