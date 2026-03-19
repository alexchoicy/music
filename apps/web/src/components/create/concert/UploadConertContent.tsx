import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery } from "@tanstack/react-query";
import { GripVerticalIcon, ImageIcon } from "lucide-react";
import pMap from "p-map";
import {
	type ChangeEvent,
	type Dispatch,
	type SetStateAction,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import ConcertAlbumCombobox from "@/components/combobox/concertAlbumCombobox";
import PartyCombobox from "@/components/combobox/partyCombobox";
import { Button } from "@/components/shadcn/button";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/shadcn/select";
import { Textarea } from "@/components/shadcn/textarea";
import type { components } from "@/data/APIschema";
import { CONCERT_FILE_TYPE_OPTIONS } from "@/enums/concert";
import { albumQueries } from "@/lib/queries/album.queries";
import { partyQueries } from "@/lib/queries/party.queries";
import { extFromFilename } from "@/lib/utils/file";
import { hashBlake3Simple } from "@/lib/utils/hash";
import { FileDropBox } from "./fileDropBox";

type PartyList = components["schemas"]["PartyListModel"];
type AlbumListItem = components["schemas"]["AlbumListItemModel"];
type ConcertFileType = components["schemas"]["ConcertFileType"];

type LocalConcertFile = {
	title: string;
	order: number;
	type: ConcertFileType;
	simpleBlake3Hash: string;
	mimeType: string;
	fileSizeInBytes: number;
	originalFileName: string;
	localFile: File;
};

type UploadConcertContentProps = {
	isProcessing: boolean;
	setIsProcessing: Dispatch<SetStateAction<boolean>>;
	onUploadReady: (uploadAction: (() => Promise<void>) | null) => void;
};

type LocalConcertImage = {
	file: File;
	previewUrl: string;
};

type UpdateConcertFile = <
	K extends keyof Pick<LocalConcertFile, "title" | "type">,
>(
	hash: string,
	field: K,
	value: LocalConcertFile[K],
) => void;

type SortableConcertFileCardProps = {
	concertFile: LocalConcertFile;
	onUpdateConcertFile: UpdateConcertFile;
};

function SortableConcertFileCard({
	concertFile,
	onUpdateConcertFile,
}: SortableConcertFileCardProps) {
	const titleFieldId = useId();
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: concertFile.simpleBlake3Hash });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={[
				"min-w-0 rounded-lg border bg-background p-4",
				isDragging ? "z-10 shadow-md ring-1 ring-border" : "",
			]
				.filter(Boolean)
				.join(" ")}
		>
			<div className="flex items-start gap-3">
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					className="mt-1 shrink-0 cursor-grab touch-none active:cursor-grabbing"
					aria-label={`Reorder ${concertFile.originalFileName}`}
					{...attributes}
					{...listeners}
				>
					<GripVerticalIcon />
				</Button>

				<div className="min-w-0 flex-1 space-y-3">
					<div className="flex items-center gap-3">
						<div className="text-muted-foreground w-8 shrink-0 text-sm font-medium tabular-nums">
							{String(concertFile.order + 1).padStart(2, "0")}
						</div>
						<Field className="min-w-0 flex-1">
							<FieldLabel htmlFor={titleFieldId} className="sr-only">
								Title
							</FieldLabel>
							<Input
								id={titleFieldId}
								value={concertFile.title}
								onChange={(event) =>
									onUpdateConcertFile(
										concertFile.simpleBlake3Hash,
										"title",
										event.target.value,
									)
								}
								placeholder="Concert file title"
							/>
						</Field>
					</div>

					<div className="flex flex-col gap-2 pl-11 sm:flex-row sm:items-center">
						<Field className="sm:w-44">
							<FieldLabel className="sr-only">Type</FieldLabel>
							<Select
								value={concertFile.type}
								onValueChange={(value) =>
									onUpdateConcertFile(
										concertFile.simpleBlake3Hash,
										"type",
										value as ConcertFileType,
									)
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select file type" />
								</SelectTrigger>
								<SelectContent>
									{CONCERT_FILE_TYPE_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>

						<p className="text-muted-foreground min-w-0 flex-1 break-all text-xs sm:text-sm">
							{concertFile.originalFileName}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

export function UploadConcertContent({
	isProcessing,
	setIsProcessing,
	onUploadReady: _onUploadReady,
}: UploadConcertContentProps) {
	const { data: parties = [] } = useQuery(partyQueries.getPartySearchList(""));
	const { data: albums = [] } = useQuery(albumQueries.list());
	const titleFieldId = useId();
	const descriptionFieldId = useId();
	const imageInputRef = useRef<HTMLInputElement>(null);

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [mainParties, setMainParties] = useState<PartyList[]>([]);
	const [guestParties, setGuestParties] = useState<PartyList[]>([]);
	const [selectedAlbums, setSelectedAlbums] = useState<AlbumListItem[]>([]);
	const [concertImage, setConcertImage] = useState<LocalConcertImage | null>(
		null,
	);
	const [concertFiles, setConcertFiles] = useState<
		Record<string, LocalConcertFile>
	>({});

	useEffect(() => {
		return () => {
			if (concertImage?.previewUrl) {
				URL.revokeObjectURL(concertImage.previewUrl);
			}
		};
	}, [concertImage]);

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

	const orderedConcertFiles = useMemo(
		() => Object.values(concertFiles).sort((a, b) => a.order - b.order),
		[concertFiles],
	);

	const updateConcertFile = useCallback(
		<K extends keyof Pick<LocalConcertFile, "title" | "type">>(
			hash: string,
			field: K,
			value: LocalConcertFile[K],
		) => {
			setConcertFiles((currentFiles) => {
				const targetFile = currentFiles[hash];
				if (!targetFile || targetFile[field] === value) return currentFiles;

				return {
					...currentFiles,
					[hash]: {
						...targetFile,
						[field]: value,
					},
				};
			});
		},
		[],
	);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 8 },
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragEnd = useCallback((event: DragEndEvent) => {
		const { active, over } = event;

		if (!over || active.id === over.id) return;

		setConcertFiles((currentFiles) => {
			const currentOrderedFiles = Object.values(currentFiles).sort(
				(a, b) => a.order - b.order,
			);
			const oldIndex = currentOrderedFiles.findIndex(
				(file) => file.simpleBlake3Hash === active.id,
			);
			const newIndex = currentOrderedFiles.findIndex(
				(file) => file.simpleBlake3Hash === over.id,
			);

			if (oldIndex < 0 || newIndex < 0) return currentFiles;

			const reorderedFiles = arrayMove(currentOrderedFiles, oldIndex, newIndex);

			return Object.fromEntries(
				reorderedFiles.map((file, index) => [
					file.simpleBlake3Hash,
					{ ...file, order: index },
				]),
			);
		});
	}, []);

	const handleConcertImageChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			const nextFile = event.target.files?.[0];
			if (!nextFile) return;

			const previewUrl = URL.createObjectURL(nextFile);

			setConcertImage((currentImage) => {
				if (currentImage?.previewUrl) {
					URL.revokeObjectURL(currentImage.previewUrl);
				}

				return {
					file: nextFile,
					previewUrl,
				};
			});

			event.target.value = "";
		},
		[],
	);

	const onDrop = async (files: File[]) => {
		setIsProcessing(true);

		const baseLength = Object.keys(concertFiles).length;

		const newFileState = { ...concertFiles };

		try {
			const processedFiles = await pMap(
				files,
				async (file, index) => {
					const { blake3Hash } = await hashBlake3Simple(file);
					const fileExtension = extFromFilename(file.name);
					const defaultTitle = fileExtension
						? file.name.slice(0, -(fileExtension.length + 1))
						: file.name;

					return {
						title: defaultTitle,
						type: "Performance" as ConcertFileType,
						order: baseLength + index,
						simpleBlake3Hash: blake3Hash,
						mimeType: file.type,
						fileSizeInBytes: file.size,
						originalFileName: file.name,
						localFile: file,
					};
				},
				{ concurrency: 2 },
			);

			for (const processedFile of processedFiles) {
				if (!processedFile) continue;

				if (newFileState[processedFile.simpleBlake3Hash]) continue;

				newFileState[processedFile.simpleBlake3Hash] = processedFile;
			}

			setConcertFiles(newFileState);
		} finally {
			setIsProcessing(false);
		}
	};

	const onUpload = useCallback(async () => {
		console.log(concertFiles);
	}, [concertFiles]);

	useEffect(() => {
		_onUploadReady(onUpload);

		return () => {
			_onUploadReady(null);
		};
	}, [onUpload, _onUploadReady]);

	return (
		<div className="grid gap-2 p-6 lg:grid-cols-5">
			<Card className="min-w-0 lg:col-span-3">
				<CardHeader>
					<CardTitle>Concert Details</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="overflow-hidden rounded-xl border bg-sidebar/30 p-4 shadow-sm">
						<div className="aspect-video overflow-hidden rounded-lg border bg-muted/40">
							{concertImage ? (
								<img
									src={concertImage.previewUrl}
									alt="Concert preview"
									className="h-full w-full object-cover"
								/>
							) : (
								<div className="text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center">
									<div className="bg-background flex h-12 w-12 items-center justify-center rounded-full border">
										<ImageIcon className="h-6 w-6" />
									</div>
									<div className="space-y-1">
										<p className="text-sm font-medium">16:9 preview</p>
										<p className="text-xs">
											Add a concert image to preview it locally.
										</p>
									</div>
								</div>
							)}
						</div>
						<div className="mt-4 flex items-center justify-between gap-3">
							<div className="min-w-0">
								<p className="text-sm font-medium">Concert Image</p>
								<p className="text-muted-foreground truncate text-xs">
									{concertImage?.file.name || "No image selected"}
								</p>
							</div>
							<input
								ref={imageInputRef}
								type="file"
								accept="image/*"
								className="hidden"
								onChange={handleConcertImageChange}
							/>
							<Button
								type="button"
								variant="outline"
								onClick={() => imageInputRef.current?.click()}
							>
								Upload Image
							</Button>
						</div>
					</div>
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
			<Card className="min-w-0 lg:col-span-2 lg:h-full">
				<CardContent className="min-w-0 lg:flex lg:h-full lg:min-h-0 lg:flex-col">
					<div className="flex min-w-0 flex-col gap-5 lg:h-full lg:min-h-0">
						<FileDropBox isProcessing={isProcessing} onDrop={onDrop} />
						{orderedConcertFiles.length > 0 && (
							<div className="flex min-h-0 min-w-0 flex-1 flex-col space-y-3 overflow-hidden">
								<DndContext
									sensors={sensors}
									collisionDetection={closestCenter}
									onDragEnd={handleDragEnd}
								>
									<SortableContext
										items={orderedConcertFiles.map(
											(concertFile) => concertFile.simpleBlake3Hash,
										)}
										strategy={verticalListSortingStrategy}
									>
										<div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden pr-1">
											{orderedConcertFiles.map((concertFile) => (
												<SortableConcertFileCard
													key={concertFile.simpleBlake3Hash}
													concertFile={concertFile}
													onUpdateConcertFile={updateConcertFile}
												/>
											))}
										</div>
									</SortableContext>
								</DndContext>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
