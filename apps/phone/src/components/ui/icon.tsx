import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { withUniwind } from "uniwind";

const StyledSymbolView = withUniwind(SymbolView);

type PlatformSymbols = Exclude<
	ComponentProps<typeof SymbolView>["name"],
	string
>;

function symbol(
	ios: NonNullable<PlatformSymbols["ios"]>,
	android: NonNullable<PlatformSymbols["android"]>,
): PlatformSymbols {
	return { ios, android, web: android };
}

/** Every icon the app uses, as SF Symbols on iOS and Material Symbols elsewhere. */
export const icons = {
	add: symbol("plus", "add"),
	album: symbol("opticaldisc", "album"),
	albums: symbol("square.stack.fill", "library_music"),
	back: symbol("chevron.left", "arrow_back"),
	check: symbol("checkmark", "check"),
	checkCircle: symbol("checkmark.circle.fill", "check_circle"),
	chevronDown: symbol("chevron.down", "keyboard_arrow_down"),
	chevronRight: symbol("chevron.right", "chevron_right"),
	clear: symbol("xmark.circle.fill", "cancel"),
	close: symbol("xmark", "close"),
	delete: symbol("trash", "delete"),
	edit: symbol("pencil", "edit"),
	download: symbol("arrow.down.circle", "arrow_circle_down"),
	downloaded: symbol("arrow.down.circle.fill", "download_for_offline"),
	drag: symbol("line.3.horizontal", "drag_handle"),
	error: symbol("exclamationmark.circle", "error"),
	externalLink: symbol("arrow.up.right", "open_in_new"),
	filter: symbol("line.3.horizontal.decrease", "filter_list"),
	more: symbol("ellipsis", "more_horiz"),
	musicNote: symbol("music.note", "music_note"),
	nowPlaying: symbol("waveform", "graphic_eq"),
	offline: symbol("wifi.slash", "cloud_off"),
	options: symbol("slider.horizontal.3", "tune"),
	parties: symbol("music.mic", "artist"),
	pause: symbol("pause.fill", "pause"),
	person: symbol("person.fill", "person"),
	play: symbol("play.fill", "play_arrow"),
	playlist: symbol("music.note.list", "queue_music"),
	playlistAdd: symbol("text.badge.plus", "playlist_add"),
	playlistRemove: symbol("text.badge.minus", "playlist_remove"),
	playNext: symbol(
		"text.line.first.and.arrowtriangle.forward",
		"queue_play_next",
	),
	queue: symbol("list.bullet", "format_list_bulleted"),
	queueAdd: symbol("text.append", "add_to_queue"),
	radio: symbol("dot.radiowaves.left.and.right", "radio"),
	repeat: symbol("repeat", "repeat"),
	repeatOne: symbol("repeat.1", "repeat_one"),
	search: symbol("magnifyingglass", "search"),
	settings: symbol("gearshape", "settings"),
	share: symbol("square.and.arrow.up", "share"),
	shuffle: symbol("shuffle", "shuffle"),
	signOut: symbol("rectangle.portrait.and.arrow.right", "logout"),
	skipNext: symbol("forward.end.fill", "skip_next"),
	skipPrevious: symbol("backward.end.fill", "skip_previous"),
	sort: symbol("arrow.up.arrow.down", "sort"),
	storage: symbol("internaldrive", "storage"),
};

export type IconName = keyof typeof icons;

type IconProps = {
	name: IconName;
	size?: number;
	/** A tint class such as `accent-muted-foreground`. */
	className?: string;
};

export function Icon({ name, size = 24, className }: IconProps) {
	return (
		<StyledSymbolView
			name={icons[name]}
			size={size}
			tintColorClassName={className ?? "accent-foreground"}
		/>
	);
}
