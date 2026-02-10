import { createContext, useContext, useReducer } from "react";
import type { LocalID, UploadMusicState } from "@/models/uploadMusic";

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
