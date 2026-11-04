import type * as API from "@music/api";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import shaka from "shaka-player/dist/shaka-player.compiled.debug";

import { toastManager } from "#/components/base/toast";
import { CONCERT_SUBTITLE_FORMATS } from "#/enums/subtitleEnums";
import { subtitleQueries } from "#/lib/queries/subtitle.queries";
import { subtitleLabel } from "#/lib/utils/subtitles";
import { useConcertPlayerStore } from "#/store/concertPlayerStore";

type CaptionOption = {
	key: string;
	label: string;
	subtitleId: number | string | null;
	url: string | null;
};

type TextTrack = shaka.extern.TextTrack;

function captionOptions(file: API.ConcertFileDetails | null): CaptionOption[] {
	if (!file) return [];
	const embedded = file.file.subtitleVtt;
	return [
		...file.subtitles
			.filter((subtitle) => CONCERT_SUBTITLE_FORMATS.includes(subtitle.format))
			.map((subtitle) => ({
				key: `subtitle:${subtitle.subtitleId}`,
				label: subtitleLabel(subtitle),
				subtitleId: subtitle.subtitleId,
				url: null,
			})),
		...embedded.map((fileObject, index) => ({
			key: `embedded:${fileObject.id}`,
			label: embedded.length > 1 ? `Embedded ${index + 1}` : "Embedded",
			subtitleId: null,
			url: fileObject.url,
		})),
	];
}

const MIME_TYPES: Partial<Record<API.SubtitleFormat, string>> = {
	Vtt: "text/vtt",
	Srt: "text/srt",
	Ass: "text/x-ssa",
	Ttml: "application/ttml+xml",
};

export function useConcertCaptions(
	playerRef: RefObject<shaka.Player | null>,
	file: API.ConcertFileDetails | null,
	loadId: number,
) {
	const options = captionOptions(file);
	const enabled = useConcertPlayerStore((state) => state.captionsOn);
	const setEnabled = useConcertPlayerStore((state) => state.setCaptionsOn);
	const [chosenKey, setChosenKey] = useState<string | null>(null);
	const tracksRef = useRef({ loadId, tracks: new Map<string, TextTrack>() });
	const blobUrlsRef = useRef<string[]>([]);

	useEffect(() => {
		return () => {
			for (const url of blobUrlsRef.current) URL.revokeObjectURL(url);
			blobUrlsRef.current = [];
		};
	}, [loadId]);

	const selected = enabled
		? (options.find((option) => option.key === chosenKey) ?? options.at(0))
		: undefined;

	const { data: subtitle } = useQuery({
		...subtitleQueries.getSubtitle(selected?.subtitleId ?? ""),
		enabled: selected?.subtitleId != null,
	});
	const selectedKey = selected?.key ?? null;
	const embeddedUrl = selected?.url ?? null;
	const label = selected?.label ?? "";
	const ready =
		selected != null &&
		(embeddedUrl != null ||
			String(subtitle?.subtitleId) === String(selected.subtitleId));

	useEffect(() => {
		const player = playerRef.current;
		if (!player || loadId === 0) return;
		if (tracksRef.current.loadId !== loadId) {
			tracksRef.current = { loadId, tracks: new Map() };
		}
		if (!selectedKey || !ready) {
			player.selectTextTrack(null);
			return;
		}

		const tracks = tracksRef.current.tracks;
		const trackKey = embeddedUrl
			? selectedKey
			: `${selectedKey}:${subtitle?.version}`;
		const run = { cancelled: false };
		const reportError = () => {
			if (run.cancelled) return;
			player.selectTextTrack(null);
			toastManager.add({ title: "Could not load subtitles", type: "error" });
		};
		const onTextError = (event: Event) => {
			const error = (event as CustomEvent<shaka.util.Error>).detail;
			if (error.category === shaka.util.Error.Category.TEXT) {
				event.preventDefault();
				reportError();
			}
		};
		player.addEventListener("error", onTextError);
		void (async () => {
			let track = tracks.get(trackKey);
			if (!track) {
				player.selectTextTrack(null);
				let uri = embeddedUrl;
				let mimeType = "text/vtt";
				if (!uri && subtitle) {
					mimeType = MIME_TYPES[subtitle.format] ?? mimeType;
					uri = URL.createObjectURL(
						new Blob([subtitle.content], { type: mimeType }),
					);
					blobUrlsRef.current.push(uri);
				}
				if (!uri) return;
				track = await player.addTextTrackAsync(
					uri,
					"und",
					"subtitles",
					mimeType,
					undefined,
					label,
				);
				tracks.set(trackKey, track);
			}
			if (!run.cancelled && tracksRef.current.loadId === loadId) {
				player.selectTextTrack(track);
			}
		})().catch(reportError);
		return () => {
			run.cancelled = true;
			player.removeEventListener("error", onTextError);
		};
	}, [playerRef, loadId, selectedKey, ready, embeddedUrl, subtitle, label]);

	return {
		options,
		selectedKey,
		select: (key: string | null) => {
			setEnabled(key !== null);
			if (key) setChosenKey(key);
		},
	};
}
