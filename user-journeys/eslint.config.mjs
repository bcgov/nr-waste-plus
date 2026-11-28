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
      ".features-gen/**",
      "playwright-report/**",
      "test-results/**",
      "reports/**",
      ".spike/**",
      ".auth/**",
    ],
  },
  {
    files: ["playwright/**/*.ts", "playwright.config.ts", "eslint.config.mjs"],
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
    files: [
      "playwright/fixtures/quality.ts",
      "playwright/fixtures/*.fixture.ts",
      "playwright/fixtures/*.test.ts",
      "playwright/support/*.test.ts",
    ],
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
