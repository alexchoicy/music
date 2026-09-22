import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ListIcon, Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";

import { Alert, AlertDescription } from "#/components/coss/alert";
import {
	AlertDialog,
	AlertDialogClose,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogPopup,
	AlertDialogTitle,
} from "#/components/coss/alert-dialog";
import { Button } from "#/components/coss/button";
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
} from "#/components/coss/dialog";
import { Input } from "#/components/coss/input";
import { toastManager } from "#/components/coss/toast";
import {
	partyRelationshipMutation,
	relationshipLabels,
} from "#/lib/queries/party-relationships.queries";
import type {
	Relationship,
	RelationshipGraph,
} from "#/lib/queries/party-relationships.queries";

export function ManageRelationshipsDialog({
	graph,
}: {
	graph: RelationshipGraph;
}) {
	const [search, setSearch] = useState("");
	const searchInput = useRef<HTMLInputElement>(null);
	const [selected, setSelected] = useState<Relationship | null>(null);
	const queryClient = useQueryClient();
	const mutation = useMutation({
		...partyRelationshipMutation.delete(),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["party-relationships"],
			});
			setSelected(null);
			toastManager.add({ title: "Relationship deleted", type: "success" });
		},
	});
	const names = new Map(
		graph.parties.map((party) => [Number(party.partyId), party.name]),
	);
	const describe = (edge: Relationship) =>
		`${names.get(Number(edge.sourcePartyId))} → ${relationshipLabels[edge.type]} → ${names.get(Number(edge.targetPartyId))}`;
	const filtered = graph.relationships.filter((edge) =>
		describe(edge)
			.toLocaleLowerCase()
			.includes(search.trim().toLocaleLowerCase()),
	);

	return (
		<Dialog>
			<DialogTrigger
				disabled={graph.relationships.length === 0}
				render={<Button type="button" variant="outline" />}
			>
				<ListIcon aria-hidden="true" />
				Manage relationships
			</DialogTrigger>
			<DialogPopup>
				<DialogHeader>
					<DialogTitle>Manage relationships</DialogTitle>
					<DialogDescription>
						View and delete saved relationships in this network.
					</DialogDescription>
					<Input
						aria-label="Search relationships"
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search parties or relationship types…"
						ref={searchInput}
						type="search"
						value={search}
					/>
				</DialogHeader>
				<DialogPanel>
					{filtered.length === 0 ? (
						<p className="py-6 text-center text-sm text-muted-foreground">
							{graph.relationships.length === 0
								? "No relationships yet."
								: "No matching relationships."}
						</p>
					) : (
						<ul aria-label="Saved relationships" className="divide-y">
							{filtered.map((edge) => (
								<li
									className="flex items-center gap-3 py-3"
									key={edge.relationshipId}
								>
									<div className="min-w-0 flex-1 text-sm wrap-anywhere">
										<p>{describe(edge)}</p>
									</div>
									<Button
										aria-label={`Delete ${describe(edge)}`}
										onClick={() => {
											mutation.reset();
											setSelected(edge);
										}}
										size="icon"
										type="button"
										variant="destructive-outline"
									>
										<Trash2Icon aria-hidden="true" />
									</Button>
								</li>
							))}
						</ul>
					)}
				</DialogPanel>
				<DialogFooter>
					<DialogClose render={<Button type="button" variant="ghost" />}>
						Close
					</DialogClose>
				</DialogFooter>
				<AlertDialog
					open={selected !== null}
					onOpenChange={(open) => {
						if (!open && !mutation.isPending) setSelected(null);
					}}
				>
					<AlertDialogPopup finalFocus={searchInput}>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete relationship?</AlertDialogTitle>
							<AlertDialogDescription className="wrap-anywhere">
								{selected && describe(selected)}
							</AlertDialogDescription>
							<p className="text-sm text-muted-foreground">
								This removes the saved relationship. Both parties stay in your
								library.
							</p>
							{mutation.error && (
								<Alert variant="error">
									<AlertDescription>{mutation.error.message}</AlertDescription>
								</Alert>
							)}
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogClose
								disabled={mutation.isPending}
								render={<Button type="button" variant="ghost" />}
							>
								Cancel
							</AlertDialogClose>
							<Button
								disabled={mutation.isPending || !selected}
								onClick={() => {
									if (selected && !mutation.isPending)
										mutation.mutate(selected.relationshipId);
								}}
								type="button"
								variant="destructive"
							>
								{mutation.isPending ? "Deleting…" : "Delete relationship"}
							</Button>
						</AlertDialogFooter>
					</AlertDialogPopup>
				</AlertDialog>
			</DialogPopup>
		</Dialog>
	);
}
