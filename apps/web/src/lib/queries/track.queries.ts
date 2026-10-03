import type { components } from "#/data/APIschema";
import { $APIFetch } from "#/lib/APIFetchClient";

export type RadioTrack = components["schemas"]["RadioTrack"];

export const trackActions = {
	radio: async (request: components["schemas"]["RadioTrackRequest"]) => {
		const result = await $APIFetch<RadioTrack | null>("/tracks/radio", {
			method: "POST",
			body: JSON.stringify(request),
		});
		if (!result.ok) throw result.error;
		return result.data;
	},
};
