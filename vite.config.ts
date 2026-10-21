import { defineConfig } from "vite-plus";

const ignorePatterns = [
	"**/.vscode/**/*",
	"**/build/**",
	"**/coverage/**",
	"**/dist/**",
	"package-lock.json",
	"pnpm-lock.yaml",
	"yarn.lock",

	".github/**",
	"dotnet-tools.json",
	"apps/backend/**",
	"apps/desktop-rust/**",

	"apps/web/.nitro/**",
	"apps/web/.output/**",
	"apps/web/.vinxi/**",
	"apps/web/vite.config.*.timestamp-*.*",
	"apps/web/src/routeTree.gen.ts",
	"apps/web/src/styles.css",
	"apps/web/src/**/base/**/*",
	"apps/web/src/old-components",

	"apps/phone/.expo/**",
	"apps/phone/android/**",
	"apps/phone/ios/**",
	"apps/phone/expo-env.d.ts",
	"apps/phone/src/global.css",
	"apps/phone/src/uniwind-types.d.ts",
	"apps/phone/src/data/APIschema.ts",
	"packages/api/src/generated/**",
];

const sortTailwindcss = (stylesheet: string) => ({
	stylesheet,
	functions: ["clsx", "cn"],
	preserveWhitespace: true,
});

export default defineConfig({
	fmt: {
		singleQuote: false,
		useTabs: true,
		trailingComma: "all",
		printWidth: 80,
		sortImports: true,
		sortPackageJson: true,
		ignorePatterns,
		overrides: [
			{
				files: ["apps/web/**"],
				options: {
					sortTailwindcss: sortTailwindcss("./apps/web/src/styles.css"),
				},
			},
			{
				files: ["apps/phone/**"],
				options: {
					sortTailwindcss: sortTailwindcss("./apps/phone/src/global.css"),
				},
			},
		],
	},
	lint: {
		plugins: ["import", "typescript"],
		categories: {
			correctness: "off",
		},
		options: {
			typeAware: true,
			typeCheck: true,
		},
		env: {
			builtin: true,
		},
		ignorePatterns,
		jsPlugins: [
			{
				name: "vite-plus",
				specifier: "vite-plus/oxlint-plugin",
			},
		],
		rules: {
			"vite-plus/prefer-vite-plus-imports": "error",
		},
		overrides: [
			{
				files: ["**/*.{js,ts,tsx}"],
				rules: {
					"for-direction": "error",
					"no-async-promise-executor": "error",
					"no-case-declarations": "error",
					"no-class-assign": "error",
					"no-compare-neg-zero": "error",
					"no-cond-assign": "error",
					"no-constant-binary-expression": "error",
					"no-constant-condition": "error",
					"no-control-regex": "error",
					"no-debugger": "error",
					"no-delete-var": "error",
					"no-dupe-else-if": "error",
					"no-duplicate-case": "error",
					"no-empty-character-class": "error",
					"no-empty-pattern": "error",
					"no-empty-static-block": "error",
					"no-ex-assign": "error",
					"no-extra-boolean-cast": "error",
					"no-fallthrough": "error",
					"no-global-assign": "error",
					"no-invalid-regexp": "error",
					"no-irregular-whitespace": "error",
					"no-loss-of-precision": "error",
					"no-misleading-character-class": "error",
					"no-nonoctal-decimal-escape": "error",
					"no-regex-spaces": "error",
					"no-self-assign": "error",
					"no-shadow": "warn",
					"no-shadow-restricted-names": "error",
					"no-sparse-arrays": "error",
					"no-unsafe-finally": "error",
					"no-unsafe-optional-chaining": "error",
					"no-unused-labels": "error",
					"no-unused-private-class-members": "error",
					"no-useless-backreference": "error",
					"no-useless-catch": "error",
					"no-useless-escape": "error",
					"no-var": "error",
					"no-with": "error",
					"prefer-const": "error",
					"require-yield": "error",
					"use-isnan": "error",
					"valid-typeof": "error",
					"import/consistent-type-specifier-style": [
						"error",
						"prefer-top-level",
					],
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
					"typescript/consistent-type-imports": [
						"error",
						{
							prefer: "type-imports",
						},
					],
					"typescript/no-duplicate-enum-values": "error",
					"typescript/no-extra-non-null-assertion": "error",
					"typescript/no-for-in-array": "error",
					"typescript/no-inferrable-types": [
						"error",
						{
							ignoreParameters: true,
						},
					],
					"typescript/no-misused-new": "error",
					"typescript/no-namespace": "error",
					"typescript/no-non-null-asserted-optional-chain": "error",
					"typescript/no-unnecessary-condition": "error",
					"typescript/no-unnecessary-type-assertion": "error",
					"typescript/no-unsafe-function-type": "error",
					"typescript/no-wrapper-object-types": "error",
					"typescript/prefer-as-const": "error",
					"typescript/prefer-for-of": "warn",
					"typescript/triple-slash-reference": "error",
				},
				env: {
					es2020: true,
				},
			},
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
			{
				files: ["apps/phone/metro.config.js"],
				rules: {
					"import/no-commonjs": "off",
				},
				env: {
					node: true,
				},
			},
		],
	},
});
