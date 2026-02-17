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
import { Calendar } from "@/components/shadcn/calendar";
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
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSeparator,
	FieldSet,
} from "@/components/shadcn/field";
import { Input } from "@/components/shadcn/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/shadcn/popover";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/shadcn/select";
import {
	useMusicUploadDispatch,
	useMusicUploadState,
} from "@/contexts/uploadMusicContext";
import type { components } from "@/data/APIschema";
import { ALBUM_TYPES } from "@/enums/album";
import { partyQueries } from "@/lib/queries/party.queries";
import { makeMatchingKey } from "@/lib/utils/upload";

//TODO: language
//TODO: albumImage
//TODO: source full replace

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

	const [partyList, setPartyList] = useState<PartyList[]>([]);
	const [openCalendar, setOpenCalendar] = useState(false);

	const album = albumId ? state.albums[albumId] : null;
	// const albumCover = albumId ? state.albumCovers[albumId] : null;

	const discs = useMemo(
		() =>
			albumId
				? Object.values(state.discs).filter((disc) => disc.albumId === albumId)
				: [],
		[albumId, state.discs],
	);

	const dateButton = useId();

	const form = useForm({
		defaultValues: {
			title: album?.title || "",
			type: album?.type || "Album",
			description: album?.description || "",
			releaseDate: album?.releaseDate || "",
			albumCredits: album?.albumCredits || [],
			unsolvedAlbumCredits: album?.unsolvedAlbumCredits || [],
			languageId: album?.languageId || "",
			discs: discs || [],
		},
		onSubmit: ({ value }) => {
			if (!albumId || !album) return;
			const newAlbumCredits = partyList.map(
				(party) =>
					({
						partyId: party.partyId,
						credit: "Artist",
					}) satisfies components["schemas"]["AlbumCreditRequest"],
			);

			const newMatchKey = makeMatchingKey(
				value.title,
				newAlbumCredits,
				value.unsolvedAlbumCredits,
			);

			dispatch({
				type: "UpdateAlbum",
				payload: {
					albumId,
					newMatchingKey: newMatchKey,
					editAlbum: {
						title: value.title,
						type: value.type,
						description: value.description,
						releaseDate: value.releaseDate,
						albumCredits: newAlbumCredits,
						unsolvedAlbumCredits: value.unsolvedAlbumCredits,
						languageId: value.languageId,
					},
					editDiscs: value.discs,
				},
			});

			onOpenChange(false);
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
				discs: discs || [],
			});

			console.log("Album credits:", discs);

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
	}, [form, album, parties, discs]);

	const editForm = useId();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="top-[calc(50%+1.25rem*var(--nested-dialogs))] scale-[calc(1-0.1*var(--nested-dialogs))]  data-nested-dialog-open:after:inset-0 data-nested-dialog-open:after:rounded-[inherit] data-nested-dialog-open:after:bg-black/5 ">
				<DialogHeader>
					<DialogTitle>Edit Album</DialogTitle>
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
								<form.Field
									name="title"
									children={(field) => {
										return (
											<Field>
												<FieldLabel htmlFor={field.name}>
													Album Title
												</FieldLabel>
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
									<FieldLabel htmlFor="album-description">
										Album Artists
									</FieldLabel>
									<div className="flex flex-col gap-2">
										<form.Field
											name="unsolvedAlbumCredits"
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
									</div>
								</Field>

								<form.Field
									name="type"
									children={(field) => {
										return (
											<Field>
												<FieldLabel>Album Type</FieldLabel>
												<Select
													value={field.state.value}
													onValueChange={(v) =>
														field.handleChange(
															v as components["schemas"]["AlbumType"],
														)
													}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select album type" />
													</SelectTrigger>
													<SelectContent>
														<SelectGroup>
															{ALBUM_TYPES.map((t) => (
																<SelectItem key={t.value} value={t.value}>
																	{t.label}
																</SelectItem>
															))}
														</SelectGroup>
													</SelectContent>
												</Select>
											</Field>
										);
									}}
								/>

								<div className="grid grid-cols-2 gap-4">
									<Field>
										<FieldLabel htmlFor="album-year">Release Date</FieldLabel>
										<form.Field
											name="releaseDate"
											children={(field) => {
												return (
													<Popover
														open={openCalendar}
														onOpenChange={setOpenCalendar}
													>
														<PopoverTrigger
															render={
																<Button
																	variant="outline"
																	id={dateButton}
																	className="justify-start font-normal"
																>
																	{field.state.value
																		? new Date(
																				field.state.value,
																			).toLocaleDateString()
																		: "Select date"}
																</Button>
															}
														/>
														<PopoverContent
															className="w-auto overflow-hidden p-0"
															align="start"
														>
															<Calendar
																mode="single"
																selected={new Date(field.state.value ?? "")}
																captionLayout="dropdown"
																onSelect={(date) => {
																	field.handleChange(
																		date ? date.toISOString() : "",
																	);
																	setOpenCalendar(false);
																}}
															/>
														</PopoverContent>
													</Popover>
												);
											}}
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor="album-language">Language</FieldLabel>
									</Field>
								</div>
							</FieldSet>
							<FieldSeparator />
							<FieldSet>
								<FieldLegend>Discs</FieldLegend>
								<FieldGroup>
									<FieldSet>
										<FieldLegend>Disc Subtitles</FieldLegend>
										<form.Field
											name="discs"
											mode="array"
											children={(field) => {
												return (
													// <div className="grid">
													<FieldGroup className="gap-2">
														{field.state.value.map((disc, index) => (
															<form.Field
																key={`disc-${disc.id}`}
																name={`${field.name}[${index}]`}
																children={(subField) => {
																	return (
																		<Field orientation="horizontal">
																			<FieldLabel
																				htmlFor={subField.name}
																				className="w-auto"
																			>
																				{`${subField.state.value.discNumber}`}
																			</FieldLabel>
																			<Input
																				id={subField.name}
																				name={subField.name}
																				value={
																					subField.state.value.subtitle || ""
																				}
																				onBlur={subField.handleBlur}
																				onChange={(e) =>
																					subField.handleChange({
																						...subField.state.value,
																						subtitle: e.target.value,
																					})
																				}
																			/>
																		</Field>
																	);
																}}
															/>
														))}
													</FieldGroup>
													// </div>
												);
											}}
										/>
									</FieldSet>
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
