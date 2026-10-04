import { useSessionStore } from "@/store/sessionStore";

export type ApiResult<T> =
	| { ok: true; status: number; data: T }
	| { ok: false; status: number; data: null };

const serverCheckTimeoutMs = 10_000;

function joinUrl(baseUrl: string, endpoint: string) {
	return `${baseUrl}/${endpoint.replace(/^\/+/, "")}`;
}

/** Returns the https base URL for user input such as `music.example.com/api`, or null when invalid. */
export function normalizeServerUrl(input: string) {
	const value = input.trim().replace(/\/+$/, "");
	const url = /^[a-z][a-z\d+.-]*:\/\//i.test(value)
		? value
		: `https://${value}`;

	return /^https:\/\/[^\s/?#@]+(\/[^\s?#]*)?$/i.test(url) ? url : null;
}

/** Checks that the server responds to the auth endpoint before it is saved. */
export async function checkServer(serverUrl: string) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), serverCheckTimeoutMs);

	try {
		const response = await fetch(joinUrl(serverUrl, "/auth"), {
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

export async function apiFetch<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<ApiResult<T>> {
	const { serverUrl, token, setToken } = useSessionStore.getState();
	if (!serverUrl) throw new Error("No server configured");

	const headers = new Headers(options.headers);
	if (token) headers.set("Authorization", `Bearer ${token}`);
	if (typeof options.body === "string" && !headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}

	const response = await fetch(joinUrl(serverUrl, endpoint), {
		...options,
		headers,
		credentials: "omit",
	});

	if (response.status === 401 && token) {
		await setToken(null);
	}

	if (!response.ok) {
		return { ok: false, status: response.status, data: null };
	}

	const raw = await response.text();
	return {
		ok: true,
		status: response.status,
		data: (raw.trim() ? JSON.parse(raw) : null) as T,
	};
}
