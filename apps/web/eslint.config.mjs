// @ts-check
import eslintConfigPrettier from "eslint-config-prettier";
import withNuxt from "./.nuxt/eslint.config.mjs";
export default withNuxt([
  {
    ignores: ["src/app/components/ui/**/*"], // Ignore auto-generated components
  },
  {
    rules: {
      "vue/no-multiple-template-root": "off",
      "vue/first-attribute-linebreak": "off",
      "vue/no-mutating-props": "off",
    },
  },
  eslintConfigPrettier,
]);
