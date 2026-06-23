import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

import { getApiEndpoint } from "@/lib/ServerFunction/getApiEndpoint";

export type APIFetchResult<T> =
	| { ok: true; status: number; data: T }
	| { ok: false; status: number; data: null; error?: unknown };

const getServerHeaders = createServerFn().handler(async () => {
	return getRequestHeader("cookie");
});

const isBrowser = !import.meta.env.SSR;

let apiEndpointPromise: Promise<string> | null = null;

function getResolvedApiEndpoint() {
	if (!apiEndpointPromise) {
		apiEndpointPromise = getApiEndpoint().catch((error) => {
			apiEndpointPromise = null;
			throw error;
		});
	}

	return apiEndpointPromise;
}

function joinUrl(baseUrl: string, endpoint: string) {
	return `${baseUrl.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`;
}

export async function $APIFetch<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<APIFetchResult<T>> {
	const apiEndpoint = await getResolvedApiEndpoint();
	const url = joinUrl(apiEndpoint, endpoint);
	const cookieString = isBrowser ? undefined : await getServerHeaders();
	const headers = new Headers(options.headers);

	if (cookieString) {
		headers.set("Cookie", cookieString);
	}

	if (typeof options.body === "string" && !headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}

	const response = await fetch(url, {
		...options,
		headers,
		credentials: options.credentials ?? "include",
	});

	if (response.status === 401) {
		return {
			ok: false,
			status: response.status,
			data: null,
			error: "Unauthorized",
		};
	}

	let error: unknown;

	try {
		const raw = await response.text();
		const hasBody = raw.trim().length > 0;
		const parsed = (hasBody ? (JSON.parse(raw) as T) : null) as T;

		if (response.ok) {
			return { ok: true, status: response.status, data: parsed };
		}

		error = hasBody ? parsed : undefined;
	} catch (err) {
		error = err;
	}

	if (!error) {
		error = response.statusText;
	}

	return { ok: false, status: response.status, data: null, error };
}
