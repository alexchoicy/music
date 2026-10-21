import type * as API from "@music/api";
import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";

export const getSimpleAlbum = createServerFn({ method: "GET" })
	.validator((data: { id: string }) => data)
	.handler(async ({ data }) => {
		const token = process.env.API_BOT_TOKEN;

		if (token === undefined) {
			return null;
		}

		const res = await fetch(
			`${process.env.API_BASE_URL}/albums/${data.id}/summary`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);

		if (res.status === 404) return null;

		if (!res.ok) {
			throw new Error("Failed to fetch album");
		}

		const album = (await res.json()) as API.AlbumSummary;

		const albumUrl = new URL(
			`/albums/${encodeURIComponent(data.id)}`,
			getRequestUrl().origin,
		).href;

		return { album, albumUrl };
	});
