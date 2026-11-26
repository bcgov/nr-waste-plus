import eslintConfigPrettier from "eslint-config-prettier";
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "reports/**",
      "screenshots/**",
      "videos/**",
      "coverage/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      eslintConfigPrettier,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.mocha,
        Cypress: "readonly",
        cy: "readonly",
      },
    },
    rules: {
      // Existing Cypress helpers intentionally use dynamic report shapes and browser logging.
      // Keep these legacy patterns permitted while still enforcing parser/type syntax rules.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-console": "off",
      "no-debugger": "error",
      // Cypress and Chai use property assertions such as `expect(...).to.be.ok`.
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
);
