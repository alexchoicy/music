import { createServerFn } from "@tanstack/react-start";

export const getApiEndpoint = createServerFn({ method: "GET" }).handler(() => {
	const endpoint = process.env.API_BASE_URL;

	if (!endpoint) {
		throw new Error("Missing API_BASE_URL");
	}

	return endpoint.replace(/\/+$/, "");
});

export const getWebSocketEndpoint = createServerFn({ method: "GET" }).handler(
	() => {
		const endpoint = process.env.WS_BASE_URL;

		if (!endpoint) {
			throw new Error("Missing WS_BASE_URL");
		}

		return endpoint.replace(/\/+$/, "");
	},
);
