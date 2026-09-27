import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { createAlbumPreview } from "#/lib/discord/albumPreview";
import { checkBotHeader } from "#/lib/ServerFunction/checkBotHeader";
import { getSimpleAlbum } from "#/lib/ServerFunction/getSimpleAlbum";

export const Route = createFileRoute("/bot/albums/$id")({
	validateSearch: z.object({
		track: z.coerce.number().optional(),
	}),
	beforeLoad: async ({ params, search }) => {
		const { track } = search;
		const albumRedirect = {
			params: { id: params.id },
			replace: true,
			search: track !== undefined ? { track } : undefined,
			to: "/albums/$id",
		} as const;

		if (!import.meta.env.SSR) {
			throw redirect(albumRedirect);
		}

		const isBot = await checkBotHeader();

		if (!isBot) {
			throw redirect(albumRedirect);
		}
	},
	component: () => null,
	loaderDeps: ({ search }) => ({ track: search.track }),
	loader: async ({ params, deps }) => {
		const { track } = deps;
		const { id } = params;

		const result = await getSimpleAlbum({ data: { id } });

		if (!result) {
			throw notFound();
		}

		return createAlbumPreview(result.album, result.albumUrl, track);
	},
	head: ({ loaderData }) => {
		if (!loaderData) return {};

		const { title, description, image, url, embed } = loaderData;
		return {
			meta: [
				{ title },
				{ name: "description", content: description },
				{ property: "og:site_name", content: "Music" },
				{ property: "og:title", content: title },
				{ property: "og:description", content: description },
				{ property: "og:url", content: url },
				{ property: "og:type", content: "website" },
				...(image ? [{ property: "og:image", content: image }] : []),
				{ name: "twitter:card", content: "summary_large_image" },
				{ name: "theme-color", content: "#d8aa65" },
			],
			scripts: [
				{
					id: "discord:component-embed",
					type: "application/json",
					children: JSON.stringify(embed).replace(/</g, "\\u003c"),
				},
			],
		};
	},
});
