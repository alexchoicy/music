import type WaveSurfer from "wavesurfer.js";

import type { components } from "#/data/APIschema";

type TrackAudio = components["schemas"]["TrackAudioDetails"];

type PlayerStatus = "idle" | "ready" | "playing" | "paused" | "loading";

type RepeatMode = "off" | "one" | "all";

export type AudioPlayerTrack = {
	trackId: string;
	albumId: string;
	albumTitle: string;
	title: string;
	contentType: components["schemas"]["TrackContentType"];
	versionType: components["schemas"]["TrackVersionType"];
	party: {
		partyId: string;
		name: string;
	}[];
	albumCoverUrl: string;
	audio: TrackAudio;
	durationInMs: number;
};

export type AudioPlayerState = {
	queue: AudioPlayerTrack[];
	index: number;
	status: PlayerStatus;
	currentPlayingKey: string | null;
	volume: number;
	muted: boolean;
	hidden: boolean;
	repeatMode: RepeatMode;
	shuffle: boolean;
	playbackQuality: "Auto" | "Original" | "Opus96";
	playTalkTrack: boolean;
	playInstrumental: boolean;
	stopAfterMusicCount: number | null;
};

export type ResolvedPlaybackQuality = Exclude<
	AudioPlayerState["playbackQuality"],
	"Auto"
>;

export type AudioPlayerAction = {
	bindWaveSurfer: (waveSurfer: WaveSurfer | null) => void;
	reloadAudio: (options?: { autoplay?: boolean }) => Promise<void>;
	playAlbum: (album: AudioPlayerTrack[], trackId?: string) => void;
	addToQueue: (track: AudioPlayerTrack[]) => void;
	addNextToQueue: (track: AudioPlayerTrack[]) => void;
	playQueueTrack: (index: number) => void;
	playNext: () => void;
	playPrev: () => void;
	togglePlay: () => Promise<void>;
	toggleRepeatMode: () => void;
	toggleShuffle: () => void;
	pause: () => void;
	setVolume: (volume: number) => void;
	setHidden: (hidden: boolean) => void;
	toggleMute: () => void;
	setPlaybackQuality: (
		playbackQuality: AudioPlayerState["playbackQuality"],
	) => void;
	setPlayTalkTrack: (playTalkTrack: boolean) => void;
	setPlayInstrumental: (playInstrumental: boolean) => void;
	setStopAfterMusicCount: (stopAfterMusicCount: number | null) => void;

	markReady: () => void;
	markPlaying: (playing: boolean) => void;
	markFinished: () => void;
};
