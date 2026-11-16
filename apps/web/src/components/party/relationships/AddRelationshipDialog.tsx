import type * as API from "@music/api";
import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useId, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "#/components/base/alert";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/base/avatar";
import { Button } from "#/components/base/button";
import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxEmpty,
	ComboboxItem,
	ComboboxList,
	ComboboxPopup,
	ComboboxStatus,
	ComboboxValue,
} from "#/components/base/combobox";
import {
	Dialog,
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
	DialogTrigger,
} from "#/components/base/dialog";
import { Label } from "#/components/base/label";
import {
	Select,
	SelectItem,
	SelectPopup,
	SelectTrigger,
	SelectValue,
} from "#/components/base/select";
import { toastManager } from "#/components/base/toast";
import { COUNTRY_CODE, PARTY_KIND, PARTY_TYPE } from "#/enums/partyEnums";
import { useDebouncedValue } from "#/hooks/use-debounced-value";
import { partyRelationshipMutation } from "#/lib/queries/party-relationships.queries";
import type {
	RelationshipGraph,
	RelationshipType,
} from "#/lib/queries/party-relationships.queries";
import { partyQueries } from "#/lib/queries/party.queries";
import { getPartyAvatarUrl } from "#/lib/utils/party";
import { getInitials } from "#/lib/utils/string";

type PartyOption = {
	partyId: number;
	name: string;
	meta: string;
	avatarUrl: string | null;
};

// Each role reads as "<this party> <label> <picked parties>". `outgoing` says
// whether this party is the stored source of the relationship.
type Role = {
	value: string;
	type: RelationshipType;
	outgoing: boolean;
	label: string;
	pickerLabel: string;
};

const ROLES: Role[] = [
	{
		value: "member-of",
		type: "MemberOf",
		outgoing: true,
		label: "Is a member of",
		pickerLabel: "Groups",
	},
	{
		value: "has-member",
		type: "MemberOf",
		outgoing: false,
		label: "Has as members",
		pickerLabel: "Members",
	},
	{
		value: "voice-actor-for",
		type: "VoiceActorOf",
		outgoing: true,
		label: "Is the voice actor for",
		pickerLabel: "Characters",
	},
	{
		value: "voiced-by",
		type: "VoiceActorOf",
		outgoing: false,
		label: "Is voiced by",
		pickerLabel: "Voice actors",
	},
	{
		value: "affiliated-with",
		type: "AffiliatedWith",
		outgoing: true,
		label: "Is affiliated with",
		pickerLabel: "Parties",
	},
];

const createRelationship = partyRelationshipMutation.create().mutationFn;

function plural(count: number) {
	return count === 1 ? "relationship" : `${count} relationships`;
}

/** Parties this party already has the given role with. */
function relatedPartyIds(
	graph: RelationshipGraph | undefined,
	partyId: number,
	role: Role,
) {
	// An affiliation reads the same from either side.
	const eitherWay = role.type === "AffiliatedWith";
	const ids = new Set<number>();
	for (const edge of graph?.relationships ?? []) {
		if (edge.type !== role.type) continue;
		const sourceId = Number(edge.sourcePartyId);
		const targetId = Number(edge.targetPartyId);
		if (sourceId === partyId && (role.outgoing || eitherWay)) ids.add(targetId);
		if (targetId === partyId && (!role.outgoing || eitherWay))
			ids.add(sourceId);
	}
	return ids;
}

export function AddRelationshipDialog({
	party,
	graph,
}: {
	party: API.PartyDetails;
	graph: RelationshipGraph | undefined;
}) {
	const [open, setOpen] = useState(false);

	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger render={<Button />}>
				<PlusIcon aria-hidden="true" />
				Add relationship
			</DialogTrigger>
			<DialogPopup>
				<AddRelationshipForm
					graph={graph}
					onDone={() => setOpen(false)}
					party={party}
				/>
			</DialogPopup>
		</Dialog>
	);
}

function AddRelationshipForm({
	party,
	graph,
	onDone,
}: {
	party: API.PartyDetails;
	graph: RelationshipGraph | undefined;
	onDone: () => void;
}) {
	const partyId = Number(party.partyId);
	const roleId = useId();
	const pickerId = useId();
	const [role, setRole] = useState<Role>(
		() =>
			ROLES.find(
				(item) =>
					item.value ===
					(party.type === "Group" || party.type === "Project"
						? "has-member"
						: "member-of"),
			) ?? ROLES[0],
	);
	const [selected, setSelected] = useState<PartyOption[]>([]);
	const alreadyRelated = relatedPartyIds(graph, partyId, role);
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (targets: PartyOption[]) => {
			const results = await Promise.allSettled(
				targets.map((target) =>
					createRelationship(
						role.outgoing
							? {
									sourcePartyId: partyId,
									targetPartyId: target.partyId,
									type: role.type,
								}
							: {
									sourcePartyId: target.partyId,
									targetPartyId: partyId,
									type: role.type,
								},
					),
				),
			);
			await queryClient.invalidateQueries({
				queryKey: ["party-relationships"],
			});
			return targets.flatMap((target, index) => {
				const result = results[index];
				return result.status === "rejected"
					? [
							{
								target,
								message:
									result.reason instanceof Error
										? result.reason.message
										: "Something went wrong.",
							},
						]
					: [];
			});
		},
		onSuccess: (failures, targets) => {
			const added = targets.length - failures.length;
			if (added > 0)
				toastManager.add({
					title: `Added ${plural(added)}`,
					type: "success",
				});
			// Keep the ones that failed selected so they can be retried.
			if (failures.length > 0)
				setSelected(failures.map((failure) => failure.target));
			else onDone();
		},
	});
	const failures = mutation.data ?? [];
	const avatarUrl = getPartyAvatarUrl(party.avatarImages);

	return (
		<form
			className="contents"
			onSubmit={(event) => {
				event.preventDefault();
				if (selected.length > 0 && !mutation.isPending)
					mutation.mutate(selected);
			}}
		>
			<DialogHeader>
				<DialogTitle>Add relationship</DialogTitle>
				<DialogDescription>
					Describe how this party connects to others in your library.
				</DialogDescription>
			</DialogHeader>
			<DialogPanel>
				<div className="flex flex-col gap-4">
					<div className="flex items-center gap-3">
						<Avatar size="md">
							{avatarUrl && <AvatarImage alt="" src={avatarUrl} />}
							<AvatarFallback>{getInitials(party.name)}</AvatarFallback>
						</Avatar>
						<span className="min-w-0 text-base font-semibold wrap-anywhere">
							{party.name}
						</span>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor={roleId} variant="muted">
							Relationship
						</Label>
						<Select
							disabled={mutation.isPending}
							items={ROLES}
							itemToStringLabel={(item) => item.label}
							itemToStringValue={(item) => item.value}
							onValueChange={(next) => {
								if (!next) return;
								const taken = relatedPartyIds(graph, partyId, next);
								setRole(next);
								setSelected((current) =>
									current.filter((item) => !taken.has(item.partyId)),
								);
								mutation.reset();
							}}
							value={role}
						>
							<SelectTrigger id={roleId}>
								<SelectValue />
							</SelectTrigger>
							<SelectPopup>
								{ROLES.map((item) => (
									<SelectItem key={item.value} value={item}>
										{item.label}
									</SelectItem>
								))}
							</SelectPopup>
						</Select>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor={pickerId} variant="muted">
							{role.pickerLabel}
						</Label>
						<RelationshipPartyPicker
							alreadyRelated={alreadyRelated}
							disabled={mutation.isPending}
							excludedId={partyId}
							id={pickerId}
							label={role.pickerLabel}
							onChange={(next) => {
								setSelected(next);
								mutation.reset();
							}}
							value={selected}
						/>
						<p className="text-xs text-muted-foreground">
							Pick one or more. Each becomes its own relationship.
						</p>
					</div>

					{mutation.error && (
						<Alert variant="error">
							<AlertTitle>Could not add relationships</AlertTitle>
							<AlertDescription>{mutation.error.message}</AlertDescription>
						</Alert>
					)}
					{failures.length > 0 && (
						<Alert variant="error">
							<AlertTitle>Could not add {plural(failures.length)}</AlertTitle>
							<AlertDescription>
								<ul className="flex flex-col gap-0.5">
									{failures.map((failure) => (
										<li key={failure.target.partyId}>
											{failure.target.name}: {failure.message}
										</li>
									))}
								</ul>
							</AlertDescription>
						</Alert>
					)}
				</div>
			</DialogPanel>
			<DialogFooter>
				<DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
				<Button
					disabled={selected.length === 0}
					loading={mutation.isPending}
					type="submit"
				>
					{failures.length > 0 ? "Try again" : `Add ${plural(selected.length)}`}
				</Button>
			</DialogFooter>
		</form>
	);
}

function RelationshipPartyPicker({
	id,
	label,
	value,
	onChange,
	excludedId,
	alreadyRelated,
	disabled,
}: {
	id: string;
	label: string;
	value: PartyOption[];
	onChange: (parties: PartyOption[]) => void;
	excludedId: number;
	alreadyRelated: Set<number>;
	disabled: boolean;
}) {
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebouncedValue(search, 250).trim();
	const result = useQuery({
		...partyQueries.getParties({ Search: debouncedSearch, Limit: 20 }),
		placeholderData: keepPreviousData,
	});
	const items: PartyOption[] = (result.data ?? [])
		.filter((party) => Number(party.partyId) !== excludedId)
		.map((party) => ({
			partyId: Number(party.partyId),
			name: party.name,
			avatarUrl: party.coverUrl || null,
			meta: [
				COUNTRY_CODE[party.country],
				PARTY_KIND[party.kind],
				party.type ? PARTY_TYPE[party.type] : null,
			]
				.filter(Boolean)
				.join(" · "),
		}));
	const isSearching = search.trim() !== debouncedSearch || result.isFetching;

	return (
		<Combobox<PartyOption, true>
			disabled={disabled}
			filter={null}
			inputValue={search}
			isItemEqualToValue={(item, other) => item.partyId === other.partyId}
			items={items}
			itemToStringLabel={(item) => item.name}
			multiple
			onInputValueChange={setSearch}
			onValueChange={(next) => {
				onChange(next);
				setSearch("");
			}}
			value={value}
		>
			<ComboboxChips>
				<ComboboxValue>
					{(chips: PartyOption[]) => (
						<>
							{chips.map((item) => (
								<ComboboxChip
									key={item.partyId}
									removeProps={{ "aria-label": `Remove ${item.name}` }}
								>
									{item.name}
								</ComboboxChip>
							))}
							<ComboboxChipsInput
								aria-label={label}
								id={id}
								placeholder={chips.length > 0 ? "" : "Search parties…"}
							/>
						</>
					)}
				</ComboboxValue>
			</ComboboxChips>
			<ComboboxPopup className="w-(--anchor-width)">
				<ComboboxStatus>
					{isSearching && items.length === 0
						? "Searching…"
						: result.isError
							? "Unable to search parties."
							: null}
				</ComboboxStatus>
				<ComboboxEmpty>No parties found.</ComboboxEmpty>
				<ComboboxList>
					{(item: PartyOption) => {
						const taken = alreadyRelated.has(item.partyId);
						return (
							<ComboboxItem disabled={taken} key={item.partyId} value={item}>
								<span className="flex min-w-0 items-center gap-2.5 py-0.5">
									<Avatar className="size-7">
										{item.avatarUrl && (
											<AvatarImage alt="" loading="lazy" src={item.avatarUrl} />
										)}
										<AvatarFallback>{getInitials(item.name)}</AvatarFallback>
									</Avatar>
									<span className="flex min-w-0 flex-1 flex-col">
										<span className="truncate">{item.name}</span>
										<span className="truncate text-xs text-muted-foreground">
											{taken ? "Already added" : item.meta}
										</span>
									</span>
								</span>
							</ComboboxItem>
						);
					}}
				</ComboboxList>
			</ComboboxPopup>
		</Combobox>
	);
}
