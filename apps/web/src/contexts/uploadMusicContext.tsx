import { createContext, useContext, useReducer } from "react";
import type { UploadMusicState } from "@/models/uploadMusic";

export type Action = {
	type: "ProcessUpload";
	payload: Omit<UploadMusicState, "albumIds">;
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
