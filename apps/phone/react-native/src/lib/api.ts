import { useSessionStore } from "@/store/sessionStore";

type QueryValue = string | number | boolean | null | undefined;

type RequestOptions = {
	method?: "GET" | "POST" | "PUT" | "DELETE";
	/** Arrays repeat the key, e.g. `Types=Album&Types=Single`. */
	query?: Record<string, QueryValue | readonly QueryValue[]>;
	body?: unknown;
	signal?: AbortSignal;
};

/** A response outside 2xx; `status` tells e.g. a stale playlist version (409) apart. */
export class ApiError extends Error {
	constructor(readonly status: number) {
		super(`Server responded with ${status}`);
	}
}

const serverCheckTimeoutMs = 10_000;

function toQueryString(query: RequestOptions["query"] = {}) {
	const params = Object.entries(query).flatMap(([key, value]) =>
		(Array.isArray(value) ? value : [value])
			.filter((item) => item !== undefined && item !== null && item !== "")
			.map((item) => `${key}=${encodeURIComponent(String(item))}`),
	);
	return params.length > 0 ? `?${params.join("&")}` : "";
}

/** Calls the signed-in server; a rejected token signs the user out. */
export async function api<T>(
	path: string,
	{ method = "GET", query, body, signal }: RequestOptions = {},
): Promise<T> {
	const { serverUrl, token, setToken } = useSessionStore.getState();
	if (!serverUrl) throw new Error("No server configured");

	const headers = new Headers({ Accept: "application/json" });
	if (token) headers.set("Authorization", `Bearer ${token}`);
	if (body !== undefined) headers.set("Content-Type", "application/json");

	const response = await fetch(`${serverUrl}${path}${toQueryString(query)}`, {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body),
		credentials: "omit",
		signal,
	});

	if (response.status === 401 && token) await setToken(null);
	if (!response.ok) throw new ApiError(response.status);

	const text = await response.text();
	return (text.trim() ? JSON.parse(text) : null) as T;
}

/**
 * The base URL for input such as `music.example.com/api`, or null when invalid.
 * Development builds also accept http, e.g. a local server on the emulator.
 */
export function normalizeServerUrl(input: string) {
	const value = input.trim().replace(/\/+$/, "");
	const url = /^[a-z][a-z\d+.-]*:\/\//i.test(value)
		? value
		: `https://${value}`;
	const scheme = __DEV__ ? "https?" : "https";
	return new RegExp(`^${scheme}://[^\\s/?#@]+(/[^\\s?#]*)?$`, "i").test(url)
		? url
		: null;
}

/** Whether a Music server answers at the URL, before it is saved. */
export async function checkServer(serverUrl: string) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), serverCheckTimeoutMs);
	try {
		const response = await fetch(`${serverUrl}/auth`, {
			credentials: "omit",
			signal: controller.signal,
		});
		return response.status === 200 || response.status === 401;
	} catch {
		return false;
	} finally {
		clearTimeout(timeout);
	}
}
