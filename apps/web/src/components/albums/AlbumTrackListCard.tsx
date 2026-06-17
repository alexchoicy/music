import {
	Disc3Icon,
	ListPlusIcon,
	MoreHorizontalIcon,
	PlayIcon,
} from "lucide-react";

import { Badge } from "#/components/coss/badge";
import { Button } from "#/components/coss/button";
import { Card } from "#/components/coss/card";
import {
	Menu,
	MenuGroup,
	MenuGroupLabel,
	MenuItem,
	MenuPopup,
	MenuTrigger,
} from "#/components/coss/menu";
import { formatDuration } from "#/lib/utils/file";
import { cn } from "#/lib/utils/styles";
import {
	albumDetailsToAudioPlayerTracks,
	albumTrackDetailsToAudioPlayerTrack,
} from "#/store/audioPlayer.ts/audioPlayerFunction";
import { useAudioPlayerStore } from "#/store/audioPlayer.ts/audioPlayerStore";

import { getContentTypeLabel, getCreditNames } from "./albumDetailUtils";
import type { AlbumDetails } from "./albumDetailUtils";

type AlbumTrackListCardProps = {
	album: AlbumDetails;
};

export function AlbumTrackListCard({ album }: AlbumTrackListCardProps) {
	const addToQueue = useAudioPlayerStore((state) => state.addToQueue);
	const playAlbum = useAudioPlayerStore((state) => state.playAlbum);
	const currentTrack = useAudioPlayerStore((state) =>
		state.queue.at(state.index),
	);
	const audioPlayerTracks = albumDetailsToAudioPlayerTracks(album);

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
								const canAddToQueue = track.audios.length > 0;
								const isCurrentTrack =
									currentTrack &&
									track.trackId === currentTrack.trackId &&
									album.albumId === currentTrack.albumId;

								return (
									<div
										className={cn(
											"group/track grid cursor-pointer grid-cols-[2rem_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-sm px-4 py-4 transition-all outline-none hover:bg-muted/35 focus-visible:bg-muted/35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background sm:grid-cols-[3rem_minmax(0,1fr)_auto_auto] sm:px-6",
										)}
										key={track.trackId}
										tabIndex={0}
										onClick={() => {
											if (!canAddToQueue) return;
											playAlbum(audioPlayerTracks, String(track.trackId));
										}}
									>
										<div className="relative flex items-center">
											<span
												className={cn(
													"text-sm tabular-nums transition-opacity",
													isCurrentTrack
														? "text-destructive"
														: "text-muted-foreground",
													"group-hover/track:opacity-0",
												)}
											>
												{track.trackNumber}
											</span>
											<span className="absolute inset-0 flex items-center justify-start opacity-0 transition-opacity group-hover/track:opacity-100">
												<PlayIcon
													aria-hidden="true"
													className={cn(
														"size-4",
														isCurrentTrack
															? "text-destructive"
															: "text-foreground",
													)}
												/>
											</span>
										</div>
										<div className="flex min-w-0 flex-col gap-1">
											<div className="flex min-w-0 flex-wrap items-center gap-1.5">
												<span
													className={cn(
														"min-w-0 truncate font-medium",
														isCurrentTrack && "text-destructive",
													)}
												>
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
										<div onClick={(e) => e.stopPropagation()}>
											<Menu>
												<Button
													aria-label={`Open menu for ${track.title}`}
													className="text-muted-foreground opacity-100 transition-opacity md:opacity-0 md:group-focus-within/track:opacity-100 md:group-hover/track:opacity-100"
													render={<MenuTrigger />}
													size="icon-sm"
													variant="ghost"
												>
													<MoreHorizontalIcon aria-hidden="true" />
												</Button>
												<MenuPopup align="end" className="w-44" sideOffset={6}>
													<MenuGroup>
														<MenuGroupLabel>Playback</MenuGroupLabel>
														<MenuItem
															disabled={!canAddToQueue}
															onClick={() => {
																if (!canAddToQueue) return;

																addToQueue(
																	albumTrackDetailsToAudioPlayerTrack(
																		album,
																		disc,
																		track,
																	),
																);
															}}
														>
															<ListPlusIcon aria-hidden="true" />
															Add to queue
														</MenuItem>
													</MenuGroup>
												</MenuPopup>
											</Menu>
										</div>
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
