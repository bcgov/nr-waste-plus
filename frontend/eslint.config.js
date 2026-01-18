import tanstackQuery from '@tanstack/eslint-plugin-query';
import eslintPluginImport from 'eslint-plugin-import';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import { FlatCompat } from '@eslint/eslintrc';
import { globalIgnores, defineConfig } from 'eslint/config';

const compat = new FlatCompat();

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'node_modules', 'dev-dist', '.devcontainer']),
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
      'no-console': 'warn',
      'no-debugger': 'warn',
      'prettier/prettier': 'warn',
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
]);
