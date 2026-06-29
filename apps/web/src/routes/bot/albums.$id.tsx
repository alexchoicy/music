import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { z } from "zod";

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
	component: RouteComponent,
	loaderDeps: ({ search }) => ({ track: search.track }),
	loader: async ({ params, deps }) => {
		const { track } = deps;
		const { id } = params;

		const album = await getSimpleAlbum({ data: { id } });

		if (!album) {
			throw notFound();
		}

		const selectedDisc = album.discs.find((disc) =>
			disc.tracks.some((albumTrack) => Number(albumTrack.trackId) === track),
		);
		const selectedTrack = selectedDisc?.tracks.find(
			(albumTrack) => Number(albumTrack.trackId) === track,
		);

		return { album, selectedDisc, selectedTrack };
	},
	head: ({ loaderData }) => {
		const album = loaderData?.album;
		const selectedDisc = loaderData?.selectedDisc;
		const selectedTrack = loaderData?.selectedTrack;
		const title = selectedTrack?.title ?? album?.title;
		const description = selectedTrack
			? `${selectedTrack.title} from ${album?.title} by ${album?.credits.join(", ")}`
			: `${album?.title} by ${album?.credits.join(", ")}`;
		const og = {
			title,
			description,
			image: selectedDisc?.coverUrl || album?.coverUrl,
		};

		return {
			meta: [
				{ title: og.title },
				{
					name: "description",
					content: og.description,
				},
				{ property: "og:title", content: og.title },
				{
					property: "og:description",
					content: og.description,
				},
				{ property: "og:image", content: og.image },
			],
		};
	},
});

function RouteComponent() {
	return <div>HOLA BOT!</div>;
}
