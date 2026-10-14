import { useHotkey } from "@tanstack/react-hotkeys";
import { useEffect, useEffectEvent, useRef } from "react";

import type { ExtraAssetDetails } from "#/lib/queries/extra.queries";
import { useAudioPlayerStore } from "#/store/audioPlayer/audioPlayerStore";

import {
	getAssetContentUrl,
	getAssetName,
	getAssetThumbnailUrl,
} from "./extraAssets";

const MEDIA_SESSION_ACTIONS = ["play", "pause"] as const;

// Space activates a focused control itself; the hotkey only covers the rest of the dialog.
function isInteractive(element: Element | null) {
	return (
		element instanceof HTMLButtonElement ||
		element instanceof HTMLAnchorElement ||
		element instanceof HTMLInputElement ||
		element instanceof HTMLMediaElement
	);
}

// While shown, the extra owns playback: music pauses when it plays, and Space and
// the media keys control it instead of the player bar.
export function ExtraMedia({
	asset,
	className,
}: {
	asset: ExtraAssetDetails;
	className?: string;
}) {
	const mediaRef = useRef<HTMLMediaElement | null>(null);
	const setAudioPlayerHidden = useAudioPlayerStore((state) => state.setHidden);
	const pauseAudioPlayer = useAudioPlayerStore((state) => state.pause);
	const audioPlayerHidden = useAudioPlayerStore((state) => state.hidden);
	const name = getAssetName(asset);

	useEffect(() => {
		setAudioPlayerHidden(true);
		return () => setAudioPlayerHidden(false);
	}, [setAudioPlayerHidden]);

	const onMediaSessionPlay = useEffectEvent(() => {
		void mediaRef.current?.play();
	});
	const onMediaSessionPause = useEffectEvent(() => {
		mediaRef.current?.pause();
	});

	function syncMediaSession(state: MediaSessionPlaybackState) {
		if (!("mediaSession" in navigator)) return;
		navigator.mediaSession.metadata = new MediaMetadata({ title: name });
		navigator.mediaSession.playbackState = state;
	}

	const onMediaSessionAcquired = useEffectEvent(() => {
		syncMediaSession(mediaRef.current?.paused === false ? "playing" : "paused");
	});

	// Registers only once the player bar is hidden: effect cleanups run before new effects
	// in a commit, so the player bar releases the media session before this claims it.
	useEffect(() => {
		if (!("mediaSession" in navigator) || !audioPlayerHidden) return;
		onMediaSessionAcquired();
		const handlers: Record<
			(typeof MEDIA_SESSION_ACTIONS)[number],
			MediaSessionActionHandler
		> = { pause: onMediaSessionPause, play: onMediaSessionPlay };
		for (const action of MEDIA_SESSION_ACTIONS) {
			try {
				navigator.mediaSession.setActionHandler(action, handlers[action]);
			} catch {
				// Unsupported action.
			}
		}
		return () => {
			for (const action of MEDIA_SESSION_ACTIONS) {
				try {
					navigator.mediaSession.setActionHandler(action, null);
				} catch {
					// Unsupported action.
				}
			}
			navigator.mediaSession.metadata = null;
			navigator.mediaSession.playbackState = "none";
		};
	}, [audioPlayerHidden]);

	useHotkey(
		"Space",
		(event) => {
			const media = mediaRef.current;
			if (!media || isInteractive(document.activeElement)) return;
			event.preventDefault();
			if (media.paused) void media.play();
			else media.pause();
		},
		{
			conflictBehavior: "allow",
			preventDefault: false,
			stopPropagation: false,
		},
	);

	const mediaProps = {
		"aria-label": name,
		className,
		controls: true,
		onPause: () => syncMediaSession("paused"),
		onPlay: () => {
			pauseAudioPlayer();
			syncMediaSession("playing");
		},
		preload: "metadata",
		src: getAssetContentUrl(asset),
	} as const;

	return asset.fileType === "Video" ? (
		// oxlint-disable-next-line jsx-a11y/media-has-caption -- extras carry no caption tracks
		<video
			{...mediaProps}
			poster={getAssetThumbnailUrl(asset)}
			ref={(element) => {
				mediaRef.current = element;
			}}
		/>
	) : (
		// oxlint-disable-next-line jsx-a11y/media-has-caption -- extras carry no caption tracks
		<audio
			{...mediaProps}
			ref={(element) => {
				mediaRef.current = element;
			}}
		/>
	);
}
