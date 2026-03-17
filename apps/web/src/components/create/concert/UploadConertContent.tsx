import { useMutation, useQuery } from "@tanstack/react-query";
import {
	type Dispatch,
	type SetStateAction,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useState,
} from "react";
import ConcertAlbumCombobox from "@/components/combobox/concertAlbumCombobox";
import PartyCombobox from "@/components/combobox/partyCombobox";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/shadcn/card";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/shadcn/field";
import { Input } from "@/components/shadcn/input";
import { Textarea } from "@/components/shadcn/textarea";
import type { components } from "@/data/APIschema";
import { albumQueries } from "@/lib/queries/album.queries";
import { concertMutations } from "@/lib/queries/concert.queries";
import { partyQueries } from "@/lib/queries/party.queries";
import { FileDropBox } from "./fileDropBox";

type PartyList = components["schemas"]["PartyListModel"];
type AlbumListItem = components["schemas"]["AlbumListItemModel"];
type CreateConcertModel = components["schemas"]["CreateConcertModel"];
type CreateConcertPartyModel = components["schemas"]["CreateConcertPartyModel"];

type UploadConcertContentProps = {
	setIsProcessing: Dispatch<SetStateAction<boolean>>;
	onUploadReady: (uploadAction: (() => Promise<void>) | null) => void;
};

export function UploadConcertContent({
	setIsProcessing,
	onUploadReady,
}: UploadConcertContentProps) {
	const { data: parties = [] } = useQuery(partyQueries.getPartySearchList(""));
	const { data: albums = [] } = useQuery(albumQueries.list());
	const { mutateAsync: createConcert } = useMutation(concertMutations.create());
	const titleFieldId = useId();
	const descriptionFieldId = useId();

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [mainParties, setMainParties] = useState<PartyList[]>([]);
	const [guestParties, setGuestParties] = useState<PartyList[]>([]);
	const [selectedAlbums, setSelectedAlbums] = useState<AlbumListItem[]>([]);

	useEffect(() => {
		const mainPartyIds = new Set(
			mainParties.map((party) => String(party.partyId)),
		);

		setGuestParties((previousGuests) => {
			const nextGuests = previousGuests.filter(
				(party) => !mainPartyIds.has(String(party.partyId)),
			);

			return nextGuests.length === previousGuests.length
				? previousGuests
				: nextGuests;
		});
	}, [mainParties]);

	const guestPartyOptions = useMemo(() => {
		const mainPartyIds = new Set(
			mainParties.map((party) => String(party.partyId)),
		);
		return parties.filter((party) => !mainPartyIds.has(String(party.partyId)));
	}, [mainParties, parties]);

	const linkedParties = useMemo<CreateConcertPartyModel[]>(() => {
		const seenPartyIds = new Set<string>();
		const nextLinkedParties: CreateConcertPartyModel[] = [];

		mainParties.forEach((party) => {
			const key = String(party.partyId);
			if (seenPartyIds.has(key)) {
				return;
			}

			seenPartyIds.add(key);
			nextLinkedParties.push({
				partyId: party.partyId,
				role: "MainArtist",
			});
		});

		guestParties.forEach((party) => {
			const key = String(party.partyId);
			if (seenPartyIds.has(key)) {
				return;
			}

			seenPartyIds.add(key);
			nextLinkedParties.push({
				partyId: party.partyId,
				role: "Guest",
			});
		});

		return nextLinkedParties;
	}, [guestParties, mainParties]);

	const createConcertModel = useMemo<CreateConcertModel>(
		() => ({
			title: title.trim(),
			description: description.trim() || undefined,
			linkedAlbumIds: selectedAlbums.map((album) => album.albumId),
			linkedParties,
			files: [],
		}),
		[description, linkedParties, selectedAlbums, title],
	);

	const onUpload = useCallback(async () => {
		setIsProcessing(true);

		try {
			await createConcert(createConcertModel);
		} finally {
			setIsProcessing(false);
		}
	}, [createConcert, createConcertModel, setIsProcessing]);

	useEffect(() => {
		onUploadReady(onUpload);

		return () => {
			onUploadReady(null);
		};
	}, [onUpload, onUploadReady]);

	return (
		<div className="grid gap-2 p-6 lg:grid-cols-5">
			<Card className="lg:col-span-3">
				<CardHeader>
					<CardTitle>Concert Details</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor={titleFieldId}>Concert Name</FieldLabel>
							<Input
								id={titleFieldId}
								value={title}
								onChange={(event) => setTitle(event.target.value)}
								placeholder="Tokyo Garden Theater Day 1"
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor={descriptionFieldId}>Description</FieldLabel>
							<Textarea
								id={descriptionFieldId}
								value={description}
								onChange={(event) => setDescription(event.target.value)}
								placeholder="Add a short note about the concert recording."
							/>
						</Field>

						<Field>
							<FieldLabel>Main Parties</FieldLabel>
							<FieldDescription>
								Select one or more primary artists for this concert.
							</FieldDescription>
							<PartyCombobox
								parties={parties}
								selectedValues={mainParties}
								setSelectedValues={setMainParties}
							/>
						</Field>

						<Field>
							<FieldLabel>Guests</FieldLabel>
							<FieldDescription>
								Artists picked as main parties are removed from guests.
							</FieldDescription>
							<PartyCombobox
								parties={guestPartyOptions}
								selectedValues={guestParties}
								setSelectedValues={setGuestParties}
							/>
						</Field>

						<Field>
							<FieldLabel>Linked Albums</FieldLabel>
							<FieldDescription>
								Multi-select albums from `/albums` without creating new ones.
							</FieldDescription>
							<ConcertAlbumCombobox
								albums={albums}
								selectedValues={selectedAlbums}
								setSelectedValues={setSelectedAlbums}
							/>
						</Field>
					</FieldGroup>
				</CardContent>
			</Card>
			<Card className="lg:col-span-2">
				<CardContent>
					<div className="grid gap-5 grid-rows-5">
						<FileDropBox />
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
