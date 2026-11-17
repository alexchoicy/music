import type * as API from "@music/api";
import { createServerOnlyFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";

// Sends the bot token, so it must never be reachable as an RPC endpoint.
export const getSimpleAlbum = createServerOnlyFn(async (id: string) => {
	const token = process.env.API_BOT_TOKEN;

	if (token === undefined || !/^\d+$/.test(id)) {
		return null;
	}

	const res = await fetch(`${process.env.API_BASE_URL}/albums/${id}/summary`, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	if (res.status === 404) return null;

	if (!res.ok) {
		throw new Error("Failed to fetch album");
	}

	const album = (await res.json()) as API.AlbumSummary;

	const albumUrl = new URL(`/albums/${id}`, getRequestUrl().origin).href;

	return { album, albumUrl };
});
