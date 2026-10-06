import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";

import { Artwork } from "@/components/ui/artwork";
import { confirm } from "@/components/ui/confirmDialog";
import { PageHeader } from "@/components/ui/header";
import { Icon } from "@/components/ui/icon";
import { ListRow } from "@/components/ui/listRow";
import { Screen } from "@/components/ui/screen";
import { Segmented } from "@/components/ui/segmented";
import { SwitchRow } from "@/components/ui/switchRow";
import { formatFileSize, plural } from "@/lib/format";
import { queryClient } from "@/lib/queryClient";
import { getDownloadStats, useOfflineStore } from "@/offline/offlineStore";
import { usePlayerStore } from "@/player/playerStore";
import { authQueries } from "@/queries/auth";
import { useEndPadding } from "@/store/miniPlayerStore";
import { useSessionStore } from "@/store/sessionStore";
import {
	qualityOptions,
	streamingQualityOptions,
	useSettingsStore,
} from "@/store/settingsStore";

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<View className="gap-2">
			<Text
				accessibilityRole="header"
				className="px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
			>
				{title}
			</Text>
			<View className="gap-4 rounded-3xl bg-surface p-4">{children}</View>
		</View>
	);
}

export default function SettingsScreen() {
	const endPadding = useEndPadding(32);
	return (
		<Screen>
			<PageHeader title="Settings" />
			<ScrollView
				contentContainerClassName="gap-6 px-4 pt-3"
				contentContainerStyle={{ paddingBottom: endPadding }}
			>
				<Account />
				<Playback />
				<Storage />
			</ScrollView>
		</Screen>
	);
}

function Account() {
	const serverUrl = useSessionStore((state) => state.serverUrl);
	const setToken = useSessionStore((state) => state.setToken);
	const { data: user } = useQuery(authQueries.me());

	function confirmSignOut() {
		confirm({
			title: "Sign out?",
			message: "Playback stops. Downloads stay on this phone.",
			confirmLabel: "Sign out",
			icon: "signOut",
			onConfirm: () => {
				usePlayerStore.getState().clearQueue();
				void setToken(null).then(() => queryClient.clear());
			},
		});
	}

	return (
		<Section title="Account">
			<View className="flex-row items-center gap-3">
				<Artwork icon="person" shape="circle" size={48} uri={null} />
				<View className="flex-1">
					<Text
						className="text-base font-semibold text-foreground"
						numberOfLines={1}
					>
						{user?.userName ?? "Signed in"}
					</Text>
					<Text className="text-sm text-muted-foreground" numberOfLines={1}>
						{serverUrl}
					</Text>
				</View>
			</View>
			<ListRow
				accessibilityRole="button"
				className="min-h-12"
				leading={
					<Icon className="accent-destructive" name="signOut" size={22} />
				}
				onPress={confirmSignOut}
				title="Sign out"
			/>
		</Section>
	);
}

function Playback() {
	const streamingQuality = useSettingsStore((state) => state.streamingQuality);
	const downloadQuality = useSettingsStore((state) => state.downloadQuality);
	const savePlayedTracks = useSettingsStore((state) => state.savePlayedTracks);
	const update = useSettingsStore((state) => state.update);

	return (
		<Section title="Audio quality">
			<Text className="text-xs leading-4 text-muted-foreground">
				Original is the uploaded file, such as FLAC. Efficient uses 96 kbps Opus
				when available. Auto streams Original on Wi‑Fi and Efficient on mobile
				data.
			</Text>
			<View className="gap-2">
				<Text className="text-base text-foreground">Streaming</Text>
				<Segmented
					label="Streaming quality"
					onChange={(value) => update({ streamingQuality: value })}
					options={streamingQualityOptions}
					value={streamingQuality}
				/>
			</View>
			<View className="gap-2">
				<View className="flex-row items-baseline justify-between gap-2">
					<Text className="text-base text-foreground">Downloads</Text>
					<Text className="text-xs text-muted-foreground">
						Applies to new downloads
					</Text>
				</View>
				<Segmented
					label="Download quality"
					onChange={(value) => update({ downloadQuality: value })}
					options={qualityOptions}
					value={downloadQuality}
				/>
			</View>
			<SwitchRow
				description="Tracks download as they play, so they play offline later. On mobile data they save at your streaming quality; on Wi‑Fi they stream and save as Original, and earlier saves are upgraded."
				label="Save played tracks"
				onChange={(value) => update({ savePlayedTracks: value })}
				value={savePlayedTracks}
			/>
		</Section>
	);
}

function Storage() {
	const albumCount = useOfflineStore(
		(state) => Object.keys(state.albums).length,
	);
	const sizeInBytes = useOfflineStore((state) =>
		Object.values(getDownloadStats(state.tracks)).reduce(
			(sum, stats) => sum + (stats?.sizeInBytes ?? 0),
			0,
		),
	);
	const summary =
		albumCount === 0
			? "Nothing downloaded"
			: `${plural(albumCount, "album")} · ${formatFileSize(sizeInBytes)}`;

	return (
		<Section title="Storage">
			<Link asChild href="/downloads" push>
				<ListRow
					accessibilityLabel={`Downloads, ${summary}`}
					accessibilityRole="link"
					className="min-h-12"
					leading={<Icon name="storage" size={22} />}
					subtitle={summary}
					title="Downloads"
					trailing={
						<Icon
							className="accent-muted-foreground"
							name="chevronRight"
							size={18}
						/>
					}
				/>
			</Link>
		</Section>
	);
}
