import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { SwitchRow } from "@/components/ui/switchRow";
import { formatFileSize, getAlbumDownloadStats } from "@/lib/offline/media";
import { authQueries } from "@/lib/queries/auth.queries";
import { useOfflineStore } from "@/store/offlineStore";
import { useSessionStore } from "@/store/sessionStore";
import type { AudioQuality } from "@/store/settingsStore";
import { useSettingsStore } from "@/store/settingsStore";

const qualityOptions: { label: string; value: AudioQuality }[] = [
	{ label: "Original", value: "original" },
	{ label: "Efficient", value: "efficient" },
];

export default function SettingsScreen() {
	const queryClient = useQueryClient();
	const serverUrl = useSessionStore((state) => state.serverUrl);
	const setToken = useSessionStore((state) => state.setToken);
	const { data: userInfo } = useQuery(authQueries.userInfo());

	async function signOut() {
		await setToken(null);
		queryClient.clear();
	}

	return (
		<Screen>
			<ScrollView contentContainerClassName="gap-6 p-4">
				<View className="gap-1">
					{userInfo && (
						<Text className="text-base text-foreground">
							Signed in as {userInfo.userName}
						</Text>
					)}
					<Text className="text-sm text-muted-foreground" numberOfLines={1}>
						{serverUrl}
					</Text>
				</View>
				<AudioQualitySettings />
				<DownloadsRow />
				<Button onPress={() => void signOut()} variant="outline">
					Sign out
				</Button>
			</ScrollView>
		</Screen>
	);
}

function DownloadsRow() {
	const albumCount = useOfflineStore(
		(state) => Object.keys(state.albums).length,
	);
	const sizeInBytes = useOfflineStore((state) =>
		Object.values(getAlbumDownloadStats(state.tracks)).reduce(
			(sum, stats) => sum + (stats?.sizeInBytes ?? 0),
			0,
		),
	);
	const summary =
		albumCount === 0
			? "No downloads"
			: `${albumCount} ${albumCount === 1 ? "album" : "albums"} · ${formatFileSize(sizeInBytes)}`;

	return (
		<Link asChild href="/settings/downloads" push>
			<Pressable
				accessibilityLabel={`Downloads, ${summary}`}
				accessibilityRole="link"
				className="min-h-14 flex-row items-center gap-3 rounded-lg border border-border px-4 py-3 active:opacity-70"
			>
				<Icon
					name={{
						ios: "arrow.down.circle",
						android: "download",
						web: "download",
					}}
					size={20}
				/>
				<View className="flex-1">
					<Text className="text-sm font-medium text-foreground">Downloads</Text>
					<Text className="text-xs text-muted-foreground">{summary}</Text>
				</View>
				<Icon
					className="accent-muted-foreground"
					name={{
						ios: "chevron.right",
						android: "chevron_right",
						web: "chevron_right",
					}}
					size={16}
				/>
			</Pressable>
		</Link>
	);
}

function AudioQualitySettings() {
	const streamingQuality = useSettingsStore((state) => state.streamingQuality);
	const downloadQuality = useSettingsStore((state) => state.downloadQuality);
	const savePlayedTracks = useSettingsStore((state) => state.savePlayedTracks);
	const update = useSettingsStore((state) => state.update);

	return (
		<View className="gap-4">
			<View className="gap-1">
				<Text
					accessibilityRole="header"
					className="text-base font-semibold text-foreground"
				>
					Audio quality
				</Text>
				<Text className="text-xs text-muted-foreground">
					Original is the uploaded file, such as FLAC. Efficient uses 96 kbps
					Opus when available.
				</Text>
			</View>
			<QualityOptions
				label="Streaming"
				onChange={(value) => update({ streamingQuality: value })}
				value={streamingQuality}
			/>
			<QualityOptions
				description="Applies to new downloads."
				label="Downloads"
				onChange={(value) => update({ downloadQuality: value })}
				value={downloadQuality}
			/>
			<SwitchRow
				description="Tracks download as they play, so they play offline later. On mobile data they save at your streaming quality; on Wi‑Fi they stream and save as Original, and earlier saves are upgraded. Saved tracks appear in Downloads."
				label="Save played tracks"
				onChange={(value) => update({ savePlayedTracks: value })}
				value={savePlayedTracks}
			/>
		</View>
	);
}

type QualityOptionsProps = {
	label: string;
	description?: string;
	value: AudioQuality;
	onChange: (value: AudioQuality) => void;
};

function QualityOptions({
	label,
	description,
	value,
	onChange,
}: QualityOptionsProps) {
	return (
		<View
			accessibilityLabel={label}
			accessibilityRole="radiogroup"
			className="gap-2"
		>
			<View className="flex-row items-baseline gap-2">
				<Text className="text-sm font-medium text-foreground">{label}</Text>
				{description && (
					<Text className="text-xs text-muted-foreground">{description}</Text>
				)}
			</View>
			<View className="flex-row flex-wrap gap-2">
				{qualityOptions.map((option) => (
					<Chip
						key={option.value}
						label={option.label}
						onPress={() => onChange(option.value)}
						role="radio"
						selected={option.value === value}
					/>
				))}
			</View>
		</View>
	);
}
