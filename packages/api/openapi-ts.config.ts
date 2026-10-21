import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
	input: "../../apps/backend/Music.Api/obj/openapi/openapi.json",
	output: "src/generated",
	plugins: ["@hey-api/typescript"],
});
