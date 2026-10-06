import { useEffect, useRef, useState } from "react";
import type { TextInput } from "react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/iconButton";
import { RadioRow, Sheet, SheetSection } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/textField";
import {
	controlPlaybackDevice,
	getActiveSession,
	movePlaybackHere,
	renamePlaybackDevice,
	selectDiscordDevice,
} from "@/lib/playbackDevices";
import type { PlaybackState } from "@/lib/webSocket";
import {
	getDefaultDeviceName,
	maxDeviceNameLength,
	usePlaybackDeviceStore,
} from "@/store/playbackDeviceStore";

type DeviceEntry = {
	deviceId: string;
	sessionId: string;
	name: string;
	state: PlaybackState | null;
};

function describePlayback(state: PlaybackState | null) {
	const track = state?.track;
	if (!state || !track) return "Nothing playing";
	const status =
		state.status === "playing"
			? "Playing"
			: state.status === "loading"
				? "Loading"
				: state.status === "idle"
					? "Stopped"
					: "Paused";
	const artists = track.artists.join(", ");
	return `${status} · ${track.title}${artists ? ` – ${artists}` : ""}`;
}

/** Other devices by their active session. */
function useDeviceEntries(): DeviceEntry[] {
	const devices = usePlaybackDeviceStore((state) => state.devices);
	const deviceId = usePlaybackDeviceStore((state) => state.deviceId);

	return devices.flatMap((device) => {
		// Other sessions of this phone are earlier connections the server has not dropped yet.
		if (device.deviceId === deviceId) return [];
		const active = getActiveSession(device.sessions);
		if (!active) return [];
		return [
			{
				deviceId: device.deviceId,
				sessionId: active.sessionId,
				name: device.name,
				state: active.state ?? null,
			},
		];
	});
}

function DeviceName({ open }: { open: boolean }) {
	const deviceName = usePlaybackDeviceStore((state) => state.deviceName);
	const savedName = deviceName ?? getDefaultDeviceName();
	// Null while viewing; an unsaved edit is dropped when the sheet closes.
	const [draft, setDraft] = useState<string | null>(null);
	const inputRef = useRef<TextInput>(null);
	const editing = draft !== null;

	const [wasOpen, setWasOpen] = useState(open);
	if (open !== wasOpen) {
		setWasOpen(open);
		if (!open) setDraft(null);
	}

	useEffect(() => {
		if (editing) inputRef.current?.focus();
	}, [editing]);

	const save = () => {
		if (draft === null) return;
		const name = draft.trim();
		if (name !== savedName)
			renamePlaybackDevice(name || getDefaultDeviceName());
		setDraft(null);
	};

	if (editing) {
		return (
			<View className="gap-3">
				<TextField
					description="Shown on your other devices."
					label="Device name"
					maxLength={maxDeviceNameLength}
					onChangeText={setDraft}
					onSubmitEditing={save}
					placeholder={getDefaultDeviceName()}
					ref={inputRef}
					returnKeyType="done"
					selectTextOnFocus
					value={draft}
				/>
				<View className="flex-row gap-3">
					<Button
						className="flex-1"
						onPress={() => setDraft(null)}
						variant="secondary"
					>
						Cancel
					</Button>
					<Button className="flex-1" onPress={save}>
						Save
					</Button>
				</View>
			</View>
		);
	}

	return (
		<View className="min-h-12 flex-row items-center gap-3">
			<Icon className="accent-primary" name="devices" size={22} />
			<Text className="flex-1 text-base text-foreground" numberOfLines={1}>
				{savedName}
			</Text>
			<IconButton
				icon="edit"
				label="Rename this phone"
				onPress={() => setDraft(savedName)}
				size={40}
			/>
		</View>
	);
}

function DeviceRow({
	entry,
	isDiscordSource,
}: {
	entry: DeviceEntry;
	isDiscordSource: boolean;
}) {
	const transfer = usePlaybackDeviceStore((state) => state.transfer);
	const hasTrack = !!entry.state?.track;
	const isPlaying = entry.state?.status === "playing";
	const isMoving = transfer?.sessionId === entry.sessionId;
	const moveDisabled = !hasTrack || (transfer !== null && !isMoving);

	return (
		<View className="min-h-16 flex-row items-center gap-3 py-2">
			<Icon
				className={isPlaying ? "accent-primary" : "accent-muted-foreground"}
				name="devices"
				size={22}
			/>
			<View className="flex-1 gap-0.5">
				<View className="flex-row items-center gap-1.5">
					<Text className="shrink text-base text-foreground" numberOfLines={1}>
						{entry.name}
					</Text>
					{isDiscordSource && <Badge label="Discord" />}
				</View>
				<Text className="text-sm text-muted-foreground" numberOfLines={1}>
					{describePlayback(entry.state)}
				</Text>
			</View>
			<IconButton
				disabled={!hasTrack}
				icon={isPlaying ? "pause" : "play"}
				label={`${isPlaying ? "Pause" : "Play"} on ${entry.name}`}
				onPress={() =>
					controlPlaybackDevice(
						entry.deviceId,
						entry.sessionId,
						isPlaying ? "pause" : "play",
					)
				}
				size={40}
			/>
			<Pressable
				accessibilityLabel={`Move playback from ${entry.name} to this phone`}
				accessibilityRole="button"
				accessibilityState={{ busy: isMoving, disabled: moveDisabled }}
				className="h-10 flex-row items-center gap-1.5 rounded-full bg-surface px-3.5 active:opacity-75 disabled:opacity-45"
				disabled={moveDisabled || isMoving}
				onPress={() => movePlaybackHere(entry.deviceId, entry.sessionId)}
			>
				{isMoving ? (
					<ActivityIndicator colorClassName="accent-foreground" size="small" />
				) : (
					<Icon name="moveHere" size={16} />
				)}
				<Text className="text-sm font-semibold text-foreground">Move here</Text>
			</Pressable>
		</View>
	);
}

function DiscordPresence() {
	const devices = usePlaybackDeviceStore((state) => state.devices);
	const deviceId = usePlaybackDeviceStore((state) => state.deviceId);
	const discordDeviceId = usePlaybackDeviceStore(
		(state) => state.discordDeviceId,
	);
	const options = [
		{ value: null, label: "Automatic (latest to start playing)" },
		...devices.map((device) => ({
			value: device.deviceId,
			label:
				device.deviceId === deviceId
					? `${device.name} (this phone)`
					: device.name,
		})),
	];
	if (
		discordDeviceId &&
		!options.some((option) => option.value === discordDeviceId)
	) {
		options.push({ value: discordDeviceId, label: "Disconnected device" });
	}

	return (
		<SheetSection label="Discord presence">
			<Text className="text-xs text-muted-foreground">
				Which device's playback shows on Discord.
			</Text>
			<View
				accessibilityLabel="Discord presence"
				accessibilityRole="radiogroup"
			>
				{options.map((option) => (
					<RadioRow
						key={option.value ?? "auto"}
						label={option.label}
						onPress={() => selectDiscordDevice(option.value)}
						selected={option.value === discordDeviceId}
					/>
				))}
			</View>
		</SheetSection>
	);
}

type DevicesSheetProps = {
	open: boolean;
	onClose: () => void;
};

/** The user's other players: control them, move their playback here, and pick the Discord source. */
export function DevicesSheet({ open, onClose }: DevicesSheetProps) {
	const connected = usePlaybackDeviceStore((state) => state.connected);
	const discordDeviceId = usePlaybackDeviceStore(
		(state) => state.discordDeviceId,
	);
	const entries = useDeviceEntries();

	return (
		<Sheet onClose={onClose} open={open} title="Devices">
			<SheetSection label="This phone">
				<DeviceName open={open} />
			</SheetSection>

			<SheetSection label="Other devices">
				{!connected ? (
					<Text className="text-sm text-muted-foreground">
						Not connected. Devices appear once the live connection is back.
					</Text>
				) : entries.length === 0 ? (
					<Text className="text-sm text-muted-foreground">
						No other devices are connected.
					</Text>
				) : (
					<View>
						{entries.map((entry) => (
							<DeviceRow
								entry={entry}
								isDiscordSource={entry.deviceId === discordDeviceId}
								key={entry.sessionId}
							/>
						))}
					</View>
				)}
			</SheetSection>

			{connected && <DiscordPresence />}
		</Sheet>
	);
}
