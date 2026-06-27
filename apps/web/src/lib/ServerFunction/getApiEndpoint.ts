import { createServerFn } from "@tanstack/react-start";

export const getApiEndpoint = createServerFn({ method: "GET" }).handler(() => {
	const endpoint = process.env.API_BASE_URL;

	if (!endpoint) {
		throw new Error("Missing API_BASE_URL");
	}

	return endpoint.replace(/\/+$/, "");
});

// This tanstack start thingy is not yet for External API.
// Maybe there is a better way i don't find it yet.
// OK so i don't want more weird proxy things, so scary.
// Since the VITE_ is build time and bundled, So The client will not have the API_BASE_URL
// If I need runtime env var, you can't use VITE_
// So Whether have a proxy.
// Just send the API endpoint to the client like this is better.
