import type { components } from "#/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

type CreateYouTubeCoverRequest =
	components["schemas"]["CreateYouTubeCoverRequest"];
type CreateYouTubeCoverResult =
	components["schemas"]["CreateYouTubeCoverResult"];

export async function createYouTubeCover(request: CreateYouTubeCoverRequest) {
	const result = await $APIFetch<CreateYouTubeCoverResult>("/youtube/covers", {
		method: "POST",
		body: JSON.stringify(request),
	});

	if (!result.ok) throw result.error;
	return result.data;
}

export async function retryYouTubeImportJob(jobId: string) {
	const result = await $APIFetch<null>(`/youtube/jobs/${jobId}/retry`, {
		method: "POST",
	});

	if (!result.ok) throw result.error;
}
