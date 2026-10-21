import { SettingsIcon } from "lucide-react";

import { Button } from "#/components/base/button";
import { Label } from "#/components/base/label";
import {
	Popover,
	PopoverPopup,
	PopoverTrigger,
} from "#/components/base/popover";
import { Radio, RadioGroup } from "#/components/base/radio-group";
import {
	Select,
	SelectItem,
	SelectPopup,
	SelectTrigger,
	SelectValue,
} from "#/components/base/select";
import { Switch } from "#/components/base/switch";
import type { NowPlayingQuality } from "#/components/player/playbackQuality";
import { QualityBadge } from "#/components/player/QualityBadge";
import { formatMsToMMSSOrHMMSS } from "#/lib/utils/music";
import type {
	AudioPlayerState,
	AudioPlayerTrack,
} from "#/store/audioPlayer/audioPlayerType";

type PlaybackQuality = AudioPlayerState["playbackQuality"];
type StopAfterMusicCount = AudioPlayerState["stopAfterMusicCount"];

type StopAfterMusicOption = { label: string; value: string };

function stopAfterMusicCountToValue(count: StopAfterMusicCount): string {
	return count === null ? "off" : String(count);
}

function stopAfterMusicValueToCount(value: string): StopAfterMusicCount {
	return value === "off" ? null : Number(value);
}

function getStopAfterMusicOptions(
	queue: AudioPlayerTrack[],
	index: number,
): StopAfterMusicOption[] {
	let cumulativeDurationInMs = 0;
	const musicTracks = queue
		.slice(index)
		.filter((track) => track.contentType === "Music");

	return [
		{ label: "Off", value: "off" },
		...musicTracks.map((track, musicIndex) => {
			cumulativeDurationInMs += track.durationInMs;
			const count = musicIndex + 1;
			const label =
				count === 1 && queue[index]?.contentType === "Music"
					? "Stop after this music"
					: `Stop after ${count} music`;

			return {
				label: `${label} (${formatMsToMMSSOrHMMSS(cumulativeDurationInMs)})`,
				value: String(count),
			};
		}),
	];
}

type PlaybackQualitySettingsProps = {
	nowPlaying: NowPlayingQuality | null;
	playTalkTrack: boolean;
	playbackQuality: PlaybackQuality;
	setPlayTalkTrack: (playTalkTrack: boolean) => void;
	setPlaybackQuality: (quality: PlaybackQuality) => void;
	playInstrumental: boolean;
	setPlayInstrumental: (playInstrumental: boolean) => void;
	index: number;
	queue: AudioPlayerTrack[];
	stopAfterMusicCount: StopAfterMusicCount;
	setStopAfterMusicCount: (stopAfterMusicCount: StopAfterMusicCount) => void;
};

export function PlaybackQualitySettings({
	nowPlaying,
	playTalkTrack,
	playbackQuality,
	setPlayTalkTrack,
	setPlaybackQuality,
	playInstrumental,
	setPlayInstrumental,
	index,
	queue,
	stopAfterMusicCount,
	setStopAfterMusicCount,
}: PlaybackQualitySettingsProps) {
	const stopAfterMusicOptions = getStopAfterMusicOptions(queue, index);
	const stopAfterMusicValue = stopAfterMusicCountToValue(stopAfterMusicCount);
	const stopAfterMusicOption = stopAfterMusicOptions.find(
		(option) => option.value === stopAfterMusicValue,
	);
	const stopAfterMusicDescription =
		stopAfterMusicCount === null
			? "Only remaining Music tracks in the queue count."
			: `${stopAfterMusicCount} music left. Non-music tracks do not count.`;

	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button
						aria-label="Playback settings"
						size="icon-lg"
						variant="player"
					/>
				}
			>
				<SettingsIcon aria-hidden="true" />
			</PopoverTrigger>
			<PopoverPopup align="end" className="w-64" side="top" sideOffset={8}>
				<div className="flex flex-col gap-4">
					{nowPlaying && (
						<section aria-label="Now playing" className="flex flex-col gap-2">
							<div className="flex items-center justify-between gap-2">
								<p className="text-sm font-medium">Now playing</p>
								<QualityBadge tier={nowPlaying.tier} />
							</div>
							<dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
								{nowPlaying.stats.map((stat) => (
									<div className="contents" key={stat.label}>
										<dt className="text-muted-foreground">{stat.label}</dt>
										<dd className="truncate text-right tabular-nums">
											{stat.value}
										</dd>
									</div>
								))}
							</dl>
						</section>
					)}
					<div className="flex flex-col gap-1">
						<p className="text-sm font-medium">Playback quality</p>
						<p className="text-xs text-muted-foreground">
							Choose which audio source to use when loading tracks.
						</p>
					</div>
					<RadioGroup
						aria-label="Playback quality"
						onValueChange={(value) => {
							if (
								value === "Auto" ||
								value === "Original" ||
								value === "Opus96"
							) {
								setPlaybackQuality(value);
							}
						}}
						value={playbackQuality}
					>
						<Label className="items-start">
							<Radio value="Auto" />
							<span className="flex flex-col gap-1">
								<span>Auto</span>
								<span className="text-xs font-normal text-muted-foreground">
									Use Opus 96 when phone(GuEsS), otherwise original.
								</span>
							</span>
						</Label>
						<Label className="items-start">
							<Radio value="Original" />
							<span className="flex flex-col gap-1">
								<span>Original</span>
								<span className="text-xs font-normal text-muted-foreground">
									Use the original uploaded file.
								</span>
							</span>
						</Label>
						<Label className="items-start">
							<Radio value="Opus96" />
							<span className="flex flex-col gap-1">
								<span>Opus 96</span>
								<span className="text-xs font-normal text-muted-foreground">
									Use the smaller Opus stream when available.
								</span>
							</span>
						</Label>
					</RadioGroup>
					<Label className="flex items-center justify-between">
						<span className="flex flex-col gap-1">
							<span>Play Talk track</span>
							<span className="text-xs font-normal text-muted-foreground">
								Include Talk tracks during playback.
							</span>
						</span>
						<Switch
							checked={playTalkTrack}
							onCheckedChange={setPlayTalkTrack}
						/>
					</Label>
					<Label className="flex items-center justify-between">
						<span className="flex flex-col gap-1">
							<span>Play Instrumental track</span>
							<span className="text-xs font-normal text-muted-foreground">
								Include Instrumental tracks during playback.
							</span>
						</span>
						<Switch
							checked={playInstrumental}
							onCheckedChange={setPlayInstrumental}
						/>
					</Label>
					<div className="flex flex-col gap-2">
						<Label htmlFor="audio-player-stop-after-music">
							Stop after music
						</Label>
						<Select
							items={stopAfterMusicOptions}
							itemToStringLabel={(option) => option.label}
							itemToStringValue={(option) => option.value}
							onValueChange={(option) => {
								setStopAfterMusicCount(
									stopAfterMusicValueToCount(option?.value ?? "off"),
								);
							}}
							value={stopAfterMusicOption}
						>
							<SelectTrigger id="audio-player-stop-after-music" size="sm">
								<SelectValue placeholder="Off" />
							</SelectTrigger>
							<SelectPopup align="end" side="top">
								{stopAfterMusicOptions.map((option) => (
									<SelectItem key={option.value} value={option}>
										{option.label}
									</SelectItem>
								))}
							</SelectPopup>
						</Select>
						<p className="text-xs text-muted-foreground">
							{stopAfterMusicDescription}
						</p>
					</div>
				</div>
			</PopoverPopup>
		</Popover>
	);
}
