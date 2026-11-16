import type * as API from "@music/api";
import { useEffect, useEffectEvent } from "react";
import type { RefObject } from "react";

const POSITION_EVENTS = [
	"durationchange",
	"ratechange",
	"seeked",
	"timeupdate",
];

export function useConcertMediaSession({
	videoRef,
	file,
	isPlaying,
	enabled,
	seekBy,
}: {
	videoRef: RefObject<HTMLVideoElement | null>;
	file: API.ConcertFileDetails | null;
	isPlaying: boolean;
	enabled: boolean;
	seekBy: (seconds: number) => void;
}) {
	const hasFile = file !== null;

	const onPlay = useEffectEvent(() => {
		if (file) void videoRef.current?.play();
	});
	const onPause = useEffectEvent(() => {
		videoRef.current?.pause();
	});
	const onSeekBackward = useEffectEvent((details: MediaSessionActionDetails) =>
		seekBy(-(details.seekOffset ?? 10)),
	);
	const onSeekForward = useEffectEvent((details: MediaSessionActionDetails) =>
		seekBy(details.seekOffset ?? 10),
	);
	const onSeekTo = useEffectEvent((details: MediaSessionActionDetails) => {
		const video = videoRef.current;
		if (details.seekTime === undefined || !video) return;
		if (details.fastSeek && "fastSeek" in video) {
			video.fastSeek(details.seekTime);
			return;
		}
		video.currentTime = details.seekTime;
	});

	useEffect(() => {
		if (!("mediaSession" in navigator)) return;
		const artwork = file
			? (file.file.attachedPicture?.url ?? file.file.thumbnail640x360?.url)
			: null;
		navigator.mediaSession.metadata = file
			? new MediaMetadata({
					artwork: artwork ? [{ src: artwork }] : undefined,
					title: file.title,
				})
			: null;
		navigator.mediaSession.playbackState = file
			? isPlaying
				? "playing"
				: "paused"
			: "none";
	}, [file, isPlaying]);

	useEffect(() => {
		const video = videoRef.current;
		if (!("mediaSession" in navigator) || !hasFile || !video) return;
		const syncPosition = () => {
			const duration = video.duration;
			if (!Number.isFinite(duration) || duration <= 0) return;
			try {
				navigator.mediaSession.setPositionState({
					duration,
					playbackRate: video.playbackRate,
					position: Math.min(video.currentTime, duration),
				});
			} catch {}
		};
		for (const event of POSITION_EVENTS) {
			video.addEventListener(event, syncPosition);
		}
		return () => {
			for (const event of POSITION_EVENTS) {
				video.removeEventListener(event, syncPosition);
			}
		};
	}, [hasFile, videoRef]);

	useEffect(() => {
		if (!("mediaSession" in navigator) || !hasFile || !enabled) return;
		const actions: [MediaSessionAction, MediaSessionActionHandler][] = [
			["play", onPlay],
			["pause", onPause],
			["seekbackward", onSeekBackward],
			["seekforward", onSeekForward],
			["seekto", onSeekTo],
		];
		for (const [action, handler] of actions) {
			try {
				navigator.mediaSession.setActionHandler(action, handler);
			} catch {}
		}
		return () => {
			for (const [action] of actions) {
				try {
					navigator.mediaSession.setActionHandler(action, null);
				} catch {}
			}
			navigator.mediaSession.metadata = null;
			navigator.mediaSession.playbackState = "none";
		};
	}, [enabled, hasFile]);
}
