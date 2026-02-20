import { createContext, useContext, useReducer } from "react";
import type { components } from "@/data/APIschema";
import type {
	Disc,
	LocalID,
	TrackVariant,
	UploadMusicState,
} from "@/models/uploadMusic";

export type Action =
	| {
			type: "ProcessUpload";
			payload: UploadMusicState;
	  }
	| {
			type: "UpdateAlbum";
			payload: {
				albumId: LocalID;
				newMatchingKey: string;
				editAlbum: Partial<UploadMusicState["albums"][LocalID]>;
				editDiscs: Array<UploadMusicState["discs"][LocalID]>;
			};
	  }
	| {
			type: "TrackToVariant";
			payload: {
				originalTrackId: LocalID;
				targetTrackId: LocalID;
			};
	  }
	| {
			type: "RemoveVariant";
			payload: {
				variantId: string;
				trackId: LocalID;
			};
	  }
	| {
			type: "UpdateTrack";
			payload: {
				trackId: LocalID;
				editTrack: Partial<UploadMusicState["tracks"][LocalID]>;
				variantTrack: TrackVariant[];
				discNumber: number;
			};
	  }
	| {
			type: "ReplaceAllTrackParty";
			payload: {
				albumId: LocalID;
				party: components["schemas"]["TrackCreditRequest"][];
				clear: boolean;
			};
	  }
	| {
			type: "Reset";
	  };

const initialState: UploadMusicState = {
	albumIds: [],
	albums: {},
	discs: {},
	tracks: {},
	trackVariants: {},
	albumCovers: {},
};

function reducer(state: UploadMusicState, action: Action): UploadMusicState {
	switch (action.type) {
		case "UpdateAlbum": {
			const { albumId, newMatchingKey, editAlbum, editDiscs } = action.payload;

			const matchingKeyAlbum = Object.values(state.albums).find(
				(album) =>
					album.id !== albumId && album.albumMatchId === newMatchingKey,
			);

			if (matchingKeyAlbum) {
				const sourceAlbum = state.albums[albumId];
				if (!sourceAlbum) return state;

				const newState: UploadMusicState = {
					albumIds: state.albumIds.filter((id) => id !== albumId),
					albums: { ...state.albums },
					discs: { ...state.discs },
					tracks: { ...state.tracks },
					trackVariants: { ...state.trackVariants },
					albumCovers: { ...state.albumCovers },
				};

				delete newState.albums[albumId];
				delete newState.albumCovers[albumId];

				const targetDiscByNumber = new Map<number, Disc>();
				for (const targetDiscId of matchingKeyAlbum.OrderedAlbumDiscsIds) {
					const targetDisc = state.discs[targetDiscId];
					if (!targetDisc) continue;
					targetDiscByNumber.set(targetDisc.discNumber, {
						...targetDisc,
						albumId: matchingKeyAlbum.id,
						OrderedTrackIds: [...targetDisc.OrderedTrackIds],
					});
				}

				const sourceDiscs = sourceAlbum.OrderedAlbumDiscsIds.map(
					(id) => state.discs[id],
				).filter(Boolean);

				for (const sourceDisc of sourceDiscs) {
					const targetDisc = targetDiscByNumber.get(sourceDisc.discNumber);

					if (targetDisc) {
						const newTrackIds = new Set(targetDisc.OrderedTrackIds);

						for (const trackId of sourceDisc.OrderedTrackIds) {
							const track = state.tracks[trackId];
							if (!track) continue;
							newTrackIds.add(trackId);
							newState.tracks[trackId] = {
								...track,
								discId: targetDisc.id,
							};
						}

						targetDisc.OrderedTrackIds = Array.from(newTrackIds);
						continue;
					}

					const movedDisc: Disc = {
						...sourceDisc,
						albumId: matchingKeyAlbum.id,
						OrderedTrackIds: [...sourceDisc.OrderedTrackIds],
					};

					for (const trackId of movedDisc.OrderedTrackIds) {
						const track = state.tracks[trackId];
						if (!track) continue;
						newState.tracks[trackId] = {
							...track,
							discId: movedDisc.id,
						};
					}

					targetDiscByNumber.set(movedDisc.discNumber, movedDisc);
				}

				for (const sourceDiscId of sourceAlbum.OrderedAlbumDiscsIds) {
					delete newState.discs[sourceDiscId];
				}

				const nextTargetDiscs = Array.from(targetDiscByNumber.values()).map(
					(disc) => ({
						...disc,
						OrderedTrackIds: Array.from(new Set(disc.OrderedTrackIds))
							.filter((trackId) => Boolean(newState.tracks[trackId]))
							.sort((a, b) => {
								const trackA = newState.tracks[a];
								const trackB = newState.tracks[b];
								if (!trackA || !trackB) return 0;
								return trackA.trackNumber - trackB.trackNumber;
							}),
					}),
				);

				for (const disc of nextTargetDiscs) {
					newState.discs[disc.id] = disc;
				}

				const nextTargetDiscIds = nextTargetDiscs
					.map((disc) => disc.id)
					.sort((a, b) => {
						const discA = newState.discs[a];
						const discB = newState.discs[b];
						if (!discA || !discB) return 0;
						return discA.discNumber - discB.discNumber;
					});

				newState.albums[matchingKeyAlbum.id] = {
					...state.albums[matchingKeyAlbum.id],
					...editAlbum,
					albumMatchId: newMatchingKey,
					OrderedAlbumDiscsIds: nextTargetDiscIds,
				};

				return newState;
			}

			const newAlbums = {
				...state.albums,
				[albumId]: {
					...state.albums[albumId],
					...editAlbum,
					albumMatchId: newMatchingKey,
				},
			};

			const newDiscs = { ...state.discs };

			for (const disc of editDiscs || []) {
				if (!disc || !disc.id) continue;
				newDiscs[disc.id] = {
					...state.discs[disc.id],
					...disc,
				};
			}

			return {
				...state,
				albums: newAlbums,
				discs: newDiscs,
			};
		}
		case "TrackToVariant": {
			const { originalTrackId, targetTrackId } = action.payload;

			const originalTrack = state.tracks[originalTrackId];
			const targetTrack = state.tracks[targetTrackId];

			const originalTrackVariantIDs =
				state.tracks[originalTrackId].trackVariantsIds;

			const targetVariantIDs = state.tracks[targetTrackId].trackVariantsIds;

			const mergedVariantIDs = Array.from(
				new Set([...targetVariantIDs, ...originalTrackVariantIDs]),
			);

			const updatedTrackVariants = { ...state.trackVariants };
			for (const variantId of originalTrackVariantIDs) {
				const variant = state.trackVariants[variantId];
				if (!variant) continue;
				updatedTrackVariants[variantId] = {
					...variant,
					trackId: targetTrackId,
				};
			}

			const newTracks = {
				...state.tracks,
				[targetTrackId]: {
					...targetTrack,
					trackVariantsIds: mergedVariantIDs,
				},
			};
			delete newTracks[originalTrackId];

			const newDiscs = { ...state.discs };
			if (originalTrack.discId) {
				const disc = newDiscs[originalTrack.discId];
				if (disc && Array.isArray(disc.OrderedTrackIds)) {
					newDiscs[originalTrack.discId] = {
						...disc,
						OrderedTrackIds: disc.OrderedTrackIds.filter(
							(id) => id !== originalTrackId,
						),
					};
				}
			}

			return {
				...state,
				tracks: newTracks,
				trackVariants: updatedTrackVariants,
				discs: newDiscs,
			};
		}
		case "RemoveVariant": {
			const { variantId, trackId } = action.payload;

			const track = state.tracks[trackId];
			if (!track) {
				return state;
			}

			track.trackVariantsIds = track.trackVariantsIds.filter(
				(id) => id !== variantId,
			);

			const newTrackVariants = { ...state.trackVariants };
			delete newTrackVariants[variantId];

			return {
				...state,
				tracks: {
					...state.tracks,
					[trackId]: track,
				},
				trackVariants: newTrackVariants,
			};
		}
		case "UpdateTrack": {
			const { trackId, editTrack, variantTrack, discNumber } = action.payload;
			const track = state.tracks[trackId];
			if (!track) return state;

			const sourceDisc = state.discs[track.discId];
			if (!sourceDisc) return state;

			const newTrackVariants = { ...state.trackVariants };
			variantTrack.forEach((variant) => {
				newTrackVariants[variant.id] = {
					...state.trackVariants[variant.id],
					...variant,
				};
			});

			const newTracks = {
				...state.tracks,
				[trackId]: {
					...state.tracks[trackId],
					...editTrack,
				},
			};

			const sortTrackIds = (ids: LocalID[]) =>
				[...ids].sort((a, b) => {
					const trackA = newTracks[a];
					const trackB = newTracks[b];
					if (!trackA || !trackB) return 0;
					return trackA.trackNumber - trackB.trackNumber;
				});

			const newDiscs = { ...state.discs };
			const newAlbums = { ...state.albums };
			const album = state.albums[sourceDisc.albumId];

			if (sourceDisc.discNumber !== discNumber) {
				const albumDiscIds = album.OrderedAlbumDiscsIds;
				let targetDiscId = albumDiscIds.find((id) => {
					if (id === sourceDisc.id) return false;
					const d = state.discs[id];
					return d?.discNumber === discNumber;
				});

				const sourceTrackIds = sourceDisc.OrderedTrackIds.filter(
					(id) => id !== trackId,
				);

				if (sourceTrackIds.length === 0) {
					delete newDiscs[sourceDisc.id];
				} else {
					newDiscs[sourceDisc.id] = {
						...sourceDisc,
						OrderedTrackIds: sortTrackIds(sourceTrackIds),
					};
				}

				if (targetDiscId) {
					const targetDisc = state.discs[targetDiscId];
					const mergedTrackIds = Array.from(
						new Set([...targetDisc.OrderedTrackIds, trackId]),
					);

					newDiscs[targetDiscId] = {
						...targetDisc,
						OrderedTrackIds: sortTrackIds(mergedTrackIds),
					};
				} else {
					targetDiscId = crypto.randomUUID();
					newDiscs[targetDiscId] = {
						id: targetDiscId,
						discNumber,
						OrderedTrackIds: [trackId],
						albumId: sourceDisc.albumId,
					};
				}

				newTracks[trackId] = {
					...newTracks[trackId],
					discId: targetDiscId,
				};

				const nextAlbumDiscIds = albumDiscIds.filter(
					(id) => !(id === sourceDisc.id && sourceTrackIds.length === 0),
				);

				if (!nextAlbumDiscIds.includes(targetDiscId)) {
					nextAlbumDiscIds.push(targetDiscId);
				}

				newAlbums[sourceDisc.albumId] = {
					...album,
					OrderedAlbumDiscsIds: Array.from(new Set(nextAlbumDiscIds)).sort(
						(a, b) => {
							const discA = newDiscs[a];
							const discB = newDiscs[b];
							if (!discA || !discB) return 0;
							return discA.discNumber - discB.discNumber;
						},
					),
				};
			} else {
				newDiscs[sourceDisc.id] = {
					...sourceDisc,
					OrderedTrackIds: sortTrackIds(sourceDisc.OrderedTrackIds),
				};
			}

			return {
				...state,
				tracks: newTracks,
				trackVariants: newTrackVariants,
				discs: newDiscs,
				albums: newAlbums,
			};
		}
		case "ReplaceAllTrackParty": {
			const { albumId, party, clear } = action.payload;

			const album = state.albums[albumId];
			if (!album) return state;

			const newTracks = { ...state.tracks };

			for (const discId of album.OrderedAlbumDiscsIds) {
				const disc = state.discs[discId];
				if (!disc) continue;

				for (const trackId of disc.OrderedTrackIds) {
					const track = state.tracks[trackId];
					if (!track) continue;

					newTracks[trackId] = {
						...track,
						trackCredits: party,
						unsolvedTrackCredits: clear ? [] : track.unsolvedTrackCredits,
					};
				}
			}

			return {
				...state,
				tracks: newTracks,
			};
		}
		case "ProcessUpload":
			return action.payload;
		case "Reset":
			return initialState;
		default:
			return state;
	}
}

const MusicUploadStateContext = createContext<UploadMusicState | undefined>(
	undefined,
);

const MusicUploadDispatchContext = createContext<
	React.Dispatch<Action> | undefined
>(undefined);

export function MusicUploadProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [state, dispatch] = useReducer(reducer, initialState);

	return (
		<MusicUploadStateContext.Provider value={state}>
			<MusicUploadDispatchContext.Provider value={dispatch}>
				{children}
			</MusicUploadDispatchContext.Provider>
		</MusicUploadStateContext.Provider>
	);
}

export function useMusicUploadState() {
	const context = useContext(MusicUploadStateContext);
	if (context === undefined) {
		throw new Error(
			"useMusicUploadState must be used within a MusicUploadProvider",
		);
	}
	return context;
}

export function useMusicUploadDispatch() {
	const context = useContext(MusicUploadDispatchContext);
	if (context === undefined) {
		throw new Error(
			"useMusicUploadDispatch must be used within a MusicUploadProvider",
		);
	}
	return context;
}
