import type { components } from "#/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

type CompleteUploadRequest = components["schemas"]["CompleteUploadRequest"];
type StartUploadResult = components["schemas"]["StartUploadResult"];

export async function startUpload(fileObjectId: string) {
	const result = await $APIFetch<StartUploadResult>(
		`/uploads/${fileObjectId}/start`,
		{ method: "POST" },
	);

	if (!result.ok) {
		throw result.error;
	}

	return result.data;
}

export async function completeUpload(request: CompleteUploadRequest) {
	const result = await $APIFetch<void>("/uploads/complete", {
		method: "POST",
		body: JSON.stringify(request),
	});

	if (!result.ok) {
		throw result.error;
	}
}
