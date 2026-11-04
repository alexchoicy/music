import { defineConfig } from "vite-plus";

const ignorePatterns = [
	"**/.vscode/**/*",
	"**/build/**",
	"**/coverage/**",
	"**/dist/**",

	".github/**",
	"dotnet-tools.json",
	"apps/backend/**",

	"apps/web/.nitro/**",
	"apps/web/.output/**",
	"apps/web/vite.config.*.timestamp-*.*",
	"apps/web/src/routeTree.gen.ts",
	"apps/web/src/styles.css",
	"apps/web/src/**/base/**/*",
	"apps/web/src/old-components",

	"apps/phone/**",
	"packages/api/src/generated/**",
];

export default defineConfig({
	fmt: {
		useTabs: true,
		printWidth: 80,
		sortImports: true,
		ignorePatterns,
		overrides: [
			{
				files: ["apps/web/**"],
				options: {
					sortTailwindcss: {
						stylesheet: "./apps/web/src/styles.css",
						functions: ["clsx", "cn"],
						preserveWhitespace: true,
					},
				},
			},
		],
	},
	lint: {
		plugins: ["import", "typescript"],
		categories: {
			correctness: "error",
		},
		options: {
			typeAware: true,
			typeCheck: true,
		},
		env: {
			builtin: true,
			es2020: true,
		},
		ignorePatterns,
		jsPlugins: ["vite-plus/oxlint-plugin"],
		rules: {
			"no-case-declarations": "error",
			"no-fallthrough": "error",
			"no-regex-spaces": "error",
			"no-shadow": "warn",
			"no-var": "error",
			"prefer-const": "error",
			"import/consistent-type-specifier-style": "error",
			"import/first": "error",
			"import/newline-after-import": "error",
			"import/no-commonjs": "error",
			"import/no-duplicates": "error",
			"typescript/ban-ts-comment": [
				"error",
				{
					"ts-expect-error": false,
					"ts-ignore": "allow-with-description",
				},
			],
			"typescript/consistent-type-imports": "error",
			"typescript/no-inferrable-types": [
				"error",
				{
					ignoreParameters: true,
				},
			],
			"typescript/no-namespace": "error",
			"typescript/no-unnecessary-condition": "error",
			"typescript/no-unnecessary-type-assertion": "error",
			"typescript/no-unsafe-function-type": "error",
			"typescript/prefer-for-of": "warn",
			"vite-plus/prefer-vite-plus-imports": "error",
		},
		overrides: [
			{
				files: ["apps/web/**/*.{js,ts,tsx}"],
				jsPlugins: ["@shadcn/lint"],
				rules: {
					"typescript/no-deprecated": "error",
					"shadcn/no-restyle": [
						"error",
						{
							allow: ["layout"],
						},
					],
				},
				env: {
					browser: true,
				},
			},
		],
	},
});
