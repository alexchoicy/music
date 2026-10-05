import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { TextInput } from "react-native";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/textField";
import { playlistMutations } from "@/lib/queries/playlist.queries";

type CreatePlaylistSheetProps = {
	open: boolean;
	onClose: () => void;
};

export function CreatePlaylistSheet({
	open,
	onClose,
}: CreatePlaylistSheetProps) {
	const [name, setName] = useState("");
	const inputRef = useRef<TextInput>(null);
	const queryClient = useQueryClient();
	const mutation = useMutation({
		...playlistMutations.create(),
		onSuccess: () => {
			setName("");
			onClose();
		},
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: ["playlists", "list"] }),
	});

	// autoFocus fires before Android shows the Modal, so focus once the sheet has opened.
	useEffect(() => {
		if (!open) return;
		const timeout = setTimeout(() => inputRef.current?.focus(), 300);
		return () => clearTimeout(timeout);
	}, [open]);

	const trimmedName = name.trim();
	const submit = () => {
		if (trimmedName && !mutation.isPending) {
			mutation.mutate({ name: trimmedName });
		}
	};
	const close = () => {
		if (mutation.isPending) return;
		setName("");
		mutation.reset();
		onClose();
	};

	return (
		<Sheet
			footer={
				<>
					<Button
						className="flex-1"
						disabled={mutation.isPending}
						onPress={close}
						variant="outline"
					>
						Cancel
					</Button>
					<Button
						className="flex-1"
						disabled={!trimmedName}
						loading={mutation.isPending}
						onPress={submit}
					>
						Create
					</Button>
				</>
			}
			onClose={close}
			open={open}
			title="Create playlist"
		>
			<TextField
				error={mutation.isError ? mutation.error.message : undefined}
				label="Name"
				onChangeText={setName}
				onSubmitEditing={submit}
				placeholder="My playlist"
				ref={inputRef}
				returnKeyType="done"
				value={name}
			/>
		</Sheet>
	);
}
