import type { components } from "#/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

type CompleteUploadRequest = components["schemas"]["CompleteUploadRequest"];

export async function completeUpload(request: CompleteUploadRequest) {
	const result = await $APIFetch<void>("/uploads/complete", {
		method: "POST",
		body: JSON.stringify(request),
	});

	if (!result.ok) {
		throw new Error(
			typeof result.error === "string"
				? result.error
				: "Failed to complete upload",
		);
	}
}
