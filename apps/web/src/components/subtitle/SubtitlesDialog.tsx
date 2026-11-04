import type { ParsedLyrics } from "@music/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUpIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useId, useMemo, useState } from "react";
import type { ChangeEvent } from "react";

import { LanguageSelect } from "#/components/album/edit/LanguageSelect";
import { Alert, AlertDescription } from "#/components/base/alert";
import { Badge } from "#/components/base/badge";
import { Button } from "#/components/base/button";
import {
	Dialog,
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "#/components/base/dialog";
import { Field, FieldLabel } from "#/components/base/field";
import { Fieldset, FieldsetLegend } from "#/components/base/fieldset";
import { Input } from "#/components/base/input";
import { Skeleton } from "#/components/base/skeleton";
import { Textarea } from "#/components/base/textarea";
import { toastManager } from "#/components/base/toast";
import { FilterSelect } from "#/components/library/FilterSelect";
import {
	ConfirmDialog,
	useDialogSubject,
} from "#/components/settings/SettingsSection";
import {
	SUBTITLE_FORMAT,
	SUBTITLE_FORMAT_BY_EXTENSION,
	subtitleFormatsFor,
	SYNCED_LYRICS_FORMATS,
} from "#/enums/subtitleEnums";
import {
	subtitleActions,
	subtitleQueries,
} from "#/lib/queries/subtitle.queries";
import type {
	SubtitleDetails,
	SubtitleFormat,
	SubtitleOwner,
	SubtitleSummary,
} from "#/lib/queries/subtitle.queries";
import {
	parseLyrics,
	subtitleLabel,
	ttmlAgents,
	withHongKongChinese,
	withTtmlAgentName,
} from "#/lib/utils/subtitles";
import type { TtmlAgent } from "#/lib/utils/subtitles";

type SubtitleDraft = {
	title: string;
	format: SubtitleFormat;
	languageId: number | null;
	content: string;
};

function toDraft(subtitle: SubtitleDetails): SubtitleDraft {
	return {
		title: subtitle.title ?? "",
		format: subtitle.format,
		languageId:
			subtitle.languageId == null ? null : Number(subtitle.languageId),
		content: subtitle.content,
	};
}

export function SubtitlesDialog({
	owner,
	ownerTitle,
	subtitles,
	onChange,
	onClose,
}: {
	owner: SubtitleOwner;
	ownerTitle: string;
	subtitles: SubtitleSummary[];
	onChange: () => void;
	onClose: () => void;
}) {
	const queryClient = useQueryClient();
	const [editing, setEditing] = useState<SubtitleSummary | "new" | null>(null);
	const removing = useDialogSubject<SubtitleSummary>();

	const removeMutation = useMutation({
		mutationFn: (subtitle: SubtitleSummary) =>
			subtitleActions.remove(subtitle.subtitleId),
		onSuccess: (_, subtitle) => {
			queryClient.removeQueries({
				queryKey: subtitleQueries.getSubtitle(subtitle.subtitleId).queryKey,
			});
			onChange();
			removing.close();
			toastManager.add({ title: "Subtitle removed", type: "success" });
		},
	});

	const [isSaving, setIsSaving] = useState(false);
	const isBusy = isSaving || removeMutation.isPending;
	const editorProps = {
		owner,
		onBack: () => setEditing(null),
		onPendingChange: setIsSaving,
		onSaved: () => {
			onChange();
			setEditing(null);
		},
	};

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !isBusy) onClose();
			}}
		>
			<DialogPopup className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>
						{editing === "new"
							? "Add subtitle"
							: editing
								? "Edit subtitle"
								: "Subtitles"}
					</DialogTitle>
					<DialogDescription className="[overflow-wrap:anywhere]">
						{ownerTitle}
					</DialogDescription>
				</DialogHeader>

				{editing === "new" ? (
					<SubtitleEditor {...editorProps} subtitle={null} />
				) : editing ? (
					<ExistingSubtitleEditor
						{...editorProps}
						key={editing.subtitleId}
						subtitleId={editing.subtitleId}
					/>
				) : (
					<>
						<DialogPanel>
							{subtitles.length === 0 ? (
								<p className="py-4 text-sm text-muted-foreground">
									No subtitles yet.
								</p>
							) : (
								<ul className="-mx-2 flex flex-col">
									{subtitles.map((subtitle) => (
										<li
											className="flex items-center gap-2 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-accent/60"
											key={subtitle.subtitleId}
										>
											<div className="flex min-w-0 flex-1 flex-col gap-0.5">
												<span className="truncate text-sm font-medium">
													{subtitleLabel(subtitle)}
												</span>
												<div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
													<Badge size="sm" variant="secondary">
														{SUBTITLE_FORMAT[subtitle.format]}
													</Badge>
													<span>{subtitle.languageName ?? "No language"}</span>
												</div>
											</div>
											<Button
												aria-label={`Edit ${subtitleLabel(subtitle)}`}
												disabled={isBusy}
												onClick={() => setEditing(subtitle)}
												size="icon-sm"
												variant="ghost"
											>
												<PencilIcon aria-hidden="true" />
											</Button>
											<Button
												aria-label={`Remove ${subtitleLabel(subtitle)}`}
												disabled={isBusy}
												onClick={() => removing.show(subtitle)}
												size="icon-sm"
												variant="ghost"
											>
												<Trash2Icon aria-hidden="true" />
											</Button>
										</li>
									))}
								</ul>
							)}
						</DialogPanel>
						<DialogFooter>
							<DialogClose
								disabled={isBusy}
								render={<Button variant="ghost" />}
							>
								Close
							</DialogClose>
							<Button disabled={isBusy} onClick={() => setEditing("new")}>
								<PlusIcon aria-hidden="true" />
								Add subtitle
							</Button>
						</DialogFooter>
					</>
				)}
			</DialogPopup>

			<ConfirmDialog
				confirmLabel="Remove"
				description={
					<>Remove “{removing.subject && subtitleLabel(removing.subject)}”?</>
				}
				mutation={removeMutation}
				onConfirm={() => {
					if (removing.subject) removeMutation.mutate(removing.subject);
				}}
				onOpenChange={(open) => {
					if (!open) removing.close();
				}}
				onOpenChangeComplete={removing.onOpenChangeComplete}
				open={removing.open}
				pendingLabel="Removing…"
				title="Remove subtitle"
			/>
		</Dialog>
	);
}

function ExistingSubtitleEditor({
	subtitleId,
	...props
}: Omit<Parameters<typeof SubtitleEditor>[0], "subtitle"> & {
	subtitleId: SubtitleSummary["subtitleId"];
}) {
	const { data, error } = useQuery(subtitleQueries.getSubtitle(subtitleId));

	if (data) return <SubtitleEditor {...props} subtitle={data} />;
	return (
		<>
			<DialogPanel>
				{error ? (
					<Alert variant="error">
						<AlertDescription>{error.message}</AlertDescription>
					</Alert>
				) : (
					<div className="flex flex-col gap-4">
						<Skeleton className="h-9" />
						<Skeleton className="h-60" />
					</div>
				)}
			</DialogPanel>
			<DialogFooter>
				<Button onClick={props.onBack} variant="ghost">
					Cancel
				</Button>
			</DialogFooter>
		</>
	);
}

function SubtitleEditor({
	owner,
	subtitle,
	onBack,
	onSaved,
	onPendingChange,
}: {
	owner: SubtitleOwner;
	subtitle: SubtitleDetails | null;
	onBack: () => void;
	onSaved: () => void;
	onPendingChange: (isPending: boolean) => void;
}) {
	const queryClient = useQueryClient();
	const titleId = useId();
	const contentId = useId();
	const fileInputId = useId();
	const allowed = subtitleFormatsFor(owner.kind);
	const [draft, setDraft] = useState<SubtitleDraft>(
		subtitle
			? toDraft(subtitle)
			: {
					title: "",
					format: allowed.formats[0],
					languageId: null,
					content: "",
				},
	);
	const [fileError, setFileError] = useState<string | null>(null);

	const mutation = useMutation({
		mutationFn: async () => {
			let parsed: ParsedLyrics | null = null;
			if (
				owner.kind === "track" &&
				SYNCED_LYRICS_FORMATS.includes(draft.format)
			) {
				const result = parseLyrics(draft.content, draft.format);
				if ("error" in result) throw new Error(result.error);
				parsed = await withHongKongChinese(result.parsed);
			}
			const request = {
				title: draft.title.trim() || null,
				format: draft.format,
				languageId: draft.languageId,
				content: draft.content,
				parsed,
			};
			return subtitle
				? subtitleActions.update(subtitle.subtitleId, {
						...request,
						version: subtitle.version,
					})
				: subtitleActions.create(owner, request);
		},
		onMutate: () => onPendingChange(true),
		onSettled: () => onPendingChange(false),
		onSuccess: (saved) => {
			queryClient.setQueryData(
				subtitleQueries.getSubtitle(saved.subtitleId).queryKey,
				saved,
			);
			void queryClient.invalidateQueries({
				queryKey: subtitleQueries.getLyrics(saved.subtitleId).queryKey,
			});
			toastManager.add({
				title: subtitle ? "Subtitle saved" : "Subtitle added",
				type: "success",
			});
			onSaved();
		},
	});

	async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;

		setFileError(null);
		try {
			const content = (await file.text()).replace(/^﻿/, "");
			const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
			const detected = SUBTITLE_FORMAT_BY_EXTENSION[extension] as
				| SubtitleFormat
				| undefined;
			if (detected && !allowed.formats.includes(detected)) {
				setFileError(
					`${SUBTITLE_FORMAT[detected]} isn't supported for ${owner.kind === "track" ? "tracks" : "concert files"}. Use ${allowed.options.map((option) => option.label).join(", ")}.`,
				);
				return;
			}
			setDraft((current) => ({
				...current,
				content,
				format: detected ?? current.format,
			}));
		} catch {
			setFileError(`Could not read ${file.name}.`);
		}
	}

	const isPending = mutation.isPending;
	const agents = useMemo(
		() => (draft.format === "Ttml" ? ttmlAgents(draft.content) : []),
		[draft.format, draft.content],
	);

	return (
		<>
			<DialogPanel>
				<div className="flex flex-col gap-4">
					<Field>
						<FieldLabel htmlFor={titleId}>Title</FieldLabel>
						<Input
							disabled={isPending}
							id={titleId}
							maxLength={250}
							onChange={(event) =>
								setDraft({ ...draft, title: event.target.value })
							}
							placeholder="Optional, for example Romaji"
							value={draft.title}
						/>
					</Field>
					<div className="grid gap-4 sm:grid-cols-2">
						<FilterSelect
							label="Format"
							onValueChange={(format) => setDraft({ ...draft, format })}
							options={allowed.options}
							value={draft.format}
						/>
						<LanguageSelect
							disabled={isPending}
							onValueChange={(languageId) => setDraft({ ...draft, languageId })}
							value={draft.languageId}
						/>
					</div>
					{agents.length > 0 && (
						<Fieldset>
							<FieldsetLegend>Singers</FieldsetLegend>
							<div className="mt-2 grid gap-3 sm:grid-cols-2">
								{agents.map((agent) => (
									<SingerNameField
										agent={agent}
										disabled={isPending}
										key={agent.id}
										onNameChange={(name) =>
											setDraft((current) => ({
												...current,
												content: withTtmlAgentName(
													current.content,
													agent.id,
													name,
												),
											}))
										}
									/>
								))}
							</div>
						</Fieldset>
					)}
					<Field>
						<div className="flex w-full items-center justify-between gap-2">
							<FieldLabel htmlFor={contentId}>Content</FieldLabel>
							<input
								accept={allowed.accept}
								className="sr-only"
								id={fileInputId}
								onChange={(event) => void handleFileChange(event)}
								type="file"
							/>
							<Button
								disabled={isPending}
								render={<label htmlFor={fileInputId} />}
								size="xs"
								variant="outline"
							>
								<FileUpIcon aria-hidden="true" />
								Load file
							</Button>
						</div>
						<Textarea
							disabled={isPending}
							id={contentId}
							onChange={(event) =>
								setDraft({ ...draft, content: event.target.value })
							}
							rows={14}
							size="sm"
							spellCheck={false}
							value={draft.content}
						/>
					</Field>
					{fileError && (
						<Alert variant="error">
							<AlertDescription>{fileError}</AlertDescription>
						</Alert>
					)}
					{mutation.error && (
						<Alert variant="error">
							<AlertDescription>{mutation.error.message}</AlertDescription>
						</Alert>
					)}
				</div>
			</DialogPanel>
			<DialogFooter>
				<Button disabled={isPending} onClick={onBack} variant="ghost">
					Cancel
				</Button>
				<Button
					disabled={isPending || !draft.content.trim()}
					onClick={() => mutation.mutate()}
				>
					{isPending ? "Saving…" : subtitle ? "Save subtitle" : "Add subtitle"}
				</Button>
			</DialogFooter>
		</>
	);
}

function SingerNameField({
	agent,
	disabled,
	onNameChange,
}: {
	agent: TtmlAgent;
	disabled: boolean;
	onNameChange: (name: string) => void;
}) {
	const id = useId();
	const [value, setValue] = useState(agent.name);
	const [fileName, setFileName] = useState(agent.name);
	if (fileName !== agent.name) {
		setFileName(agent.name);
		if (agent.name !== value.trim()) setValue(agent.name);
	}

	return (
		<Field>
			<FieldLabel htmlFor={id}>
				{agent.type === "group" ? `${agent.id} (together)` : agent.id}
			</FieldLabel>
			<Input
				disabled={disabled}
				id={id}
				onChange={(event) => {
					setValue(event.target.value);
					onNameChange(event.target.value.trim());
				}}
				placeholder="Name"
				value={value}
			/>
		</Field>
	);
}
