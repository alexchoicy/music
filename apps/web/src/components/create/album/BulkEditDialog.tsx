import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";

import { Button } from "#/components/base/button";
import { Checkbox } from "#/components/base/checkbox";
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
import { Input } from "#/components/base/input";
import { Label } from "#/components/base/label";
import { FilterSelect } from "#/components/library/FilterSelect";
import { PartyCombobox } from "#/components/party/PartyCombobox";
import { MEDIA_SOURCE_OPTIONS } from "#/enums/albumEnums";
import {
	TRACK_CONTENT_TYPE_OPTIONS,
	TRACK_VERSION_TYPE_OPTIONS,
} from "#/enums/trackEnums";
import type { EnumOption } from "#/enums/utils";
import { languageQueries } from "#/lib/queries/language.queries";
import { useAlbumUploadStore } from "#/store/albumUploadStore";
import type {
	BulkCreditsChange,
	TrackLocalId,
} from "#/store/albumUploadStoreType";

import { toArtistCredits } from "./DraftCredits";

const KEEP = "__keep__";
const NONE = "__none__";
type Keep = typeof KEEP;

function withKeep<Value extends string>(
	options: EnumOption<Value>[],
): EnumOption<Value | Keep>[] {
	return [{ label: "Keep current", value: KEEP }, ...options];
}

function unlessKeep<Value extends string>(value: Value | Keep) {
	return value === KEEP ? undefined : value;
}

const ARTIST_MODE_OPTIONS: EnumOption<BulkCreditsChange["mode"]>[] = [
	{ label: "Keep current", value: "keep" },
	{ label: "Replace with", value: "replace" },
	{ label: "Add", value: "add" },
	{ label: "Same as album artists", value: "album" },
	{ label: "Remove all", value: "clear" },
];

const SOURCE_URL_MODE_OPTIONS: EnumOption<"keep" | "set" | "clear">[] = [
	{ label: "Keep current", value: "keep" },
	{ label: "Set to", value: "set" },
	{ label: "Remove", value: "clear" },
];

const CONTENT_OPTIONS = withKeep(TRACK_CONTENT_TYPE_OPTIONS);
const VERSION_OPTIONS = withKeep(TRACK_VERSION_TYPE_OPTIONS);
const SOURCE_OPTIONS = withKeep(MEDIA_SOURCE_OPTIONS);

export function BulkEditDialog({
	trackIds,
	onClose,
}: {
	trackIds: TrackLocalId[];
	onClose: () => void;
}) {
	const findId = useId();
	const replaceId = useId();
	const sourceUrlId = useId();
	const discNumberId = useId();
	const renumberId = useId();
	const clearUnmatchedId = useId();
	const bulkUpdateTracks = useAlbumUploadStore(
		(state) => state.bulkUpdateTracks,
	);
	const hasUnmatched = useAlbumUploadStore((state) =>
		trackIds.some(
			(trackId) => state.tracksById[trackId]?.unsolvedCredits.length > 0,
		),
	);
	const { data: languages = [] } = useQuery(languageQueries.getLanguages());
	const languageOptions = withKeep([
		{ label: "No language", value: NONE },
		...languages.map((language) => ({
			label: language.language,
			value: String(language.id),
		})),
	]);

	const [artistMode, setArtistMode] =
		useState<BulkCreditsChange["mode"]>("keep");
	const [artistIds, setArtistIds] = useState<number[]>([]);
	const [clearUnmatched, setClearUnmatched] = useState(false);
	const [titleFind, setTitleFind] = useState("");
	const [titleReplace, setTitleReplace] = useState("");
	const [language, setLanguage] = useState<string>(KEEP);
	const [contentType, setContentType] =
		useState<(typeof CONTENT_OPTIONS)[number]["value"]>(KEEP);
	const [versionType, setVersionType] =
		useState<(typeof VERSION_OPTIONS)[number]["value"]>(KEEP);
	const [source, setSource] =
		useState<(typeof SOURCE_OPTIONS)[number]["value"]>(KEEP);
	const [sourceUrlMode, setSourceUrlMode] = useState<"keep" | "set" | "clear">(
		"keep",
	);
	const [sourceUrl, setSourceUrl] = useState("");
	const [discNumber, setDiscNumber] = useState("");
	const [renumber, setRenumber] = useState(false);

	const needsArtists = artistMode === "replace" || artistMode === "add";
	const parsedDiscNumber = Number(discNumber);
	const isDiscNumberValid =
		discNumber.trim() === "" ||
		(Number.isInteger(parsedDiscNumber) && parsedDiscNumber >= 1);
	const isValid =
		isDiscNumberValid &&
		(!needsArtists || artistIds.length > 0) &&
		(sourceUrlMode !== "set" || sourceUrl.trim() !== "");

	function handleApply() {
		bulkUpdateTracks(trackIds, {
			credits:
				artistMode === "replace" || artistMode === "add"
					? { mode: artistMode, credits: toArtistCredits(artistIds) }
					: { mode: artistMode },
			clearUnsolvedCredits:
				clearUnmatched ||
				artistMode === "replace" ||
				artistMode === "album" ||
				artistMode === "clear",
			titleFind,
			titleReplace,
			languageId:
				language === KEEP
					? undefined
					: language === NONE
						? null
						: Number(language),
			contentType: unlessKeep(contentType),
			versionType: unlessKeep(versionType),
			source: unlessKeep(source),
			sourceUrl:
				sourceUrlMode === "keep"
					? undefined
					: sourceUrlMode === "clear"
						? null
						: sourceUrl.trim(),
			discNumber: discNumber.trim() === "" ? undefined : parsedDiscNumber,
			renumber,
		});
		onClose();
	}

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogPopup className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>
						Bulk edit {trackIds.length} track{trackIds.length === 1 ? "" : "s"}
					</DialogTitle>
					<DialogDescription>
						Only the fields you change are applied.
					</DialogDescription>
				</DialogHeader>
				<DialogPanel>
					<div className="flex flex-col gap-5">
						<div className="flex flex-col gap-3">
							<FilterSelect
								label="Artists"
								onValueChange={setArtistMode}
								options={ARTIST_MODE_OPTIONS}
								value={artistMode}
							/>
							{needsArtists && (
								<PartyCombobox
									allowCreate
									ariaLabel="Artists"
									placeholder="Search or create artists..."
									selectedIds={artistIds}
									setSelectedIds={setArtistIds}
								/>
							)}
							{hasUnmatched &&
								(artistMode === "keep" || artistMode === "add") && (
									<div className="flex items-center gap-2">
										<Checkbox
											checked={clearUnmatched}
											id={clearUnmatchedId}
											onCheckedChange={(checked) => setClearUnmatched(checked)}
										/>
										<Label htmlFor={clearUnmatchedId}>
											Dismiss unmatched artist names
										</Label>
									</div>
								)}
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							<Field>
								<FieldLabel htmlFor={findId}>Find in titles</FieldLabel>
								<Input
									autoComplete="off"
									id={findId}
									onChange={(event) => setTitleFind(event.target.value)}
									placeholder="Text to find"
									value={titleFind}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor={replaceId}>Replace with</FieldLabel>
								<Input
									autoComplete="off"
									disabled={!titleFind}
									id={replaceId}
									onChange={(event) => setTitleReplace(event.target.value)}
									placeholder="Leave empty to remove"
									value={titleReplace}
								/>
							</Field>
						</div>

						<div className="grid gap-4 sm:grid-cols-3">
							<FilterSelect
								label="Language"
								onValueChange={setLanguage}
								options={languageOptions}
								value={language}
							/>
							<FilterSelect
								label="Content"
								onValueChange={setContentType}
								options={CONTENT_OPTIONS}
								value={contentType}
							/>
							<FilterSelect
								label="Version"
								onValueChange={setVersionType}
								options={VERSION_OPTIONS}
								value={versionType}
							/>
						</div>

						<div className="grid gap-4 sm:grid-cols-3">
							<FilterSelect
								label="Audio source"
								onValueChange={setSource}
								options={SOURCE_OPTIONS}
								value={source}
							/>
							<FilterSelect
								label="Source URL"
								onValueChange={setSourceUrlMode}
								options={SOURCE_URL_MODE_OPTIONS}
								value={sourceUrlMode}
							/>
							{sourceUrlMode === "set" && (
								<Field>
									<FieldLabel htmlFor={sourceUrlId}>URL</FieldLabel>
									<Input
										autoComplete="off"
										id={sourceUrlId}
										onChange={(event) => setSourceUrl(event.target.value)}
										placeholder="https://"
										type="url"
										value={sourceUrl}
									/>
								</Field>
							)}
						</div>

						<div className="grid items-end gap-4 sm:grid-cols-3">
							<Field>
								<FieldLabel htmlFor={discNumberId}>Move to disc</FieldLabel>
								<Input
									id={discNumberId}
									min={1}
									onChange={(event) => setDiscNumber(event.target.value)}
									placeholder="Keep current"
									step={1}
									type="number"
									value={discNumber}
								/>
							</Field>
							<div className="flex min-h-8 items-center gap-2 sm:col-span-2">
								<Checkbox
									checked={renumber}
									id={renumberId}
									onCheckedChange={(checked) => setRenumber(checked)}
								/>
								<Label htmlFor={renumberId}>
									Renumber their discs 1, 2, 3… in the current order
								</Label>
							</div>
						</div>
					</div>
				</DialogPanel>
				<DialogFooter>
					<DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
					<Button disabled={!isValid} onClick={handleApply}>
						Apply
					</Button>
				</DialogFooter>
			</DialogPopup>
		</Dialog>
	);
}
