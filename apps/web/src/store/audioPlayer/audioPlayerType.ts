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
	volume: number;
	muted: boolean;
	hidden: boolean;
	repeatMode: RepeatMode;
	shuffle: boolean;
	playbackQuality: "Auto" | "Original" | "Opus96";
};

export type AudioPlayerAction = {
	bindWaveSurfer: (waveSurfer: WaveSurfer | null) => void;
	playAlbum: (album: AudioPlayerTrack[], trackId?: string) => void;
	addToQueue: (track: AudioPlayerTrack) => void;
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

	markReady: () => void;
	markPlaying: (playing: boolean) => void;
	markFinished: () => void;
};
