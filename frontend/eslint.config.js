import tanstackQuery from '@tanstack/eslint-plugin-query';
import { importX } from 'eslint-plugin-import-x';
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

// Local rule: barrel re-exports (`export ... from './x'`) stay sorted
// case-insensitively by source module — keeps the @/types barrel stable
// without an external sort plugin.
const barrelPlugin = {
  rules: {
    'sorted-re-exports': {
      meta: {
        type: 'suggestion',
        docs: {
          description:
            'Enforce case-insensitive alphabetical order of barrel re-exports by source module.',
        },
        schema: [],
        messages: {
          unsorted: "Re-export of '{{source}}' should come before '{{previous}}'.",
        },
      },
      create(context) {
        const reExports = [];
        return {
          ExportAllDeclaration(node) {
            if (node.source) reExports.push(node);
          },
          ExportNamedDeclaration(node) {
            if (node.source) reExports.push(node);
          },
          'Program:exit'() {
            let previous = null;
            for (const node of reExports) {
              const source = String(node.source.value);
              if (previous && source.toLowerCase() < previous.toLowerCase()) {
                context.report({
                  node,
                  messageId: 'unsorted',
                  data: { source, previous },
                });
              }
              previous = source;
            }
          },
        };
      },
    },
  },
};

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'node_modules', 'dev-dist', '.devcontainer', 'scripts', 'src/routeTree.gen.ts']),
  ...compat.config({
    extends: ['plugin:react-hooks/recommended'],
  }),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, eslintConfigPrettier],
    plugins: {
      '@tanstack/query': tanstackQuery,
      'import-x': importX,
      'prettier': prettierPlugin,
      'react-hooks': reactHooks,
      'testing-library': testingLibrary,
      'vitest': vitest,
    },
    rules: {
      '@tanstack/query/exhaustive-deps': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'import-x/order': [
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
      'import-x/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
  },
  // Barrel hygiene — the @/types re-export barrel stays alphabetically sorted.
  {
    files: ['src/types/index.ts'],
    plugins: { barrel: barrelPlugin },
    rules: {
      'barrel/sorted-re-exports': 'warn',
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
  // E2E test files — and their Playwright helper utilities — use page.getByRole()
  // etc., not screen queries; the testing-library rule misfires on `page` queries.
  {
    files: [
      '**/*.e2e.test.{ts,tsx}',
      '**/config/tests/auth.helper.ts',
      '**/pages/ReportingUnitCreate/e2e.utils.ts',
    ],
    rules: {
      'testing-library/prefer-screen-queries': 'off',
    },
  },
]);
