import {
	ArrowDownToLineIcon,
	CheckIcon,
	MonitorSpeakerIcon,
	PauseIcon,
	PencilIcon,
	PlayIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "#/components/coss/badge";
import { Button } from "#/components/coss/button";
import { Input } from "#/components/coss/input";
import { Label } from "#/components/coss/label";
import {
	Popover,
	PopoverPopup,
	PopoverTrigger,
} from "#/components/coss/popover";
import {
	Select,
	SelectItem,
	SelectPopup,
	SelectTrigger,
	SelectValue,
} from "#/components/coss/select";
import type { PlaybackState } from "#/data/webSocket";
import {
	controlPlaybackDevice,
	getActiveSession,
	movePlaybackHere,
	renamePlaybackDevice,
	selectDiscordDevice,
} from "#/lib/playbackDevices";
import { cn } from "#/lib/utils/styles";
import {
	getDefaultDeviceName,
	getSessionId,
	MAX_DEVICE_NAME_LENGTH,
	usePlaybackDeviceStore,
} from "#/store/playbackDeviceStore";

type DeviceEntry = {
	deviceId: string;
	sessionId: string;
	name: string;
	state: PlaybackState | null;
};

type DiscordOption = { label: string; value: string };

const AUTOMATIC_DISCORD_OPTION: DiscordOption = {
	label: "Automatic (latest to start playing)",
	value: "auto",
};

function describePlayback(state: PlaybackState | null): string {
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
	return `${status} · ${track.title}${artists ? ` — ${artists}` : ""}`;
}

// Other devices by their active session, plus every other tab on this device.
function useDeviceEntries(): DeviceEntry[] {
	const devices = usePlaybackDeviceStore((state) => state.devices);
	const deviceId = usePlaybackDeviceStore((state) => state.deviceId);
	const sessionId = getSessionId();

	return devices.flatMap((device) => {
		const sessions = device.sessions.filter(
			(session) => session.sessionId !== sessionId,
		);

		if (device.deviceId === deviceId) {
			return sessions.map((session, index) => ({
				deviceId: device.deviceId,
				sessionId: session.sessionId,
				name:
					sessions.length > 1
						? `Another tab on this device (${index + 1})`
						: "Another tab on this device",
				state: session.state ?? null,
			}));
		}

		const active = getActiveSession(sessions);
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

function DeviceNameField() {
	const deviceName = usePlaybackDeviceStore((state) => state.deviceName);
	const savedName = deviceName ?? getDefaultDeviceName();
	// Null while viewing, so renames from other tabs show until this tab starts editing.
	const [draft, setDraft] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const editing = draft !== null;

	useEffect(() => {
		if (editing) inputRef.current?.focus();
	}, [editing]);

	// The button stays mounted in both modes, so focus moves to it before the input unmounts.
	const finishEditing = () => {
		buttonRef.current?.focus();
		setDraft(null);
	};

	const save = () => {
		if (draft === null) return;
		const name = draft.trim();
		if (name !== savedName) {
			renamePlaybackDevice(name || getDefaultDeviceName());
		}
		finishEditing();
	};

	return (
		<div className="flex flex-col gap-2">
			<p className="text-sm font-medium">This device</p>
			<div className="flex min-w-0 items-center gap-2">
				{editing ? (
					<Input
						aria-label="Device name"
						maxLength={MAX_DEVICE_NAME_LENGTH}
						onChange={(event) => setDraft(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								save();
							}
							if (event.key === "Escape") {
								event.stopPropagation();
								finishEditing();
							}
						}}
						ref={inputRef}
						size="sm"
						value={draft}
					/>
				) : (
					<span className="min-w-0 flex-1 truncate text-sm">{savedName}</span>
				)}
				<Button
					aria-label={editing ? "Save device name" : "Edit device name"}
					onClick={editing ? save : () => setDraft(savedName)}
					ref={buttonRef}
					size="icon-sm"
					variant="ghost"
				>
					{editing ? (
						<CheckIcon aria-hidden="true" />
					) : (
						<PencilIcon aria-hidden="true" />
					)}
				</Button>
			</div>
		</div>
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
	const track = entry.state?.track;
	const isPlaying = entry.state?.status === "playing";
	const isMoving = transfer?.sessionId === entry.sessionId;

	return (
		<li className="flex items-center gap-2 py-2">
			<MonitorSpeakerIcon
				aria-hidden="true"
				className={cn(
					"size-4 shrink-0",
					isPlaying ? "text-primary" : "text-muted-foreground",
				)}
			/>
			<div className="min-w-0 flex-1">
				<p className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
					<span className="truncate">{entry.name}</span>
					{isDiscordSource && (
						<Badge size="sm" variant="info">
							Discord
						</Badge>
					)}
				</p>
				<p className="truncate text-xs text-muted-foreground">
					{describePlayback(entry.state)}
				</p>
			</div>
			<Button
				aria-label={`${isPlaying ? "Pause" : "Play"} on ${entry.name}`}
				disabled={!track}
				onClick={() =>
					controlPlaybackDevice(
						entry.deviceId,
						entry.sessionId,
						isPlaying ? "pause" : "play",
					)
				}
				size="icon-sm"
				variant="ghost"
			>
				{isPlaying ? (
					<PauseIcon aria-hidden="true" />
				) : (
					<PlayIcon aria-hidden="true" />
				)}
			</Button>
			<Button
				aria-label={`Move playback from ${entry.name} to this device`}
				disabled={!track || (transfer !== null && !isMoving)}
				loading={isMoving}
				onClick={() => movePlaybackHere(entry.deviceId, entry.sessionId)}
				size="sm"
				variant="outline"
			>
				<ArrowDownToLineIcon aria-hidden="true" />
				Move here
			</Button>
		</li>
	);
}

function DiscordDeviceSelect() {
	const devices = usePlaybackDeviceStore((state) => state.devices);
	const deviceId = usePlaybackDeviceStore((state) => state.deviceId);
	const discordDeviceId = usePlaybackDeviceStore(
		(state) => state.discordDeviceId,
	);

	const options: DiscordOption[] = [
		AUTOMATIC_DISCORD_OPTION,
		...devices.map((device) => ({
			label:
				device.deviceId === deviceId
					? `${device.name} (this device)`
					: device.name,
			value: device.deviceId,
		})),
	];
	if (
		discordDeviceId &&
		!options.some((option) => option.value === discordDeviceId)
	) {
		options.push({ label: "Disconnected device", value: discordDeviceId });
	}
	const selected = options.find(
		(option) => option.value === (discordDeviceId ?? "auto"),
	);

	return (
		<div className="flex flex-col gap-2 border-t pt-3">
			<Label htmlFor="playback-discord-device">Discord presence</Label>
			<Select
				items={options}
				itemToStringLabel={(option) => option.label}
				itemToStringValue={(option) => option.value}
				onValueChange={(option) => {
					if (!option) return;
					selectDiscordDevice(option.value === "auto" ? null : option.value);
				}}
				value={selected}
			>
				<SelectTrigger id="playback-discord-device" size="sm">
					<SelectValue />
				</SelectTrigger>
				<SelectPopup align="end" side="top">
					{options.map((option) => (
						<SelectItem key={option.value} value={option}>
							{option.label}
						</SelectItem>
					))}
				</SelectPopup>
			</Select>
			<p className="text-xs text-muted-foreground">
				Which device&apos;s playback is shown on Discord.
			</p>
		</div>
	);
}

export function PlaybackDevices({ className }: { className?: string }) {
	const connected = usePlaybackDeviceStore((state) => state.connected);
	const discordDeviceId = usePlaybackDeviceStore(
		(state) => state.discordDeviceId,
	);
	const entries = useDeviceEntries();
	// Remounting the name field on close discards an unsaved edit.
	const [openCount, setOpenCount] = useState(0);

	return (
		<Popover
			onOpenChange={(open) => open && setOpenCount((count) => count + 1)}
		>
			<PopoverTrigger
				render={
					<Button
						aria-label="Devices"
						className={className}
						size="icon-sm"
						variant="ghost"
					/>
				}
			>
				<MonitorSpeakerIcon aria-hidden="true" />
			</PopoverTrigger>
			<PopoverPopup
				align="end"
				aria-label="Devices"
				className="w-[min(24rem,calc(100vw-1rem))]"
				// Keeps the popup below the mobile header.
				collisionPadding={{ top: 64, right: 8, bottom: 8, left: 8 }}
				side="top"
				sideOffset={8}
			>
				<div className="flex flex-col gap-3">
					<div className="flex flex-col gap-1">
						<p className="text-sm font-medium">Devices</p>
						<p className="text-xs text-muted-foreground">
							Players signed in to this account.
						</p>
					</div>
					<DeviceNameField key={openCount} />
					<div className="border-t pt-1">
						{!connected ? (
							<p className="py-2 text-sm text-muted-foreground">
								Not connected. Devices appear once the live connection is back.
							</p>
						) : entries.length === 0 ? (
							<p className="py-2 text-sm text-muted-foreground">
								No other devices are connected.
							</p>
						) : (
							<ul className="flex flex-col divide-y">
								{entries.map((entry) => (
									<DeviceRow
										entry={entry}
										isDiscordSource={entry.deviceId === discordDeviceId}
										key={entry.sessionId}
									/>
								))}
							</ul>
						)}
					</div>
					{connected && <DiscordDeviceSelect />}
				</div>
			</PopoverPopup>
		</Popover>
	);
}
