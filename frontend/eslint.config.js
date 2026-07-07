import tanstackQuery from '@tanstack/eslint-plugin-query';
import eslintPluginImport from 'eslint-plugin-import';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import testingLibrary from 'eslint-plugin-testing-library';
import vitest from '@vitest/eslint-plugin';
import { FlatCompat } from '@eslint/eslintrc';
import { globalIgnores, defineConfig } from 'eslint/config';

const compat = new FlatCompat();

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'node_modules', 'dev-dist', '.devcontainer', 'scripts']),
  ...compat.config({
    extends: ['plugin:react-hooks/recommended'],
  }),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, eslintConfigPrettier],
    plugins: {
      '@tanstack/query': tanstackQuery,
      'import': eslintPluginImport,
      'prettier': prettierPlugin,
      'react-hooks': reactHooks,
      'testing-library': testingLibrary,
      'vitest': vitest,
    },
    rules: {
      '@tanstack/query/exhaustive-deps': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'import/order': [
        'warn',
        {
          'groups': [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          'alphabetize': { order: 'asc', caseInsensitive: true },
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-console': 'warn',
      'no-debugger': 'warn',
      'prettier/prettier': 'warn',
      // Testing Library rules — catch common mistakes in RTL tests
      'testing-library/prefer-screen-queries': 'warn',
      'testing-library/no-container': 'warn',
      'testing-library/no-node-access': 'warn',
      'testing-library/prefer-find-by': 'warn',
      'testing-library/prefer-user-event': 'warn',
      // Vitest rules — catch Vitest anti-patterns
      'vitest/no-disabled-tests': 'warn',
      'vitest/no-focused-tests': 'error',
      'vitest/valid-expect': 'error',
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    settings: {
      'react': {
        version: 'detect',
      },
      'import/resolver': {
        alias: {
          map: [['@/', './src']],
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      },
    },
  },
  // Test file configuration — enforce testing best practices with warnings
  {
    files: ['**/*.unit.test.tsx', '**/*.unit.test.ts', '**/*.e2e.test.tsx', '**/*.e2e.test.ts'],
    plugins: {
      'testing-library': testingLibrary,
      'vitest': vitest,
    },
    rules: {
      // Testing Library best practices
      'testing-library/prefer-screen-queries': 'warn',
      'testing-library/no-container': 'warn',
      'testing-library/no-node-access': 'warn',
      'testing-library/prefer-find-by': 'warn',
      'testing-library/prefer-user-event': 'warn',
      'testing-library/no-unnecessary-act': 'warn',
      // Vitest best practices
      'vitest/no-disabled-tests': 'warn',
      'vitest/no-focused-tests': 'error', // Keep as error to prevent accidentally committed focused tests
      'vitest/valid-expect': 'error',
    },
  },
  // E2E test files — Playwright uses page.getByRole() etc., not screen queries
  {
    files: ['**/*.e2e.test.{ts,tsx}'],
    rules: {
      'testing-library/prefer-screen-queries': 'off',
    },
  },
]);
