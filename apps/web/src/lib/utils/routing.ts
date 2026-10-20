import { notFound } from "@tanstack/react-router";

import { ApiError } from "#/lib/APIFetchClient";

export function rethrowNotFound(error: unknown): never {
	if (error instanceof ApiError && error.status === 404) throw notFound();
	throw error;
}
