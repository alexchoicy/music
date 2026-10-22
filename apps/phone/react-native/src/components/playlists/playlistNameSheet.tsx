import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { TextInput } from "react-native";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/textField";
import { ApiError } from "@/lib/api";
import type { PlaylistDetails, PlaylistListItem } from "@/lib/schema";
import { playlistMutations } from "@/queries/playlists";

type PlaylistNameSheetProps = {
	open: boolean;
	onClose: () => void;
	/** The playlist to rename; without it, the sheet creates one. */
	playlist?: Pick<PlaylistListItem, "playlistId" | "name" | "version">;
	onCreated?: (playlist: PlaylistDetails) => void;
};

/** Names a new playlist, or renames an existing one. */
export function PlaylistNameSheet({
	open,
	onClose,
	playlist,
	onCreated,
}: PlaylistNameSheetProps) {
	const [name, setName] = useState("");
	const inputRef = useRef<TextInput>(null);
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: async (newName: string) => {
			if (!playlist) return playlistMutations.create(newName);
			await playlistMutations.rename(playlist, newName);
			return null;
		},
		onSuccess: (created) => {
			onClose();
			if (created) onCreated?.(created);
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: ["playlists"] }),
	});

	// Starts from the current name each time the sheet opens.
	const [wasOpen, setWasOpen] = useState(open);
	if (open !== wasOpen) {
		setWasOpen(open);
		if (open) setName(playlist?.name ?? "");
	}

	// autoFocus runs before Android shows the Modal, so focus once the sheet is open.
	useEffect(() => {
		if (!open) return;
		const timeout = setTimeout(() => inputRef.current?.focus(), 300);
		return () => clearTimeout(timeout);
	}, [open]);

	const trimmedName = name.trim();
	const unchanged = trimmedName === playlist?.name;
	const submit = () => {
		if (trimmedName && !unchanged && !mutation.isPending) {
			mutation.mutate(trimmedName);
		}
	};
	const close = () => {
		if (mutation.isPending) return;
		mutation.reset();
		onClose();
	};

	let error: string | undefined;
	if (mutation.error) {
		if (!playlist) error = "Couldn't create the playlist.";
		else if (
			mutation.error instanceof ApiError &&
			mutation.error.status === 409
		) {
			error = "The playlist changed elsewhere. Try again.";
		} else error = "Couldn't rename the playlist.";
	}

	return (
		<Sheet
			footer={
				<>
					<Button
						className="flex-1"
						disabled={mutation.isPending}
						onPress={close}
						variant="secondary"
					>
						Cancel
					</Button>
					<Button
						className="flex-1"
						disabled={!trimmedName || unchanged}
						loading={mutation.isPending}
						onPress={submit}
					>
						{playlist ? "Rename" : "Create"}
					</Button>
				</>
			}
			onClose={close}
			open={open}
			title={playlist ? "Rename playlist" : "New playlist"}
		>
			<TextField
				error={error}
				label="Name"
				onChangeText={setName}
				onSubmitEditing={submit}
				placeholder="My playlist"
				ref={inputRef}
				returnKeyType="done"
				selectTextOnFocus={!!playlist}
				value={name}
			/>
		</Sheet>
	);
}
