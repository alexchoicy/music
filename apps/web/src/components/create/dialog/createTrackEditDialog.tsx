import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { AlertCircleIcon } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import PartyCombobox from "@/components/combobox/partyCombobox";
import {
	Alert,
	AlertAction,
	AlertDescription,
	AlertTitle,
} from "@/components/shadcn/alert";
import { Button } from "@/components/shadcn/button";
import { Checkbox } from "@/components/shadcn/checkbox";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/shadcn/dialog";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSeparator,
	FieldSet,
} from "@/components/shadcn/field";
import { Input } from "@/components/shadcn/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/shadcn/select";
import {
	useMusicUploadDispatch,
	useMusicUploadState,
} from "@/contexts/uploadMusicContext";
import type { components } from "@/data/APIschema";
import { FILE_SOURCES, TRACK_VARIANT_TYPES } from "@/enums/track";
import { partyQueries } from "@/lib/queries/party.queries";
import type { Track, TrackVariant } from "@/models/uploadMusic";

//TODO: handle album name change

type CreateTrackEditDialogProps = {
	trackId: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

type PartyList = components["schemas"]["PartyListModel"];

export function CreateTrackEditDialog({
	trackId,
	open,
	onOpenChange,
}: CreateTrackEditDialogProps) {
	const state = useMusicUploadState();
	const dispatch = useMusicUploadDispatch();
	const { data: parties } = useQuery(partyQueries.getPartySearchList(""));

	const [partyList, setPartyList] = useState<PartyList[]>([]);

	const track = trackId ? state.tracks[trackId] : null;

	const disc = useMemo(() => {
		return trackId && track ? state.discs[track?.discId] : null;
	}, [state.discs, track, trackId]);

	const variantTracks = useMemo(() => {
		const variants: TrackVariant[] = [];

		track?.trackVariantsIds.forEach((variantId) => {
			const variant = state.trackVariants[variantId];
			if (variant) variants.push(variant);
		});
		return variants;
	}, [track?.trackVariantsIds, state.trackVariants]);

	const tracksInAlbum = useMemo(() => {
		const album = disc ? state.albums[disc.albumId] : null;
		if (!album) return [];
		const tracks: Track[] = [];

		album.OrderedAlbumDiscsIds.forEach((discId) => {
			const disc = state.discs[discId];
			if (!disc) return;
			disc.OrderedTrackIds.forEach((localtrackId) => {
				const track = state.tracks[localtrackId];
				// FILITER HERE MR.ALEX
				if (track.id === trackId) return;
				if (track) tracks.push(track);
			});
		});

		return tracks;
	}, [trackId, disc, state.albums, state.discs, state.tracks]);

	const form = useForm({
		defaultValues: {
			title: track?.title || "",
			trackNumber: track?.trackNumber || 1,
			description: track?.description || "",
			languageId: track?.languageId || "",
			isMC: track?.isMC || false,
			unsolvedTrackCredits: track?.unsolvedTrackCredits || [],
			albumName: "",
			discNumber: disc?.discNumber || 1,
			trackToVariant: "",
			variantTracks: variantTracks || [],
		},
		onSubmit: ({ value }) => {
			if (!track || !trackId) return;

			if (value.trackToVariant) {
				dispatch({
					type: "TrackToVariant",
					payload: {
						originalTrackId: trackId,
						targetTrackId: value.trackToVariant,
					},
				});
				onOpenChange(false);
				return;
			}

			const newTrackCredits = partyList.map(
				(party) =>
					({
						partyId: party.partyId,
						credit: "Artist",
					}) satisfies components["schemas"]["TrackCreditRequest"],
			);

			dispatch({
				type: "UpdateTrack",
				payload: {
					trackId,
					editTrack: {
						title: value.title,
						trackNumber: value.trackNumber,
						description: value.description,
						languageId: value.languageId,
						isMC: value.isMC,
						unsolvedTrackCredits: value.unsolvedTrackCredits,
						trackCredits: newTrackCredits,
					},
					discNumber: value.discNumber,
					variantTrack: value.variantTracks,
				},
			});

			console.log("submit", value);
			onOpenChange(false);
		},
	});

	useEffect(() => {
		if (track) {
			form.reset({
				title: track.title || "",
				trackNumber: track.trackNumber || 1,
				description: track.description || "",
				languageId: track.languageId || "",
				isMC: track.isMC || false,
				unsolvedTrackCredits: track.unsolvedTrackCredits || [],
				albumName: "",
				discNumber: disc?.discNumber || 1,
				trackToVariant: "",
				variantTracks: variantTracks || [],
			});

			if (parties) {
				const convertedPartyList: PartyList[] = [];
				track.trackCredits.forEach((credit) => {
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
	}, [form, track, parties, disc, variantTracks]);

	const editForm = useId();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="top-[calc(50%+1.25rem*var(--nested-dialogs))] scale-[calc(1-0.1*var(--nested-dialogs))]  data-nested-dialog-open:after:inset-0 data-nested-dialog-open:after:rounded-[inherit] data-nested-dialog-open:after:bg-black/5 ">
				<DialogHeader>
					<DialogTitle>Edit Track</DialogTitle>
				</DialogHeader>
				<div className="no-scrollbar -mx-4 max-h-[50vh] overflow-y-auto p-4">
					<form
						id={editForm}
						onSubmit={(e) => {
							e.preventDefault();
							form.handleSubmit();
						}}
					>
						<FieldGroup>
							<FieldSet>
								<FieldGroup>
									<form.Field
										name="title"
										children={(field) => {
											return (
												<Field>
													<FieldLabel htmlFor={field.name}>Title</FieldLabel>
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
									{/*<form.Field
										name="albumName"
										children={(field) => {
											return (
												<Field>
													<FieldLabel>Track Album</FieldLabel>
													<FieldDescription>
														It will move the track or create a new album into
														the name you input.
													</FieldDescription>
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
									/>*/}

									<div className="grid grid-cols-2 gap-4">
										<form.Field
											name="discNumber"
											children={(field) => {
												return (
													<Field>
														<FieldLabel>Discs Number</FieldLabel>
														<Input
															type="number"
															min={1}
															id={field.name}
															name={field.name}
															value={field.state.value}
															onBlur={field.handleBlur}
															onChange={(e) =>
																field.handleChange(parseInt(e.target.value, 10))
															}
														/>
													</Field>
												);
											}}
										/>
										<form.Field
											name="trackNumber"
											children={(field) => {
												return (
													<Field>
														<FieldLabel>Track Number</FieldLabel>
														<Input
															type="number"
															min={1}
															id={field.name}
															name={field.name}
															value={field.state.value}
															onBlur={field.handleBlur}
															onChange={(e) =>
																field.handleChange(parseInt(e.target.value, 10))
															}
														/>
													</Field>
												);
											}}
										/>
									</div>
									<Field>
										<FieldLabel>Track Artist</FieldLabel>
										<form.Field
											name="unsolvedTrackCredits"
											children={(field) => {
												if (
													(!field.state.value ||
														field.state.value.length === 0) &&
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
									</Field>

									<Field>
										<FieldLabel>Language</FieldLabel>
										<Select></Select>
									</Field>
									<form.Field
										name="isMC"
										children={(field) => {
											return (
												<Field orientation="horizontal">
													<Checkbox
														id={field.name}
														name={field.name}
														checked={field.state.value}
														onCheckedChange={(checked) =>
															field.handleChange(checked === true)
														}
													/>
													<FieldContent>
														<FieldLabel htmlFor={Field.name}>Is MC</FieldLabel>
														<FieldDescription>
															Bro so many concert track don't split the MC part.
															:/
														</FieldDescription>
													</FieldContent>
												</Field>
											);
										}}
									/>
								</FieldGroup>
							</FieldSet>
							<FieldSeparator />
							<FieldSet>
								<FieldLegend>Variants</FieldLegend>
								<FieldGroup>
									<Field>
										<FieldLabel>Move into a track</FieldLabel>
										<FieldDescription>
											You can move this track into another track, when it is a
											"Instrumental" version. Metadata will follow the target
											track.
										</FieldDescription>
										<form.Field
											name="trackToVariant"
											children={(field) => {
												return (
													<Select
														name={field.name}
														value={field.state.value}
														onValueChange={(value) =>
															field.handleChange(value || "")
														}
													>
														<SelectTrigger>
															<SelectValue>
																{field.state.value
																	? tracksInAlbum.find(
																			(t) => t.id === field.state.value,
																		)?.title ||
																		`Track ${tracksInAlbum.find((t) => t.id === field.state.value)?.trackNumber}`
																	: "Select a track to move into"}
															</SelectValue>
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="">
																Select a track to move into
															</SelectItem>
															{tracksInAlbum.map((t) => (
																<SelectItem
																	key={t.id}
																	value={t.id}
																	label={t.title}
																>
																	{t.title || `Track ${t.trackNumber}`}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												);
											}}
										/>
									</Field>
									<Field>
										<FieldLabel>Files</FieldLabel>
										<FieldContent>
											<form.Field name="variantTracks" mode="array">
												{(field) => {
													return (
														<div className="space-y-2">
															{field.state.value.map((variantTrack, index) => (
																<div
																	key={variantTrack.id}
																	className="grid grid-cols-[auto,1fr] gap-y-4 border p-4"
																>
																	<div className="grid grid-cols-subgrid col-span-2 space-y-2 items-center">
																		<div>Original File Name</div>
																		<div>{variantTrack.file.name}</div>

																		<div>Variant Type</div>
																		<form.Field
																			name={`variantTracks[${index}].variantType`}
																			children={(variantTypeField) => (
																				<Select
																					value={variantTypeField.state.value}
																					onValueChange={(value) =>
																						variantTypeField.handleChange(
																							value || "Default",
																						)
																					}
																				>
																					<SelectTrigger className="w-full">
																						<SelectValue placeholder="Select variant type" />
																					</SelectTrigger>
																					<SelectContent>
																						{TRACK_VARIANT_TYPES.map((type) => (
																							<SelectItem
																								key={type.value}
																								value={type.value}
																							>
																								{type.label}
																							</SelectItem>
																						))}
																					</SelectContent>
																				</Select>
																			)}
																		/>

																		<div>File Source</div>
																		<form.Field
																			name={`variantTracks[${index}].source`}
																			children={(fileSourceField) => (
																				<Select
																					value={fileSourceField.state.value}
																					onValueChange={(value) =>
																						fileSourceField.handleChange(
																							value || "MORA",
																						)
																					}
																				>
																					<SelectTrigger className="w-full">
																						<SelectValue placeholder="Select file source" />
																					</SelectTrigger>
																					<SelectContent>
																						{FILE_SOURCES.map((source) => (
																							<SelectItem
																								key={source.value}
																								value={source.value}
																							>
																								{source.label}
																							</SelectItem>
																						))}
																					</SelectContent>
																				</Select>
																			)}
																		/>
																		{variantTracks.length > 1 && (
																			<Button
																				className="col-span-2"
																				variant="destructive"
																				onClick={() =>
																					dispatch({
																						type: "RemoveVariant",
																						payload: {
																							variantId: variantTrack.id,
																							trackId: trackId || "",
																						},
																					})
																				}
																			>
																				Delete
																			</Button>
																		)}
																	</div>
																</div>
															))}
														</div>
													);
												}}
											</form.Field>
										</FieldContent>
									</Field>
								</FieldGroup>
							</FieldSet>
						</FieldGroup>
					</form>
				</div>

				<DialogFooter>
					<DialogClose
						render={
							<Button variant="outline" onClick={() => onOpenChange(false)}>
								Cancel
							</Button>
						}
					/>
					<Button type="submit" form={editForm}>
						Submit
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
