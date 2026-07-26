import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon, MicVocalIcon } from "lucide-react";
import { useState } from "react";

import { ConcertDetails } from "#/components/concerts/ConcertDetails";
import { ConcertFilesPanel } from "#/components/concerts/ConcertFilesPanel";
import { ConcertPlayer } from "#/components/concerts/ConcertPlayer";
import { Button } from "#/components/coss/button";
import { NewEmptyState, NewPage } from "#/components/new/NewPage";
import { concertQueries } from "#/lib/queries/concert.queries";
import { getConcertCoverUrl } from "#/lib/utils/concert";
import { cn } from "#/lib/utils/styles";

export const Route = createFileRoute("/new/_authed/concerts/$id")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(concertQueries.getConcert(params.id)),
	component: RouteComponent,
	errorComponent: () => (
		<NewPage>
			<NewEmptyState
				description="This concert may have been removed, or the server is unavailable."
				icon={<MicVocalIcon />}
				title="Concert unavailable"
			/>
		</NewPage>
	),
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
	const coverUrl = getConcertCoverUrl(concert.coverVariants);

	return (
		<main className="relative min-h-full overflow-hidden">
			{coverUrl ? (
				<div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] overflow-hidden [mask-image:linear-gradient(to_bottom,black,transparent)]">
					<img
						alt=""
						className="absolute -inset-20 size-[calc(100%+10rem)] object-cover opacity-20 blur-3xl saturate-150"
						src={coverUrl}
					/>
					<div className="absolute inset-0 bg-linear-to-b from-background/20 to-background" />
				</div>
			) : null}
			<NewPage className="relative max-w-[1440px] gap-7">
				<Button
					className="w-fit text-muted-foreground"
					render={<Link to="/new/concerts" />}
					size="sm"
					variant="ghost"
				>
					<ArrowLeftIcon />
					Concerts
				</Button>
				<div
					className={cn(
						"grid gap-7",
						isTheaterMode && "xl:grid-cols-[minmax(0,1fr)_21rem]",
					)}
				>
					<section
						className={cn(
							"grid min-w-0 gap-5",
							!isTheaterMode && "xl:grid-cols-[minmax(0,1fr)_21rem]",
							isTheaterMode && "xl:col-span-2",
						)}
					>
						<ConcertPlayer
							currentFile={currentFile}
							isTheaterMode={isTheaterMode}
							onToggleTheaterMode={() => setIsTheaterMode((value) => !value)}
						/>
						{!isTheaterMode ? (
							<ConcertFilesPanel
								className="w-full xl:w-80"
								currentPlayingId={currentFile?.concertFileId}
								files={concert.files}
								onSelectFile={(file) => setCurrentFileId(file.concertFileId)}
							/>
						) : null}
					</section>
					<ConcertDetails concert={concert} routePrefix="/new" />
					{isTheaterMode ? (
						<ConcertFilesPanel
							className="w-full xl:w-80"
							currentPlayingId={currentFile?.concertFileId}
							files={concert.files}
							onSelectFile={(file) => setCurrentFileId(file.concertFileId)}
						/>
					) : null}
				</div>
			</NewPage>
		</main>
	);
}
