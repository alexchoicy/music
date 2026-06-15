import { Disc3Icon } from "lucide-react";

import { Badge } from "#/components/coss/badge";
import { Card } from "#/components/coss/card";
import { formatDuration } from "#/lib/utils/file";

import { getContentTypeLabel, getCreditNames } from "./albumDetailUtils";
import type { AlbumDetails } from "./albumDetailUtils";

type AlbumTrackListCardProps = {
	album: AlbumDetails;
};

export function AlbumTrackListCard({ album }: AlbumTrackListCardProps) {
	return (
		<Card className="overflow-hidden">
			{album.discs.map((disc) => {
				return (
					<section className="border-b last:border-b-0" key={disc.albumDiscId}>
						{album.discs.length > 1 && (
							<div className="flex items-center justify-between gap-4 bg-muted/35 px-4 py-3 text-sm sm:px-6">
								<div className="flex min-w-0 items-center gap-2 font-semibold tracking-wide text-muted-foreground uppercase">
									<Disc3Icon aria-hidden="true" className="size-4 shrink-0" />
									<span className="truncate">
										Disc {disc.discNumber}
										{disc.subtitle ? ` - ${disc.subtitle}` : ""}
									</span>
								</div>
								<span className="shrink-0 text-muted-foreground">
									{disc.tracks.length} track
									{disc.tracks.length === 1 ? "" : "s"}
								</span>
							</div>
						)}

						<div className="divide-y">
							{disc.tracks.map((track) => {
								const trackCreditNames = getCreditNames(track.credits);

								return (
									<div
										className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 transition-colors hover:bg-muted/35 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:px-6"
										key={track.trackId}
									>
										<span className="text-sm text-muted-foreground tabular-nums">
											{track.trackNumber}
										</span>
										<div className="flex min-w-0 flex-col gap-1">
											<div className="flex min-w-0 flex-wrap items-center gap-1.5">
												<span className="min-w-0 truncate font-medium">
													{track.title}
												</span>
												{track.versionType !== "Original" && (
													<Badge size="sm" variant="secondary">
														{track.versionType}
													</Badge>
												)}
												{track.contentType !== "Music" && (
													<Badge size="sm" variant="info">
														{getContentTypeLabel(track.contentType)}
													</Badge>
												)}
											</div>
											<p className="truncate text-sm text-muted-foreground">
												{trackCreditNames || "No credits"}
											</p>
										</div>
										<span className="text-sm text-muted-foreground tabular-nums">
											{formatDuration(Number(track.durationInMs)) ?? "0:00"}
										</span>
									</div>
								);
							})}
						</div>
					</section>
				);
			})}
		</Card>
	);
}
