import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	startTransition,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import type { components } from "@/data/APIschema";
import { PARTY_TYPE_OPTIONS } from "@/enums/PartyEnums";
import { partyMutations } from "@/lib/queries/party.queries";
import { normalizeString } from "@/lib/utils/string";
import { Button } from "../shadcn/button";
import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxItem,
	ComboboxList,
	ComboboxValue,
	useComboboxAnchor,
} from "../shadcn/combobox";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../shadcn/dialog";
import { Field, FieldGroup } from "../shadcn/field";
import { Input } from "../shadcn/input";
import { Label } from "../shadcn/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../shadcn/select";

type PartyList = components["schemas"]["PartyListModel"];
type PartyType = components["schemas"]["PartyType"];

type Props = {
	apiEndpoint: string;
	parties: PartyList[];
	selectedValues: PartyList[];
	setSelectedValues: React.Dispatch<React.SetStateAction<PartyList[]>>;
};

type CreatablePartyItem = {
	type: "create";
	creatable: string;
};

type PartyItem = PartyList | CreatablePartyItem;

function isCreatable(item: PartyItem): item is CreatablePartyItem {
	return "type" in item && item.type === "create";
}

export default function PartyCombobox({
	apiEndpoint,
	parties,
	selectedValues,
	setSelectedValues,
}: Props) {
	const [searchResults, setSearchResults] = useState<PartyList[]>(parties);
	const [searchValue, setSearchValue] = useState("");
	const [openDialog, setOpenDialog] = useState(false);

	const abortControllerRef = useRef<AbortController | null>(null);
	const highlightedItemRef = useRef<PartyItem | undefined>(undefined);
	const createInputRef = useRef<HTMLInputElement>(null);
	const pendingQueryRef = useRef("");
	const comboboxInputRef = useRef<HTMLInputElement | null>(null);
	const partyTypeRef = useRef<PartyType>("Individual");
	const anchor = useComboboxAnchor();

	const newPartyInput = useId();
	const queryClient = useQueryClient();
	const { mutateAsync } = useMutation(partyMutations.create(apiEndpoint));

	useEffect(() => {
		return () => {
			abortControllerRef.current?.abort();
		};
	}, []);

	useEffect(() => {
		if (searchValue === "") {
			setSearchResults(parties);
		}
	}, [parties, searchValue]);

	const items = useMemo(() => {
		if (selectedValues.length === 0) {
			return searchResults;
		}
		const merged = [...searchResults];

		selectedValues.forEach((party) => {
			if (!searchResults.some((result) => result.partyId === party.partyId)) {
				merged.push(party);
			}
		});

		return merged;
	}, [searchResults, selectedValues]);

	const searchParty = useCallback(
		(query: string): PartyList[] => {
			const normalizedQuery = normalizeString(query);
			return parties.filter(
				(party) =>
					party.partyNormalizedName.includes(normalizedQuery) ||
					party.partyAliases.some((alias) =>
						alias.aliasNormalizedName.includes(normalizedQuery),
					),
			);
		},
		[parties],
	);

	const searchPartyFind = useCallback(
		(query: string): PartyList | null => {
			const normalizedQuery = normalizeString(query);
			return (
				parties.find(
					(party) =>
						party.partyNormalizedName === normalizedQuery ||
						party.partyAliases.some(
							(alias) => alias.aliasNormalizedName === normalizedQuery,
						),
				) || null
			);
		},
		[parties],
	);

	const normalizedSearchString = normalizeString(searchValue);
	const exactExists = useMemo(() => {
		if (normalizedSearchString === "") return true;
		return parties.some(
			(p) =>
				p.partyNormalizedName === normalizedSearchString ||
				p.partyAliases.some(
					(a) => a.aliasNormalizedName === normalizedSearchString,
				),
		);
	}, [parties, normalizedSearchString]);

	const itemsForView = useMemo<PartyItem[]>(() => {
		if (normalizedSearchString !== "" && !exactExists) {
			return [...items, { type: "create", creatable: searchValue.trim() }];
		}
		return items;
	}, [items, normalizedSearchString, exactExists, searchValue]);

	const handleInputKeyDown = useCallback(
		async (event: React.KeyboardEvent<HTMLInputElement>) => {
			if (event.key !== "Enter" || highlightedItemRef.current) {
				return;
			}

			const currentTrimmed = searchValue.trim();
			if (currentTrimmed === "") {
				return;
			}

			const existing = searchPartyFind(currentTrimmed);
			if (existing) {
				setSelectedValues((prev) =>
					prev.some((item) => item.partyId === existing.partyId)
						? prev
						: [...prev, existing],
				);
				setSearchValue("");
				return;
			}

			pendingQueryRef.current = currentTrimmed;
			setOpenDialog(true);
		},
		[searchValue, searchPartyFind, setSelectedValues],
	);

	const handleCreateSave = async () => {
		const input = createInputRef.current || comboboxInputRef.current;
		const value = input ? input.value.trim() : "";
		if (value === "") {
			return;
		}

		const payload: components["schemas"]["CreatePartyRequest"] = {
			name: value,
			partyType: partyTypeRef.current,
		};

		try {
			const result = await mutateAsync(payload);
			toast.success("Party created successfully!");
			console.log("Created Party:", result);
			queryClient.invalidateQueries({ queryKey: ["parties", "searchList"] });
			setOpenDialog(false);
			setSearchValue("");
		} catch (error) {
			toast.error("Failed to create Party");
			console.error("Error creating Party:", error);
		}
	};

	const handleInputValueChange = useCallback(
		(nextSearchValue: string, { reason }: { reason: string }) => {
			setSearchValue(nextSearchValue);

			// Cancel previous request
			abortControllerRef.current?.abort();
			const controller = new AbortController();
			abortControllerRef.current = controller;

			if (nextSearchValue === "") {
				setSearchResults(parties);
				return;
			}

			if (reason === "item-press") {
				return;
			}

			const result = searchParty(nextSearchValue);
			if (!controller.signal.aborted) {
				startTransition(() => {
					setSearchResults(result);
				});
			}
		},
		[parties, searchParty],
	);

	const handleValueChange = useCallback(
		(next: PartyItem[]) => {
			const createRow = next.find(isCreatable);
			if (createRow) {
				pendingQueryRef.current = createRow.creatable;
				setOpenDialog(true);
				return;
			}

			const cleanValues = next.filter((x) => !isCreatable(x)) as PartyList[];
			setSelectedValues(cleanValues);
			setSearchValue("");

			if (cleanValues.length === 0) {
				setSearchResults(parties);
			}
		},
		[parties, setSelectedValues],
	);

	return (
		<>
			<Combobox
				multiple
				filter={null}
				value={selectedValues}
				items={itemsForView}
				itemToStringLabel={(item: PartyItem) =>
					isCreatable(item) ? `Create "${item.creatable}"` : item.partyName
				}
				onOpenChangeComplete={(open) => {
					if (!open) {
						setSearchResults(parties);
					}
				}}
				onValueChange={handleValueChange}
				onInputValueChange={handleInputValueChange}
			>
				<ComboboxChips ref={anchor}>
					<ComboboxValue>
						{selectedValues.map((value: PartyList) => (
							<ComboboxChip key={value.partyId}>{value.partyName}</ComboboxChip>
						))}
						<ComboboxChipsInput
							onKeyDown={handleInputKeyDown}
							ref={comboboxInputRef}
						/>
					</ComboboxValue>
				</ComboboxChips>
				<ComboboxContent anchor={anchor}>
					<ComboboxEmpty>No parties found.</ComboboxEmpty>
					<ComboboxList>
						{(item: PartyItem) =>
							isCreatable(item) ? (
								<ComboboxItem
									key={`create:${normalizeString(item.creatable)}`}
									value={item}
								>
									Create &quot;{item.creatable}&quot;
								</ComboboxItem>
							) : (
								<ComboboxItem key={item.partyId} value={item}>
									{item.partyName}
								</ComboboxItem>
							)
						}
					</ComboboxList>
				</ComboboxContent>
			</Combobox>
			<Dialog open={openDialog} onOpenChange={setOpenDialog}>
				<DialogContent
					initialFocus={createInputRef}
					className="top-[calc(50%+1.25rem*var(--nested-dialogs))] scale-[calc(1-0.1*var(--nested-dialogs))] data-[nested-dialog-open]:after:absolute data-[nested-dialog-open]:after:inset-0 data-[nested-dialog-open]:after:rounded-[inherit] data-[nested-dialog-open]:after:bg-black/5"
				>
					<DialogHeader>
						<DialogTitle>Create Party</DialogTitle>
					</DialogHeader>
					<FieldGroup>
						<Field>
							<Label htmlFor={newPartyInput} className="sr-only">
								Name
							</Label>
							<Input
								id={newPartyInput}
								ref={createInputRef}
								defaultValue={pendingQueryRef.current}
							/>
						</Field>
						<Field>
							<Label htmlFor="type">Party Type</Label>
							<Select
								onValueChange={(value) => {
									partyTypeRef.current =
										value as unknown as components["schemas"]["PartyType"];
								}}
								defaultValue={String(PARTY_TYPE_OPTIONS[0].value)}
							>
								<SelectTrigger>
									<SelectValue></SelectValue>
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{PARTY_TYPE_OPTIONS.map((item) => (
											<SelectItem key={item.value} value={item.value}>
												{item.label}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</Field>
					</FieldGroup>
					<DialogFooter>
						<DialogClose render={<Button variant="outline">Cancel</Button>} />
						<Button type="submit" onClick={handleCreateSave}>
							Save changes
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
