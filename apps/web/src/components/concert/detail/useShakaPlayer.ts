import type * as API from "@music/api";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { RefObject } from "react";
import shaka from "shaka-player/dist/shaka-player.compiled.debug";

import { getPresignedUrl } from "#/store/audioPlayer/audioPlayerFunction";

type ConcertFile = API.ConcertFileDetails;
type Playback = { isDash: boolean; url: string; mimeType?: string };
export type AudioTrack = ReturnType<shaka.Player["getAudioTracks"]>[number];

const SHAKA_PLAYER_CONFIG = {
	abr: { enabled: true },
	streaming: {
		bufferBehind: 30,
		bufferingGoal: 30,
		rebufferingGoal: 2,
		retryParameters: {
			backoffFactor: 2,
			baseDelay: 1000,
			fuzzFactor: 0.5,
			maxAttempts: 3,
			timeout: 30000,
		},
	},
	textDisplayer: {
		backgroundOpacity: 0.4,
		characterEdgeStyle: shaka.config.CharacterEdgeStyle.OUTLINE,
	},
};

function getPlayback(concertFile: ConcertFile): Playback {
	if (concertFile.file.dashAV1) {
		return { isDash: true, url: concertFile.file.dashAV1.url };
	}
	const file = concertFile.file.remuxedOriginal ?? concertFile.file.original;
	return { isDash: false, url: file.url, mimeType: file.mimeType };
}

export function useShakaPlayer(
	videoRef: RefObject<HTMLVideoElement | null>,
	containerRef: RefObject<HTMLDivElement | null>,
	currentFile: ConcertFile | null,
) {
	const playerRef = useRef<shaka.Player | null>(null);
	const loadRequestIdRef = useRef(0);
	const loadCountRef = useRef(0);
	const [loadId, setLoadId] = useState(0);
	const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
	const currentFileId = currentFile?.concertFileId;
	const currentPlayback = currentFile ? getPlayback(currentFile) : null;

	async function loadPlayback(
		element: HTMLVideoElement,
		file: ConcertFile,
		loadRequestId: number,
		startTime?: number,
	) {
		const isStale = () => loadRequestId !== loadRequestIdRef.current;
		setLoadId(0);
		const playback = getPlayback(file);
		const url = playback.isDash
			? playback.url
			: await getPresignedUrl(playback.url);
		if (!url || isStale()) return false;

		let player = playerRef.current;
		if (!player) {
			element.removeAttribute("src");
			element.load();
			player = new shaka.Player();
			player.configure(SHAKA_PLAYER_CONFIG);
			player.setVideoContainer(containerRef.current);
			playerRef.current = player;
			await player.attach(element);
			if (isStale()) return false;
		}

		const networkingEngine = player.getNetworkingEngine();
		networkingEngine?.clearAllRequestFilters();
		if (playback.isDash) {
			const manifestOrigin = new URL(url, window.location.href).origin;
			networkingEngine?.registerRequestFilter((_type, request) => {
				const requestUrl = request.uris[0];
				if (
					requestUrl &&
					new URL(requestUrl, window.location.href).origin === manifestOrigin
				) {
					request.allowCrossSiteCredentials = true;
				}
			});
		}

		try {
			await player.load(url, startTime, playback.mimeType);
		} catch (error) {
			if (isStale()) return false;
			throw error;
		}
		if (isStale()) return false;
		setAudioTracks(player.getAudioTracks());
		setLoadId(++loadCountRef.current);
		return true;
	}

	const onLoadFile = useEffectEvent(
		async (element: HTMLVideoElement, id: number) => {
			const file = currentFile;
			if (!file) return;
			setAudioTracks([]);
			if (!(await loadPlayback(element, file, id))) return;
			try {
				await element.play();
			} catch {}
		},
	);

	useEffect(() => {
		const video = videoRef.current;
		if (currentFileId == null || !video) return;

		void onLoadFile(video, ++loadRequestIdRef.current);

		return () => {
			loadRequestIdRef.current++;
		};
	}, [
		videoRef,
		currentFileId,
		currentPlayback?.url,
		currentPlayback?.mimeType,
	]);

	useEffect(() => {
		return () => {
			void playerRef.current?.destroy();
		};
	}, []);

	const reload = () => {
		const file = currentFile;
		const video = videoRef.current;
		if (!file || !video) return;

		const loadRequestId = ++loadRequestIdRef.current;
		const resumeTime = video.currentTime;
		const wasPaused = video.paused;

		void (async () => {
			if (!(await loadPlayback(video, file, loadRequestId, resumeTime))) return;
			if (!wasPaused) void video.play();
		})();
	};

	const selectAudioTrack = (track: AudioTrack) => {
		const player = playerRef.current;
		if (!player) return;
		player.selectAudioTrack(track);
		setAudioTracks(player.getAudioTracks());
	};

	return { playerRef, loadId, audioTracks, selectAudioTrack, reload };
}
