import type { LyricText } from "@music/api";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { LocateFixedIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";

import { Button } from "#/components/base/button";
import {
	Menu,
	MenuPopup,
	MenuRadioGroup,
	MenuRadioItem,
	MenuTrigger,
} from "#/components/base/menu";
import { ScrollArea } from "#/components/base/scroll-area";
import { useCueIndex, useLiveCues } from "#/hooks/use-cue-index";
import { useTitleLang } from "#/hooks/use-title-lang";
import { albumQueries } from "#/lib/queries/album.queries";
import { subtitleQueries } from "#/lib/queries/subtitle.queries";
import type { SubtitleSummary } from "#/lib/queries/subtitle.queries";
import { cn } from "#/lib/utils/styles";
import { cuesFromParsed, subtitleLabel } from "#/lib/utils/subtitles";
import type { Cue, Word } from "#/lib/utils/subtitles";
import { useAudioPlayerStore } from "#/store/audioPlayer/audioPlayerStore";
import type { AudioPlayerTrack } from "#/store/audioPlayer/audioPlayerType";

type Choice = {
	subtitleId: string;
	languageId: string | null;
	title: string | null;
};

const toChoice = (subtitle: SubtitleSummary): Choice => ({
	subtitleId: String(subtitle.subtitleId),
	languageId: subtitle.languageId == null ? null : String(subtitle.languageId),
	title: subtitle.title ?? null,
});

export function usePlayerSubtitles(
	track: AudioPlayerTrack | undefined,
	isPanelOpen: boolean,
) {
	const captionsOn = useAudioPlayerStore((state) => state.captionsOn);
	const setCaptionsOn = useAudioPlayerStore((state) => state.setCaptionsOn);
	const [choice, setChoice] = useState<Choice | null>(null);

	const albumQuery = useQuery({
		...albumQueries.getAlbum(track?.albumId ?? ""),
		enabled: !!track,
	});
	const subtitles =
		albumQuery.data?.discs
			.flatMap((disc) => disc.tracks)
			.find((albumTrack) => String(albumTrack.trackId) === track?.trackId)
			?.subtitles ?? [];
	const options = subtitles.map((subtitle) => ({
		subtitle,
		...toChoice(subtitle),
	}));
	const selected =
		(
			options.find((option) => option.subtitleId === choice?.subtitleId) ??
			options.find(
				(option) =>
					option.languageId === choice?.languageId &&
					option.title === choice.title,
			) ??
			options.find((option) => option.languageId === choice?.languageId)
		)?.subtitle ?? subtitles.at(0);

	const lyricsQuery = useQuery({
		...subtitleQueries.getLyrics(selected?.subtitleId ?? ""),
		enabled: !!selected && (captionsOn || isPanelOpen),
	});
	const lyrics = lyricsQuery.data;
	const cues = useMemo<Cue[]>(
		() => (lyrics?.parsed ? cuesFromParsed(lyrics.parsed) : []),
		[lyrics],
	);

	return {
		captionsOn,
		setCaptionsOn,
		select: (subtitle: SubtitleSummary) => setChoice(toChoice(subtitle)),
		subtitles,
		selected,
		lyrics,
		cues,
		isPending:
			albumQuery.isPending || (selected != null && lyricsQuery.isPending),
		isError: albumQuery.isError || lyricsQuery.isError,
	};
}

type PlayerSubtitles = ReturnType<typeof usePlayerSubtitles>;

function ExtraLines({ items }: { items: LyricText[] }) {
	return items.map((item, index) => (
		<span
			className="block text-sm font-normal text-muted-foreground"
			key={`${index}-${item.text}`}
			lang={item.lang ?? undefined}
		>
			{item.text}
		</span>
	));
}

function CueText({
	audioRef,
	cue,
	live,
}: {
	audioRef: RefObject<HTMLAudioElement | null>;
	cue: Cue;
	live: boolean;
}) {
	if (!live || !cue.words) return cue.text;
	return <SungWords audioRef={audioRef} words={cue.words} />;
}

function SungWords({
	audioRef,
	words,
}: {
	audioRef: RefObject<HTMLAudioElement | null>;
	words: Word[];
}) {
	const sung = useCueIndex(audioRef, words);
	return words.map((word, index) => (
		<span
			className={cn(
				"transition-colors duration-150 motion-reduce:transition-none",
				index <= sung ? "text-primary" : "text-foreground",
			)}
			key={`${word.start}-${index}`}
		>
			{word.text}
		</span>
	));
}

function voiceAlignment(voice: NonNullable<Cue["voice"]>) {
	return voice === "other"
		? "text-end"
		: voice === "group"
			? "text-center"
			: "text-start";
}

export function PlayerCaption({
	audioRef,
	subtitles,
}: {
	audioRef: RefObject<HTMLAudioElement | null>;
	subtitles: PlayerSubtitles;
}) {
	const live = useLiveCues(audioRef, subtitles.cues);
	const lang = useTitleLang()(subtitles.selected?.languageId);
	const notice = subtitles.isPending
		? null
		: subtitles.isError
			? "Could not load subtitles."
			: subtitles.subtitles.length === 0
				? "No subtitles for this track."
				: null;

	if (live.length === 0 && !notice) return null;
	return (
		<div className="pointer-events-none absolute inset-x-0 bottom-full mb-2 flex justify-center px-4">
			{live.length > 0 ? (
				<div
					aria-hidden="true"
					className="flex max-w-3xl flex-col gap-1 rounded-4xl bg-popover/85 px-5 py-2 text-center text-base leading-relaxed font-medium text-balance whitespace-pre-line text-foreground shadow-player backdrop-blur-xl"
				>
					{live.map((index) => {
						const cue = subtitles.cues[index];
						return (
							<p
								className={cn(
									live.length > 1 && voiceAlignment(cue.voice ?? "main"),
								)}
								key={index}
							>
								{cue.singer && (
									<span className="block text-xs font-medium text-muted-foreground">
										{cue.singer}
									</span>
								)}
								<span lang={lang}>
									<CueText audioRef={audioRef} cue={cue} live />
								</span>
								<ExtraLines items={cue.translations} />
							</p>
						);
					})}
				</div>
			) : (
				<p
					className="rounded-4xl bg-popover/85 px-4 py-1.5 text-sm text-muted-foreground shadow-player backdrop-blur-xl"
					role="status"
				>
					{notice}
				</p>
			)}
		</div>
	);
}

const SCROLL_KEYS = new Set([
	"ArrowUp",
	"ArrowDown",
	"PageUp",
	"PageDown",
	"Home",
	"End",
]);

function viewportOf(scrollArea: HTMLElement | null) {
	return (
		scrollArea?.querySelector<HTMLElement>(
			'[data-slot="scroll-area-viewport"]',
		) ?? null
	);
}

function centre(
	viewport: HTMLElement | null,
	selector: string,
	instant: boolean,
) {
	const line = viewport?.querySelector<HTMLElement>(selector);
	if (!viewport || !line) return false;
	const offset =
		line.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
	viewport.scrollTo({
		top:
			viewport.scrollTop +
			offset -
			(viewport.clientHeight - line.offsetHeight) / 2,
		behavior:
			instant || matchMedia("(prefers-reduced-motion: reduce)").matches
				? "auto"
				: "smooth",
	});
	return true;
}

export function PlayerSubtitlePanel({
	audioRef,
	subtitles,
	onClose,
}: {
	audioRef: RefObject<HTMLAudioElement | null>;
	subtitles: PlayerSubtitles;
	onClose: () => void;
}) {
	const { selected, cues } = subtitles;
	const lang = useTitleLang()(selected?.languageId);
	const active = useCueIndex(audioRef, cues);
	const live = useLiveCues(audioRef, cues);
	const isDuet = cues.some((cue) => cue.voice === "other");
	const scroller = useRef<HTMLDivElement>(null);
	const router = useRouter();
	const [following, setFollowing] = useState(true);
	const [shownCues, setShownCues] = useState(cues);
	if (shownCues !== cues) {
		setShownCues(cues);
		setFollowing(true);
	}

	const centredCuesRef = useRef<readonly Cue[] | null>(null);
	useEffect(() => {
		if (!following) return;
		const instant = centredCuesRef.current !== cues;
		if (
			centre(viewportOf(scroller.current), `[data-index="${active}"]`, instant)
		)
			centredCuesRef.current = cues;
	}, [active, cues, following]);

	const latest = useRef({ active, following, scrollTop: 0 });
	useEffect(() => {
		latest.current.active = active;
		latest.current.following = following;
	}, [active, following]);
	useEffect(
		() =>
			router.subscribe("onRendered", () => {
				const viewport = viewportOf(scroller.current);
				if (!viewport) return;
				const {
					active: line,
					following: isFollowing,
					scrollTop,
				} = latest.current;
				if (isFollowing) centre(viewport, `[data-index="${line}"]`, true);
				else viewport.scrollTop = scrollTop;
			}),
		[router],
	);

	const stopFollowing = () => setFollowing(false);

	return (
		<section
			aria-label="Subtitles"
			className="relative flex h-[min(45vh,32rem)] w-full max-w-lg flex-col self-center overflow-hidden rounded-4xl bg-popover/85 shadow-player backdrop-blur-xl backdrop-saturate-150"
		>
			<div className="flex items-center gap-2 px-4 pt-3 pb-2">
				{subtitles.subtitles.length > 1 ? (
					<Menu>
						<MenuTrigger render={<Button size="sm" variant="outline" />}>
							{selected && subtitleLabel(selected)}
						</MenuTrigger>
						<MenuPopup align="start" side="top">
							<MenuRadioGroup
								onValueChange={(value) => {
									const picked = subtitles.subtitles.find(
										(subtitle) => String(subtitle.subtitleId) === value,
									);
									if (picked) subtitles.select(picked);
								}}
								value={selected ? String(selected.subtitleId) : undefined}
							>
								{subtitles.subtitles.map((subtitle) => (
									<MenuRadioItem
										key={subtitle.subtitleId}
										value={String(subtitle.subtitleId)}
									>
										{subtitleLabel(subtitle)}
									</MenuRadioItem>
								))}
							</MenuRadioGroup>
						</MenuPopup>
					</Menu>
				) : (
					<p className="text-sm font-medium">
						{selected ? subtitleLabel(selected) : "Subtitles"}
					</p>
				)}
				<Button
					aria-label="Close subtitles"
					className="ms-auto"
					onClick={onClose}
					size="icon"
					variant="ghost"
				>
					<XIcon aria-hidden="true" />
				</Button>
			</div>
			<ScrollArea
				className="min-h-0 flex-1"
				onKeyDown={(event) => {
					if (SCROLL_KEYS.has(event.key)) stopFollowing();
				}}
				onPointerDown={(event) => {
					if (
						event.target instanceof Element &&
						event.target.closest('[data-slot="scroll-area-scrollbar"]')
					)
						stopFollowing();
				}}
				onScrollCapture={(event) => {
					if (event.target instanceof HTMLElement)
						latest.current.scrollTop = event.target.scrollTop;
				}}
				onTouchMove={stopFollowing}
				onWheel={stopFollowing}
				ref={scroller}
			>
				<div className="px-4 pb-4 md:px-6">
					{subtitles.isPending ? (
						<p
							className="py-6 text-center text-sm text-muted-foreground"
							role="status"
						>
							Loading…
						</p>
					) : subtitles.isError ? (
						<p
							className="py-6 text-center text-sm text-destructive-foreground"
							role="alert"
						>
							Could not load subtitles.
						</p>
					) : !selected || !subtitles.lyrics ? (
						<p className="py-6 text-center text-sm text-muted-foreground">
							No subtitles for this track.
						</p>
					) : cues.length > 0 ? (
						<ol className="space-y-0.5">
							{cues.map((cue, index) => {
								const isLive = live.includes(index);
								const alignment = cn(
									cue.voice && voiceAlignment(cue.voice),
									isDuet && cue.voice === "main" && "pe-10",
									isDuet && cue.voice === "other" && "ps-10",
								);
								return (
									<li key={`${cue.start}-${index}`}>
										{cue.singer &&
											(index === 0 ||
												cue.singer !== cues[index - 1].singer) && (
												<p
													className={cn(
														"px-2 py-2 text-xs font-medium text-muted-foreground",
														alignment,
													)}
												>
													{cue.singer}
												</p>
											)}
										<button
											className={cn(
												"min-h-11 w-full rounded-lg px-2 py-2 text-start text-base leading-relaxed whitespace-pre-line transition-colors duration-150 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
												alignment,
												isLive
													? "font-semibold text-primary"
													: "text-muted-foreground",
											)}
											data-index={index}
											onClick={() => {
												const audio = audioRef.current;
												if (audio) audio.currentTime = Math.max(0, cue.start);
												setFollowing(true);
											}}
											type="button"
										>
											<span lang={lang}>
												<CueText audioRef={audioRef} cue={cue} live={isLive} />
											</span>
											<ExtraLines
												items={[
													...(cue.background ? [{ text: cue.background }] : []),
													...cue.romanizations,
													...cue.translations,
												]}
											/>
										</button>
									</li>
								);
							})}
						</ol>
					) : (
						<p
							className="text-base leading-relaxed wrap-anywhere whitespace-pre-wrap"
							lang={lang}
						>
							{subtitles.lyrics.plainText}
						</p>
					)}
				</div>
			</ScrollArea>
			{!following && cues.length > 0 && (
				<div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
					<Button
						className="pointer-events-auto"
						onClick={() => setFollowing(true)}
						size="sm"
						variant="secondary"
					>
						<LocateFixedIcon aria-hidden="true" />
						Sync
					</Button>
				</div>
			)}
		</section>
	);
}
