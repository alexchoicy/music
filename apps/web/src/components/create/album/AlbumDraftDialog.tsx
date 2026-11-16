import { useId, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { LanguageSelect } from "#/components/album/edit/LanguageSelect";
import { ReleaseDateField } from "#/components/album/edit/ReleaseDateField";
import { Button } from "#/components/base/button";
import {
	Dialog,
	DialogClose,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "#/components/base/dialog";
import { Field, FieldLabel } from "#/components/base/field";
import { Input } from "#/components/base/input";
import { FilterSelect } from "#/components/library/FilterSelect";
import { PartyCombobox } from "#/components/party/PartyCombobox";
import { ALBUM_TYPE_OPTIONS } from "#/enums/albumEnums";
import { useAlbumUploadStore } from "#/store/albumUploadStore";
import type {
	AlbumLocalId,
	CoverAsset,
	DiscLocalId,
} from "#/store/albumUploadStoreType";

import { CoverField } from "./CoverField";
import { toArtistCredits, UnmatchedArtistsAlert } from "./DraftCredits";

// null means the disc follows the album cover
type PendingDiscCovers = Partial<Record<DiscLocalId, CoverAsset | null>>;

export function AlbumDraftDialog({
	albumId,
	onClose,
}: {
	albumId: AlbumLocalId;
	onClose: () => void;
}) {
	const titleId = useId();
	const album = useAlbumUploadStore((state) => state.albumsById[albumId]);
	const discs = useAlbumUploadStore(
		useShallow((state) =>
			album.discIds.map((discId) => state.discsById[discId]),
		),
	);
	const coverAssets = useAlbumUploadStore((state) => state.coverAssetsIdByHash);
	const updateAlbumDraft = useAlbumUploadStore(
		(state) => state.updateAlbumDraft,
	);

	const [title, setTitle] = useState(album.title);
	const [artistIds, setArtistIds] = useState(() =>
		album.credits.map((credit) => Number(credit.partyId)),
	);
	const [type, setType] = useState(album.type);
	const [releaseDate, setReleaseDate] = useState(album.releaseDate ?? null);
	const [languageId, setLanguageId] = useState(
		album.languageId == null ? null : Number(album.languageId),
	);
	const [isUnmatchedDismissed, setIsUnmatchedDismissed] = useState(false);
	const [subtitles, setSubtitles] = useState<Record<DiscLocalId, string>>(() =>
		Object.fromEntries(
			discs.map((disc) => [disc.localId, disc.subtitle ?? ""]),
		),
	);
	const [pendingCover, setPendingCover] = useState<CoverAsset | null>(null);
	const [pendingDiscCovers, setPendingDiscCovers] = useState<PendingDiscCovers>(
		{},
	);

	const currentAlbumCover = album.coverAssetIdByHash
		? coverAssets[album.coverAssetIdByHash]
		: undefined;
	const albumCover = pendingCover ?? currentAlbumCover;

	function getOwnDiscCover(discId: DiscLocalId, coverHash: string | null) {
		const pending = pendingDiscCovers[discId];
		if (pending !== undefined) return pending ?? undefined;
		if (!coverHash || coverHash === album.coverAssetIdByHash) return undefined;
		return coverAssets[coverHash];
	}

	function isStoredCover(cover: CoverAsset) {
		return coverAssets[cover.blake3Hash]?.localURL === cover.localURL;
	}

	function discardPending(cover: CoverAsset | null | undefined) {
		if (cover && !isStoredCover(cover)) URL.revokeObjectURL(cover.localURL);
	}

	function handleCancel() {
		discardPending(pendingCover);
		for (const cover of Object.values(pendingDiscCovers)) discardPending(cover);
		onClose();
	}

	function handleApply() {
		const discCoversById: PendingDiscCovers = {};

		for (const disc of discs) {
			const ownCover = getOwnDiscCover(disc.localId, disc.coverAssetIdByHash);
			const followsAlbum =
				!ownCover || ownCover.blake3Hash === albumCover?.blake3Hash;

			if (followsAlbum) {
				discardPending(pendingDiscCovers[disc.localId]);
				discCoversById[disc.localId] = null;
			} else if (pendingDiscCovers[disc.localId]) {
				discCoversById[disc.localId] = ownCover;
			}
		}

		updateAlbumDraft(albumId, {
			title: title.trim(),
			type,
			languageId,
			releaseDate,
			clearUnsolvedAlbumCredits: isUnmatchedDismissed,
			cover: pendingCover,
			credits: toArtistCredits(artistIds),
			discCoversById,
			discSubtitlesById: subtitles,
		});
		onClose();
	}

	return (
		<Dialog
			disablePointerDismissal
			open
			onOpenChange={(open) => {
				if (!open) handleCancel();
			}}
		>
			<DialogPopup className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Edit album</DialogTitle>
				</DialogHeader>
				<DialogPanel>
					<div className="flex flex-col gap-5">
						<CoverField
							cover={albumCover}
							label="Album cover"
							onChange={(cover) => {
								discardPending(pendingCover);
								setPendingCover(cover);
							}}
						/>

						<Field>
							<FieldLabel htmlFor={titleId}>Title</FieldLabel>
							<Input
								autoComplete="off"
								id={titleId}
								onChange={(event) => setTitle(event.target.value)}
								required
								value={title}
							/>
						</Field>

						<Field>
							<FieldLabel nativeLabel={false} render={<div />}>
								Artists
							</FieldLabel>
							<UnmatchedArtistsAlert
								isDismissed={isUnmatchedDismissed}
								names={album.unsolvedCredits}
								onDismissedChange={setIsUnmatchedDismissed}
							/>
							<PartyCombobox
								allowCreate
								ariaLabel="Album artists"
								placeholder="Search or create artists..."
								selectedIds={artistIds}
								setSelectedIds={setArtistIds}
							/>
						</Field>

						<div className="grid gap-4 sm:grid-cols-2">
							<FilterSelect
								label="Type"
								onValueChange={setType}
								options={ALBUM_TYPE_OPTIONS}
								value={type}
							/>
							<ReleaseDateField
								label="Release date"
								name="releaseDate"
								onChange={setReleaseDate}
								value={releaseDate}
							/>
						</div>

						<LanguageSelect onValueChange={setLanguageId} value={languageId} />

						<section className="flex flex-col gap-4">
							<h3 className="text-sm font-semibold">Discs</h3>
							{discs.map((disc) => {
								const ownCover = getOwnDiscCover(
									disc.localId,
									disc.coverAssetIdByHash,
								);

								return (
									<div className="flex flex-col gap-3" key={disc.localId}>
										<Field>
											<FieldLabel>Disc {disc.discNumber} subtitle</FieldLabel>
											<Input
												autoComplete="off"
												onChange={(event) =>
													setSubtitles((current) => ({
														...current,
														[disc.localId]: event.target.value,
													}))
												}
												placeholder="Optional"
												value={subtitles[disc.localId] ?? ""}
											/>
										</Field>
										{discs.length > 1 && (
											<CoverField
												actions={
													ownCover && (
														<Button
															onClick={() => {
																discardPending(pendingDiscCovers[disc.localId]);
																setPendingDiscCovers((current) => ({
																	...current,
																	[disc.localId]: null,
																}));
															}}
															size="sm"
															variant="ghost"
														>
															Use album cover
														</Button>
													)
												}
												cover={ownCover ?? albumCover}
												label={`Disc ${disc.discNumber} cover`}
												note={ownCover ? undefined : "Same as the album cover"}
												onChange={(cover) => {
													discardPending(pendingDiscCovers[disc.localId]);
													setPendingDiscCovers((current) => ({
														...current,
														[disc.localId]: cover,
													}));
												}}
											/>
										)}
									</div>
								);
							})}
						</section>
					</div>
				</DialogPanel>
				<DialogFooter>
					<DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
					<Button disabled={!title.trim()} onClick={handleApply}>
						Apply
					</Button>
				</DialogFooter>
			</DialogPopup>
		</Dialog>
	);
}
