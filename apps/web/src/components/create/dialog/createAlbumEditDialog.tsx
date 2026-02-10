import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { AlertCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import PartyCombobox from "@/components/combobox/partyCombobox";
import {
	Alert,
	AlertAction,
	AlertDescription,
	AlertTitle,
} from "@/components/shadcn/alert";
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
import type { components } from "@/data/APIschema";
import { partyQueries } from "@/lib/queries/party.queries";

type CreateAlbumEditDialogProps = {
	albumId: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

type PartyList = components["schemas"]["PartyListModel"];

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

	const [partyList, setPartyList] = useState<PartyList[]>([]);

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
			console.log("Submitting form with values:", value);
			console.log("Selected parties:", partyList);
			// const newMatchKey = makeMatchingKey(
			// 	value.title,
			// 	value.albumCredits,
			// 	value.unsolvedAlbumCredits,
			// );
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

			if (parties) {
				const convertedPartyList: PartyList[] = [];
				album.albumCredits.forEach((credit) => {
					const matchedParty = parties.find(
						(party) => party.partyId === credit.partyId,
					);
					if (matchedParty) {
						convertedPartyList.push(matchedParty);
					}
				});
				setPartyList(convertedPartyList);
			}
		}
	}, [form, album, parties]);

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
						<Field>
							<FieldLabel htmlFor="album-description">Album Artists</FieldLabel>
							<div className="flex flex-col gap-2">
								<form.Field
									name="unsolvedAlbumCredits"
									children={(field) => {
										if (
											!field.state.value ||
											field.state.value.length === 0 ||
											partyList.length > 0
										) {
											return;
										}

										return (
											<Alert variant="destructive">
												<AlertCircleIcon />
												<AlertTitle>Unsolved Album Credits</AlertTitle>
												<AlertDescription>
													<div>
														<ul className="list-disc ml-5">
															{field.state.value.map((c) => (
																<li key={c}>{c}</li>
															))}
														</ul>
													</div>
												</AlertDescription>
												<AlertAction>
													<Button
														size="xs"
														onClick={() => field.handleChange([])}
													>
														Clear
													</Button>
												</AlertAction>
											</Alert>
										);
									}}
								/>
								<PartyCombobox
									parties={parties || []}
									selectedValues={partyList}
									setSelectedValues={setPartyList}
								/>
							</div>
						</Field>
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
