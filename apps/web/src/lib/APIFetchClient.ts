import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

const API_Endpoint = import.meta.env.VITE_API_ENDPOINT;

export type APIFetchResult<T> =
	| { ok: true; status: number; data: T }
	| { ok: false; status: number; data: null; error?: unknown };

const getServerHeaders = createServerFn().handler(async () => {
	return getRequestHeader("cookie");
});

const isBrowser = !import.meta.env.SSR;

export async function $APIFetch<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<APIFetchResult<T>> {
	const url = `${API_Endpoint}${endpoint}`;
	const cookieString = isBrowser ? undefined : await getServerHeaders();
	const response = await fetch(url, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...(cookieString ? { Cookie: cookieString } : {}),
			...(options?.headers || {}),
		},
		credentials: "include",
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
