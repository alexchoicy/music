import type * as API from "@music/api";
import { useEffect, useState } from "react";

import type { CroppedArea } from "#/store/albumUploadStoreType";

type ImageSize = { width: number; height: number };

export function guessCoverTitle(videoTitle: string) {
	const quotedTitle = videoTitle
		.match(/《([^》]+)》|『([^』]+)』/)
		?.slice(1)
		.find(Boolean)
		?.trim();
	if (quotedTitle) return quotedTitle;

	const withoutTags = videoTitle
		.replace(/【[^】]*】|\[[^\]]*\]|「|」/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	const [firstSegment] = withoutTags.split(/\s+[/／|｜]\s+/);
	const withoutCredit = firstSegment
		.replace(/\s*[(（]?\s*(covered by|cover by|cover)\b.*$/i, "")
		.trim();

	return withoutCredit || withoutTags || videoTitle;
}

export function pickSuggestedPartyIds(
	suggestions: API.YouTubePartySuggestion[],
) {
	const linked = suggestions.filter(
		(suggestion) => suggestion.matchedBy === "ChannelLink",
	);
	const picked =
		linked.length > 0 ? linked : suggestions.length === 1 ? suggestions : [];

	return picked.map((suggestion) => Number(suggestion.partyId));
}

export function centeredSquareCrop({ width, height }: ImageSize): CroppedArea {
	const size = Math.min(width, height);

	return {
		height: size,
		width: size,
		x: Math.round((width - size) / 2),
		y: Math.round((height - size) / 2),
	};
}

export function useImageSize(src: string | null | undefined) {
	const [size, setSize] = useState<ImageSize | null>(null);

	useEffect(() => {
		setSize(null);
		if (!src) return;

		const image = new Image();
		image.onload = () =>
			setSize({ width: image.naturalWidth, height: image.naturalHeight });
		image.src = src;

		return () => {
			image.onload = null;
		};
	}, [src]);

	return size;
}
