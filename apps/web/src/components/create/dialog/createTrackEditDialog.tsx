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
import { Card, CardContent, CardHeader } from "@/components/shadcn/card";
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

	const dateButton = useId();

	const form = useForm({
		defaultValues: {
			title: track?.title || "",
			trackNumber: track?.trackNumber || 1,
			description: track?.description || "",
			languageId: track?.languageId || "",
			isMC: track?.isMC || false,
			unsolvedTrackCredits: track?.unsolvedTrackCredits || [],
		},
		onSubmit: ({ value }) => {
			if (!track || !trackId) return;

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
	}, [form, track, parties]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="top-[calc(50%+1.25rem*var(--nested-dialogs))] scale-[calc(1-0.1*var(--nested-dialogs))]  data-nested-dialog-open:after:inset-0 data-nested-dialog-open:after:rounded-[inherit] data-nested-dialog-open:after:bg-black/5 ">
				<DialogHeader>
					<DialogTitle>Edit Track</DialogTitle>
				</DialogHeader>
				<div className="no-scrollbar -mx-4 max-h-[50vh] overflow-y-auto px-4">
					<FieldGroup>
						<FieldSet>
							<FieldGroup>
								<Field>
									<FieldLabel>Title</FieldLabel>
									<Input />
								</Field>
								<Field>
									<FieldLabel>Track Album</FieldLabel>
									<FieldDescription>
										It will move or create the track into the name you input.
									</FieldDescription>
									<Input />
								</Field>
								<div className="grid grid-cols-2 gap-4">
									<Field>
										<FieldLabel>Discs Number</FieldLabel>
										<Input type="number" min={1} />
									</Field>
									<Field>
										<FieldLabel>Track Number</FieldLabel>
										<Input type="number" min={1} />
									</Field>
								</div>

								<Field>
									<FieldLabel>Track Artist</FieldLabel>
									<FieldDescription>
										<Alert variant="destructive">
											<AlertCircleIcon />
											<AlertTitle>Unsolved Album Credits</AlertTitle>
											<AlertDescription>
												<div>
													<ul className="list-disc ml-5"></ul>
												</div>
											</AlertDescription>
											<AlertAction>
												<Button size="xs">Clear</Button>
											</AlertAction>
										</Alert>
									</FieldDescription>
									<PartyCombobox
										parties={partyList || []}
										selectedValues={partyList}
										setSelectedValues={setPartyList}
									/>
								</Field>
								<Field>
									<FieldLabel>Language</FieldLabel>
									<Select></Select>
								</Field>
								<Field orientation="horizontal">
									<Checkbox />
									<FieldContent>
										<FieldLabel>Is MC</FieldLabel>
										<FieldDescription>
											Bro so many concert track don't split the MC part. :/
										</FieldDescription>
									</FieldContent>
								</Field>
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
									<Select>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem>Select a track to move into</SelectItem>
										</SelectContent>
									</Select>
								</Field>
								<Field>
									<FieldContent>
										<div className="grid grid-cols-[200px_1fr] gap-y-4 border p-4">
											<div className="grid grid-cols-subgrid col-span-2">
												<div>Original File Name</div>
												<div></div>
											</div>
										</div>
									</FieldContent>
								</Field>
							</FieldGroup>
						</FieldSet>
					</FieldGroup>
				</div>
				<DialogFooter>
					<DialogClose
						render={
							<Button variant="outline" onClick={() => onOpenChange(false)}>
								Cancel
							</Button>
						}
					/>
					<Button type="submit" form="edit-track-form">
						Submit
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
