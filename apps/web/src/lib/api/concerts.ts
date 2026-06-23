import type { components } from "#/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

type CreateConcertRequest = components["schemas"]["CreateConcertRequest"];
type CreateConcertUploadResult =
	components["schemas"]["CreateConcertUploadResult"];

export async function createConcert(request: CreateConcertRequest) {
	const result = await $APIFetch<CreateConcertUploadResult>(
		"/concerts/create",
		{
			method: "POST",
			body: JSON.stringify(request),
		},
	);

	if (result.ok) return result.data;

	throw new Error(
		typeof result.error === "string"
			? result.error
			: "Failed to create concert",
	);
}
