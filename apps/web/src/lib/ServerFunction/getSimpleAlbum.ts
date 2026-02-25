import { createServerFn } from "@tanstack/react-start";
import type { components } from "@/data/APIschema";

export const getSimpleAlbum = createServerFn({ method: "GET" })
	.inputValidator((data: { id: string }) => data)
	.handler(async ({ data }) => {
		const token = process.env.API_BOT_TOKEN;

		if (token === undefined) {
			return null;
		}

		const res = await fetch(
			`${process.env.API_BASE_URL}/albums/${data.id}/simple`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);

		if (!res.ok) {
			throw new Error("Failed to fetch album");
		}

		const album =
			(await res.json()) as components["schemas"]["AlbumSimpleModel"];

		return album;
	});
