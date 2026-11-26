import eslintConfigPrettier from "eslint-config-prettier";
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const base = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
];

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "reports/**",
      "screenshots/**",
      "videos/**",
      "coverage/**",
      ".features-gen/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  {
    files: ["cypress/**/*.{ts,tsx}", "cypress.config.ts"],
    extends: base,
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
  {
    files: ["playwright/**/*.ts", "playwright.config.ts"],
    extends: base,
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "no-debugger": "error",
    },
  },
  {
    // Fixtures are CJS under "type": "commonjs"; they load the ESM quality schema
    // with a dynamic import(), which Playwright's TS loader preserves.
    files: ["playwright/fixtures/quality.ts", "playwright/fixtures/*.fixture.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // Playwright requires an object-destructuring fixture signature; {} declares no dependencies.
    files: ["playwright/fixtures/index.ts"],
    rules: {
      "no-empty-pattern": "off",
    },
  },
);
