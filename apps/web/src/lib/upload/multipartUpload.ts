import pMap from "p-map";

import type { components } from "#/data/APIschema";

type MultipartUploadInfo = components["schemas"]["MultipartUploadResults"];
type CompletedPart = components["schemas"]["CompleteMultipartUploadPart"];

type UploadMultipartFileOptions = {
	signal?: AbortSignal;
	onPartUploaded?: () => void;
};

const retryableStatuses = new Set([408, 429, 500, 502, 503, 504]);

function sleep(ms: number, signal?: AbortSignal) {
	return new Promise<void>((resolve, reject) => {
		if (signal?.aborted) {
			reject(signal.reason);
			return;
		}

		const timeout = window.setTimeout(resolve, ms);
		const abort = () => {
			window.clearTimeout(timeout);
			reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
		};

		signal?.addEventListener("abort", abort, { once: true });
	});
}

function getRetryDelayMs(attempt: number) {
	const baseDelayMs = 500;
	const maxDelayMs = 5000;
	const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
	const jitter = exponentialDelay * (Math.random() * 0.5 - 0.25);
	return exponentialDelay + jitter;
}

function isAbortError(error: unknown) {
	return error instanceof DOMException && error.name === "AbortError";
}

async function uploadPartWithRetry(
	url: string,
	body: Blob,
	signal?: AbortSignal,
) {
	const maxAttempts = 4;

	for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
		try {
			const response = await fetch(url, {
				method: "PUT",
				body,
				signal,
			});

			if (!response.ok) {
				if (
					retryableStatuses.has(response.status) &&
					attempt < maxAttempts - 1
				) {
					await sleep(getRetryDelayMs(attempt), signal);
					continue;
				}

				throw new Error(`Part upload failed with status ${response.status}`);
			}

			const eTag = response.headers.get("ETag");
			if (!eTag) throw new Error("Part upload succeeded without ETag");

			return eTag;
		} catch (error) {
			if (
				isAbortError(error) ||
				signal?.aborted ||
				attempt === maxAttempts - 1
			) {
				throw error;
			}

			await sleep(getRetryDelayMs(attempt), signal);
		}
	}

	throw new Error("Part upload failed");
}

export async function uploadMultipartFile(
	file: File,
	multipartUploadInfo: MultipartUploadInfo,
	options: UploadMultipartFileOptions = {},
): Promise<CompletedPart[]> {
	const partSize = Number(multipartUploadInfo.partSizeInBytes);
	const concurrency = 5;

	const completedParts = await pMap(
		multipartUploadInfo.parts,
		async (part): Promise<CompletedPart> => {
			const partNumber = Number(part.partNumber);
			const start = (partNumber - 1) * partSize;
			const end = Math.min(start + partSize, file.size);
			const body = file.slice(start, end, file.type);
			const eTag = await uploadPartWithRetry(part.url, body, options.signal);

			options.onPartUploaded?.();
			return { partNumber, eTag };
		},
		{ concurrency },
	);

	return completedParts.sort(
		(a, b) => Number(a.partNumber) - Number(b.partNumber),
	);
}
