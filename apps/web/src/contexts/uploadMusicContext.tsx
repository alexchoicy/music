import { createContext, useContext, useReducer } from "react";
import type {
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
				editDiscs: Array<Partial<UploadMusicState["discs"][LocalID]>>;
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
			};
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
			const { trackId, editTrack, variantTrack } = action.payload;

			const newTracks = {
				...state.tracks,
				[trackId]: {
					...state.tracks[trackId],
					...editTrack,
				},
			};

			const newTrackVariants = { ...state.trackVariants };

			variantTrack.forEach((variant) => {
				newTrackVariants[variant.id] = {
					...state.trackVariants[variant.id],
					...variant,
				};
			});

			return {
				...state,
				tracks: newTracks,
				trackVariants: newTrackVariants,
			};
		}
		case "ProcessUpload":
			return action.payload;
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
