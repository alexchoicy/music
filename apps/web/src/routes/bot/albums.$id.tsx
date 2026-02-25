import { createFileRoute, redirect } from "@tanstack/react-router";
import { checkBotHeader } from "@/lib/ServerFunction/checkBotHeader";
import { getSimpleAlbum } from "@/lib/ServerFunction/getSimpleAlbum";

export const Route = createFileRoute("/bot/albums/$id")({
	beforeLoad: async ({ params }) => {
		if (!import.meta.env.SSR) {
			throw redirect({
				to: "/albums/$id",
				params: { id: params.id },
				replace: true,
			});
		}

		const isBot = await checkBotHeader();
		if (!isBot) {
			throw redirect({
				to: "/albums/$id",
				params: { id: params.id },
				replace: true,
			});
		}
	},
	component: RouteComponent,
	loader: async ({ params }) => {
		const { id } = params;

		const simpleData = await getSimpleAlbum({ data: { id } });

		if (!simpleData) {
			throw new Response("Album not found", { status: 404 });
		}

		return simpleData;
	},
	head: ({ loaderData }) => ({
		meta: [
			{ title: loaderData?.title },
			{
				name: "description",
				content: `${loaderData?.title} by ${loaderData?.credits.join(", ")}`,
			},
			{ property: "og:title", content: loaderData?.title },
			{
				property: "og:description",
				content: `${loaderData?.title} by ${loaderData?.credits.join(", ")}`,
			},
			{ property: "og:image", content: loaderData?.coverUrl },
		],
	}),
});

function RouteComponent() {
	return <div>Hello "/bot/albums/$id"!</div>;
}
