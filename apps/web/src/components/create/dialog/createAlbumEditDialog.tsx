import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Button } from "@/components/shadcn/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/shadcn/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/shadcn/field";
import { Input } from "@/components/shadcn/input";
import {
	useMusicUploadDispatch,
	useMusicUploadState,
} from "@/contexts/uploadMusicContext";
import { partyQueries } from "@/lib/queries/party.queries";
import { makeMatchingKey } from "@/lib/utils/upload";

type CreateAlbumEditDialogProps = {
	albumId: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function CreateAlbumEditDialog({
	albumId,
	open,
	onOpenChange,
}: CreateAlbumEditDialogProps) {
	const state = useMusicUploadState();
	const dispatch = useMusicUploadDispatch();
	const { data: parties } = useQuery(partyQueries.getPartySearchList(""));

	const album = albumId ? state.albums[albumId] : null;
	const albumCover = albumId ? state.albumCovers[albumId] : null;

	const form = useForm({
		defaultValues: {
			title: album?.title || "",
			type: album?.type || "Album",
			description: album?.description || "",
			releaseDate: album?.releaseDate || "",
			albumCredits: album?.albumCredits || [],
			unsolvedAlbumCredits: album?.unsolvedAlbumCredits || [],
			languageId: album?.languageId || "",
		},
		onSubmit: ({ value }) => {
			if (!albumId || !album) return;

			const newMatchKey = makeMatchingKey(
				value.title,
				value.albumCredits,
				value.unsolvedAlbumCredits,
			);
		},
	});

	useEffect(() => {
		if (album) {
			form.reset({
				title: album.title || "",
				type: album.type || "Album",
				description: album.description || "",
				releaseDate: album.releaseDate || "",
				albumCredits: album.albumCredits || [],
				unsolvedAlbumCredits: album.unsolvedAlbumCredits || [],
				languageId: album.languageId || "",
			});
		}
	}, [form, album]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Album</DialogTitle>
				</DialogHeader>
				<form
					id="edit-album-form"
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<FieldGroup>
						<form.Field
							name="title"
							children={(field) => {
								return (
									<Field>
										<FieldLabel htmlFor={field.name}>Album Title</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
									</Field>
								);
							}}
						/>
					</FieldGroup>
				</form>
				<DialogFooter>
					<DialogClose
						render={
							<Button variant="outline" onClick={() => onOpenChange(false)}>
								Cancel
							</Button>
						}
					/>
					<Button type="submit" form="edit-album-form">
						Submit
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
