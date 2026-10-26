import type * as API from "@music/api";

import { $APIFetch } from "#/lib/APIFetchClient";

export type RadioTrack = API.RadioTrack;

export const trackActions = {
	radio: async (request: API.RadioTrackRequest) => {
		const result = await $APIFetch<RadioTrack[]>("/tracks/radio", {
			method: "POST",
			body: JSON.stringify(request),
		});
		if (!result.ok) throw result.error;
		return result.data;
	},
};
