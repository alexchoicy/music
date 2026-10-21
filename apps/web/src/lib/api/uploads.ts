import type * as API from "@music/api";

import { $APIFetch } from "../APIFetchClient";

type CompleteUploadRequest = API.CompleteUploadRequest;
type StartUploadResult = API.StartUploadResult;

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
