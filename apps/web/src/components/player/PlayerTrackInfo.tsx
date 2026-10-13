import { Link } from "@tanstack/react-router";
import { Music2Icon } from "lucide-react";

import { useTitleLang } from "#/hooks/use-title-lang";
import type { AudioPlayerTrack } from "#/store/audioPlayer/audioPlayerType";

function Cover({ src }: { src?: string }) {
	return (
		<>
			{src ? (
				<img alt="" className="size-full object-cover" src={src} />
			) : (
				<span className="flex size-full items-center justify-center text-muted-foreground">
					<Music2Icon aria-hidden="true" className="size-6" />
				</span>
			)}
			<span className="pointer-events-none absolute inset-0 rounded-lg shadow-[inset_0_0_0_1px_--theme(--color-white/8%)]" />
		</>
	);
}

const linkClassName =
	"rounded-xs outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";

export function PlayerTrackInfo({ track }: { track?: AudioPlayerTrack }) {
	const titleLang = useTitleLang();

	if (!track) {
		return (
			<div className="flex min-w-0 items-center gap-3">
				<span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted md:size-14">
					<Cover />
				</span>
				<div className="flex min-w-0 flex-col">
					<span className="truncate text-sm font-semibold">
						No track selected
					</span>
					<span className="text-xs text-muted-foreground">
						Play an album to start
					</span>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-w-0 items-center gap-3" dir="ltr">
			<Link
				aria-label={`Open ${track.albumTitle}`}
				className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover md:size-14"
				params={{ id: track.albumId }}
				to="/albums/$id"
			>
				<Cover src={track.albumCoverUrl} />
			</Link>
			<div className="flex min-w-0 flex-col">
				<Link
					className={`truncate text-sm font-semibold ${linkClassName}`}
					lang={titleLang(track.languageId, track.albumLanguageId)}
					params={{ id: track.albumId }}
					search={{ track: track.trackId }}
					title={track.title}
					to="/albums/$id"
				>
					{track.title}
				</Link>
				<span className="truncate text-xs text-muted-foreground">
					{track.party.length > 0 ? (
						track.party.map((party, partyIndex) => (
							<span key={party.partyId}>
								{partyIndex > 0 && ", "}
								<Link
									className={linkClassName}
									params={{ id: party.partyId }}
									to="/parties/$id"
								>
									{party.name}
								</Link>
							</span>
						))
					) : (
						<span lang={titleLang(track.albumLanguageId)}>
							{track.albumTitle}
						</span>
					)}
				</span>
			</div>
		</div>
	);
}
