import type * as API from "@music/api";

import { $APIFetch } from "../APIFetchClient";

type CreateConcertRequest = API.CreateConcertRequest;
type CreateConcertUploadResult = API.CreateConcertUploadResult;

export async function createConcert(request: CreateConcertRequest) {
	const result = await $APIFetch<CreateConcertUploadResult>(
		"/concerts/create",
		{
			method: "POST",
			body: JSON.stringify(request),
		},
	);

	if (result.ok) return result.data;

	throw result.error;
}
