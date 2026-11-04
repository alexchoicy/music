import type * as API from "@music/api";

import { SUBTITLE_FORMAT } from "#/enums/subtitleEnums";

type LyricLine = API.LyricLine;
type LyricWord = API.LyricWord;
type LyricText = API.LyricText;

export type Word = {
	start: number;
	text: string;
};

export type Cue = {
	start: number;
	end: number;
	text: string;
	words?: Word[];
	translations: LyricText[];
	romanizations: LyricText[];
	background?: string;
	voice?: "main" | "other" | "group";
	singer?: string;
};

export type LyricsParseResult =
	| { parsed: API.ParsedLyrics }
	| { error: string };

const LINE_STAMP = /\[(\d+):(\d{2})(?:[.:](\d{1,3}))?\]/g;
const WORD_STAMP = /<(\d+):(\d{2})(?:[.:](\d{1,3}))?>/g;
const OFFSET_TAG = /^\s*\[offset:\s*([+-]?\d+)\s*\]/im;

function stampTime(stamp: RegExpExecArray) {
	return (
		Number(stamp[1]) * 60 + Number(stamp[2]) + Number(`0.${stamp[3] || 0}`)
	);
}

function parseWords(body: string, lineStart: number): LyricWord[] | undefined {
	const stamps = [...body.matchAll(WORD_STAMP)];
	if (stamps.length === 0) return undefined;

	const words: LyricWord[] = [];
	const lead = body.slice(0, stamps[0].index).trimStart();
	if (lead)
		words.push({ start: lineStart, end: stampTime(stamps[0]), text: lead });
	stamps.forEach((stamp, index) => {
		const next = stamps.at(index + 1);
		const text = body.slice(stamp.index + stamp[0].length, next?.index);
		if (text)
			words.push({
				start: stampTime(stamp),
				end: next ? stampTime(next) : undefined,
				text,
			});
	});
	const last = words.at(-1);
	if (last) last.text = last.text.trimEnd();
	return words.some((word) => word.text.trim()) ? words : undefined;
}

export function parseLyrics(
	content: string,
	format: API.SubtitleFormat,
): LyricsParseResult {
	if (format === "Lrc") return parseLrc(content);
	if (format === "Ttml") return parseTtml(content);
	return { error: "Only LRC and TTML lyrics are parsed." };
}

function parseLrc(content: string): LyricsParseResult {
	const text = content.replace(/\r/g, "");
	const offset = Number(OFFSET_TAG.exec(text)?.[1] ?? 0) / 1000;

	const timed: (Omit<LyricLine, "end"> & { end?: number })[] = [];
	for (const line of text.split("\n")) {
		const stamps = [...line.matchAll(LINE_STAMP)];
		if (stamps.length === 0) continue;
		const body = line.replace(LINE_STAMP, "");
		const first = stampTime(stamps[0]);
		const words = parseWords(body, first);
		const lineText = (
			words ? words.map((word) => word.text).join("") : body
		).trim();
		const wordEnd = words?.at(-1)?.end;
		for (const stamp of stamps) {
			const shift = stampTime(stamp) - first - offset;
			timed.push({
				start: Math.max(0, first + shift),
				end: wordEnd == null ? undefined : Math.max(0, Number(wordEnd) + shift),
				text: lineText,
				words: words?.map((word) => ({
					start: Math.max(0, Number(word.start) + shift),
					end:
						word.end == null
							? undefined
							: Math.max(0, Number(word.end) + shift),
					text: word.text,
				})),
			});
		}
	}
	if (!timed.some((line) => line.text))
		return { error: "No timed lines found in this LRC." };

	timed.sort((a, b) => Number(a.start) - Number(b.start));
	const lines: LyricLine[] = [];
	for (let index = 0; index < timed.length;) {
		const start = Number(timed[index].start);
		let next = index + 1;
		while (next < timed.length && Number(timed[next].start) === start) next++;
		const end = next < timed.length ? timed[next].start : start + 10;
		for (; index < next; index++) {
			const line = timed[index];
			if (line.text) lines.push({ ...line, end: line.end ?? end });
		}
	}
	return {
		parsed: {
			singers: [],
			lines,
		},
	};
}

const TTML_METADATA = "http://www.w3.org/ns/ttml#metadata";
const XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";

function ttmlTime(value: string | null): number | null {
	if (!value) return null;
	const clock = /^(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)$/.exec(value);
	if (clock) {
		return (
			Number(clock[1] || 0) * 3600 + Number(clock[2]) * 60 + Number(clock[3])
		);
	}
	const offset = /^(\d+(?:\.\d+)?)(h|m|s|ms)?$/.exec(value);
	if (!offset) return null;
	const scale = { h: 3600, m: 60, s: 1, ms: 0.001 }[offset[2] || "s"] ?? 1;
	return Number(offset[1]) * scale;
}

const collapse = (text: string) => text.replace(/\s+/g, " ");

function mainText(element: Element): string {
	let text = "";
	for (const node of Array.from(element.childNodes)) {
		if (node.nodeType === 3) text += node.textContent ?? "";
		else if (node instanceof Element && !ttmlRole(node)) text += mainText(node);
	}
	return text;
}

function ttmlRole(element: Element) {
	return (
		element.getAttributeNS(TTML_METADATA, "role") ??
		element.getAttribute("ttm:role")
	);
}

function xmlLang(element: Element) {
	return (
		element.getAttributeNS(XML_NAMESPACE, "lang") ??
		element.getAttribute("xml:lang") ??
		undefined
	);
}

const singerKind = (type: string): API.LyricSingerKind =>
	type === "group" ? "Group" : type === "person" ? "Person" : "Other";

function parseTtml(content: string): LyricsParseResult {
	const doc = parseTtmlDocument(content);
	if (!doc) return { error: "This TTML isn't valid XML." };

	const singers = new Map<string, API.LyricSinger>(
		agentsOf(doc).map((agent) => [
			agent.id,
			{ id: agent.id, name: agent.name || null, kind: singerKind(agent.type) },
		]),
	);

	const lines: LyricLine[] = [];
	for (const p of Array.from(doc.getElementsByTagNameNS("*", "p"))) {
		const start = ttmlTime(p.getAttribute("begin"));
		if (start === null) continue;
		const words: LyricWord[] = [];
		const translations: LyricText[] = [];
		const romanizations: LyricText[] = [];
		const background: string[] = [];
		let lead = "";
		const append = (text: string) => {
			const last = words.at(-1);
			if (last) last.text += text;
			else lead += text;
		};

		for (const node of Array.from(p.childNodes)) {
			if (node.nodeType === 3) {
				append(node.textContent ?? "");
				continue;
			}
			if (!(node instanceof Element)) continue;
			const role = ttmlRole(node);
			if (role === "x-translation" || role === "x-roman") {
				const text = collapse(node.textContent).trim();
				if (text)
					(role === "x-translation" ? translations : romanizations).push({
						text,
						lang: xmlLang(node),
					});
			} else if (role === "x-bg") {
				background.push(collapse(mainText(node)).trim());
			} else {
				const begin = ttmlTime(node.getAttribute("begin"));
				if (begin === null) append(mainText(node));
				else
					words.push({
						start: begin,
						end: ttmlTime(node.getAttribute("end")),
						text: mainText(node),
					});
			}
		}

		const leadText = collapse(lead).trim();
		let text = leadText;
		if (words.length > 0) {
			for (const word of words) word.text = collapse(word.text);
			if (leadText) words.unshift({ start, text: `${leadText} ` });
			words[0].text = words[0].text.trimStart();
			const last = words[words.length - 1];
			last.text = last.text.trimEnd();
			text = words.map((word) => word.text).join("");
		}
		const backgroundText = background.filter(Boolean).join(" ");
		if (!text && !backgroundText) continue;

		const agentIds = (
			p.getAttributeNS(TTML_METADATA, "agent") ??
			p.getAttribute("ttm:agent") ??
			""
		)
			.split(/\s+/)
			.filter(Boolean);
		for (const id of agentIds)
			if (!singers.has(id)) singers.set(id, { id, kind: "Other" });

		lines.push({
			start,
			end: ttmlTime(p.getAttribute("end")) ?? start + 10,
			text,
			singers: agentIds,
			words: words.length > 0 ? words : undefined,
			background: backgroundText || undefined,
			translations,
			romanizations,
		});
	}
	if (lines.length === 0)
		return { error: "No timed lines found in this TTML." };

	lines.sort((a, b) => Number(a.start) - Number(b.start));
	return {
		parsed: {
			singers: [...singers.values()],
			lines,
		},
	};
}

const SIMPLIFIED_CHINESE = /^zh-(cn|sg|hans)(-|$)/i;

const isSimplifiedChinese = (item: LyricText) =>
	!!item.lang && SIMPLIFIED_CHINESE.test(item.lang);

export async function withHongKongChinese(
	parsed: API.ParsedLyrics,
): Promise<API.ParsedLyrics> {
	if (
		!parsed.lines.some((line) =>
			(line.translations ?? []).some(isSimplifiedChinese),
		)
	)
		return parsed;
	const { Converter } = await import("opencc-js/cn2t");
	const convert = Converter({ from: "cn", to: "hk" });
	return {
		...parsed,
		lines: parsed.lines.map((line) => ({
			...line,
			translations: line.translations?.map((translation) =>
				isSimplifiedChinese(translation)
					? { text: convert(translation.text), lang: "zh-HK" }
					: translation,
			),
		})),
	};
}

export function cuesFromParsed(parsed: API.ParsedLyrics): Cue[] {
	const singers = new Map(
		(parsed.singers ?? []).map((singer) => [singer.id, singer]),
	);
	const main = parsed.lines
		.map((line) => line.singers ?? [])
		.find(
			(ids) => ids.length === 1 && singers.get(ids[0])?.kind !== "Group",
		)?.[0];
	return parsed.lines.map((line) => {
		const ids = line.singers ?? [];
		const names = ids
			.map((id) => singers.get(id)?.name)
			.filter((name): name is string => !!name);
		return {
			start: Number(line.start),
			end: Number(line.end),
			text: line.text,
			words: line.words?.length
				? line.words.map((word) => ({
						start: Number(word.start),
						text: word.text,
					}))
				: undefined,
			translations: line.translations ?? [],
			romanizations: line.romanizations ?? [],
			background: line.background ?? undefined,
			voice:
				ids.length === 0
					? undefined
					: ids.length > 1 ||
						  ids.some((id) => singers.get(id)?.kind === "Group")
						? "group"
						: ids[0] === main
							? "main"
							: "other",
			singer: names.length > 0 ? names.join(" & ") : undefined,
		};
	});
}

export type TtmlAgent = { id: string; type: string; name: string };

function parseTtmlDocument(content: string) {
	if (typeof DOMParser === "undefined") return null;
	const doc = new DOMParser().parseFromString(content, "application/xml");
	return doc.getElementsByTagName("parsererror").length > 0 ? null : doc;
}

function agentNames(agent: Element) {
	return Array.from(agent.getElementsByTagNameNS(TTML_METADATA, "name"));
}

function agentElements(doc: Document) {
	return Array.from(doc.getElementsByTagNameNS(TTML_METADATA, "agent"));
}

const agentId = (agent: Element) =>
	agent.getAttributeNS(XML_NAMESPACE, "id") ??
	agent.getAttribute("xml:id") ??
	"";

function agentsOf(doc: Document): TtmlAgent[] {
	return agentElements(doc).map((agent) => {
		const names = agentNames(agent);
		const name =
			names.find((item) => item.getAttribute("type") === "full") ?? names.at(0);
		return {
			id: agentId(agent),
			type: agent.getAttribute("type") ?? "",
			name: name ? collapse(name.textContent).trim() : "",
		};
	});
}

export function ttmlAgents(content: string): TtmlAgent[] {
	const doc = parseTtmlDocument(content);
	return doc ? agentsOf(doc) : [];
}

export function withTtmlAgentName(
	content: string,
	id: string,
	name: string,
): string {
	const doc = parseTtmlDocument(content);
	const agent = doc
		? agentElements(doc).find((item) => agentId(item) === id)
		: undefined;
	if (!doc || !agent) return content;

	for (const existing of agentNames(agent)) existing.remove();
	if (name) {
		const element = doc.createElementNS(
			TTML_METADATA,
			agent.prefix ? `${agent.prefix}:name` : "name",
		);
		element.setAttribute("type", "full");
		element.textContent = name;
		agent.append(element);
	}
	const declaration = /^\s*<\?xml[^>]*\?>\s*/.exec(content)?.[0] ?? "";
	return declaration + new XMLSerializer().serializeToString(doc);
}

// Media seeks can round timestamps down by a few microseconds.
const TIMESTAMP_EPSILON = 0.00001;

export function cueIndexAt(
	items: readonly { start: number }[],
	time: number,
): number {
	let low = 0;
	let high = items.length - 1;
	let found = -1;
	while (low <= high) {
		const middle = (low + high) >> 1;
		if (items[middle].start <= time + TIMESTAMP_EPSILON) {
			found = middle;
			low = middle + 1;
		} else {
			high = middle - 1;
		}
	}
	return found;
}

export function liveCues(cues: readonly Cue[], time: number): number[] {
	const live: number[] = [];
	for (let index = cueIndexAt(cues, time); index >= 0; index--) {
		if (time + TIMESTAMP_EPSILON < cues[index].end) live.push(index);
	}
	return live.reverse();
}

export function subtitleLabel(subtitle: API.SubtitleSummary) {
	return (
		subtitle.title || subtitle.languageName || SUBTITLE_FORMAT[subtitle.format]
	);
}
