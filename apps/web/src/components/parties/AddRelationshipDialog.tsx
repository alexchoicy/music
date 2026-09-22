import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDownIcon, ArrowLeftRightIcon } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "#/components/coss/alert";
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
} from "#/components/coss/dialog";
import { EnumFieldSelect } from "#/components/enumFieldSelect";
import {
	partyRelationshipMutation,
	relationshipLabels,
	relationshipOptions,
} from "#/lib/queries/party-relationships.queries";
import type { RelationshipType } from "#/lib/queries/party-relationships.queries";

import { RelationshipPartyPicker } from "./RelationshipPartyPicker";
import type { RelationshipPartyOption } from "./RelationshipPartyPicker";

export function AddRelationshipDialog({
	initialParty,
	onClose,
	onCreated,
}: {
	initialParty: RelationshipPartyOption;
	onClose: () => void;
	onCreated: (partyId: number) => void;
}) {
	const [source, setSource] = useState<RelationshipPartyOption | null>(
		initialParty,
	);
	const [target, setTarget] = useState<RelationshipPartyOption | null>(null);
	const [type, setType] = useState<RelationshipType>("MemberOf");
	const queryClient = useQueryClient();
	const mutation = useMutation({
		...partyRelationshipMutation.create(),
		onSuccess: async (created) => {
			await queryClient.invalidateQueries({
				queryKey: ["party-relationships"],
			});
			onCreated(Number(created.sourcePartyId));
		},
	});
	const canSubmit =
		source !== null && target !== null && source.partyId !== target.partyId;

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !mutation.isPending) onClose();
			}}
		>
			<DialogPopup showCloseButton={!mutation.isPending}>
				<DialogHeader>
					<DialogTitle>Add relationship</DialogTitle>
					<DialogDescription>
						Connect two parties. The arrow goes from the source to the target.
					</DialogDescription>
				</DialogHeader>
				<form
					className="contents"
					onSubmit={(event) => {
						event.preventDefault();
						if (!source || !target || !canSubmit || mutation.isPending) return;
						mutation.mutate({
							sourcePartyId: source.partyId,
							targetPartyId: target.partyId,
							type,
						});
					}}
				>
					<DialogPanel>
						<div className="flex flex-col gap-5">
							<RelationshipPartyPicker
								label="Source party"
								value={source}
								onChange={setSource}
								excludedId={target?.partyId}
								disabled={mutation.isPending}
							/>
							<div className="flex items-center gap-3">
								<ArrowDownIcon
									aria-hidden="true"
									className="size-4 shrink-0 text-muted-foreground"
								/>
								<fieldset
									className="min-w-0 flex-1"
									disabled={mutation.isPending}
								>
									<EnumFieldSelect
										label="Relationship"
										options={relationshipOptions}
										value={type}
										onValueChange={setType}
									/>
								</fieldset>
								<Button
									aria-label="Swap source and target"
									disabled={mutation.isPending || !target}
									onClick={() => {
										setSource(target);
										setTarget(source);
									}}
									size="icon"
									type="button"
									variant="outline"
								>
									<ArrowLeftRightIcon aria-hidden="true" />
								</Button>
							</div>
							<RelationshipPartyPicker
								label="Target party"
								value={target}
								onChange={setTarget}
								excludedId={source?.partyId}
								disabled={mutation.isPending}
							/>
							<p
								aria-live="polite"
								className="rounded-lg bg-muted px-3 py-2.5 text-sm leading-6"
							>
								<strong>{source?.name ?? "Source party"}</strong> →{" "}
								{relationshipLabels[type].toLowerCase()} →{" "}
								<strong>{target?.name ?? "Target party"}</strong>
							</p>
							{type === "VoiceActorOf" && (
								<p className="text-sm text-muted-foreground">
									Choose the performer as the source and the character as the
									target.
								</p>
							)}
							{mutation.error && (
								<Alert variant="error">
									<AlertDescription>{mutation.error.message}</AlertDescription>
								</Alert>
							)}
						</div>
					</DialogPanel>
					<DialogFooter>
						<DialogClose
							disabled={mutation.isPending}
							render={<Button type="button" variant="ghost" />}
						>
							Cancel
						</DialogClose>
						<Button disabled={!canSubmit || mutation.isPending} type="submit">
							{mutation.isPending ? "Adding…" : "Add relationship"}
						</Button>
					</DialogFooter>
				</form>
			</DialogPopup>
		</Dialog>
	);
}
