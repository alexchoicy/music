import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

export const checkBotHeader = createServerFn().handler(async () => {
	const userAgent = getRequestHeader("user-agent") || "";

	console.log("User-Agent:", userAgent);

	const botUserAgents = ["Discordbot"];

	return botUserAgents.some((botAgent) => userAgent.includes(botAgent));
});
