import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { defineConfig, loadEnv } from 'vite';
import { configDefaults } from 'vitest/config';

// Shared alias definition to ensure consistency across resolve, test, and tsconfig
const ALIAS_SRC = new URL('./src/', import.meta.url).pathname;

export default defineConfig(({ mode }) => {
  const define = {
    global: {},
  };
  return {
    define,
    resolve: {
      alias: {
        '@/': ALIAS_SRC,
      },
      tsconfigPaths: true,
    },
    plugins: [
      // File-based route codegen. Must run BEFORE `react()` so the generated
      // tree exists when route modules are transformed. Ignores colocated
      // test files so they are never treated as routes (DEC-003).
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
        routeFileIgnorePattern: '.*\\.(unit|e2e)\\.test\\.[jt]sx?$',
      }),
      react(),
    ],
    build: {
      chunkSizeWarningLimit: 1024,
      outDir: 'build',
      license: true,
      sourcemap: process.env.VITE_COVERAGE === 'true' ? 'inline' : false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'react-vendor';
            }
            if (id.includes('node_modules/@carbon/')) {
              return 'carbon';
            }
            if (id.includes('node_modules/aws-amplify/')) {
              return 'aws';
            }
            if (id.includes('node_modules/@tanstack/')) {
              return 'query';
            }
            if (id.includes('node_modules/exceljs/')) {
              return 'exceljs';
            }
            if (
              id.includes('node_modules/mathjs/') ||
              id.includes('node_modules/@monaco-editor/')
            ) {
              return 'math-monaco';
            }
            if (
              id.includes('node_modules/axios/') ||
              id.includes('node_modules/lodash/') ||
              id.includes('node_modules/luxon/') ||
              id.includes('node_modules/idb/')
            ) {
              return 'utils';
            }
          },
        },
      },
    },
    optimizeDeps: {
      include: [
        '@tanstack/react-query',
        'aws-amplify',
        'aws-amplify/auth/cognito',
        'aws-amplify/utils',
        'react-dom/client',
        '@tanstack/react-query-devtools',
        'aws-amplify/auth',
        'mathjs',
        '@monaco-editor/react',
      ],
    },
    server: {
      port: 3000,
      hmr: {
        overlay: false,
      },
      warmup: {
        clientFiles: [
          './src/main.tsx',
          './src/App.tsx',
          './src/router.tsx',
        ],
      },
      watch: {
        ignored: [
          '**/coverage/**',
          '**/build/**',
          '**/dev-dist/**',
          '**/test-reports/**',
          '**/test-results/**',
          '**/node_modules/**',
        ],
      },
    },
    preview: {
      port: 3000,
    },
    test: {
      alias: {
        '@/': ALIAS_SRC,
      },
      testTimeout: 15000,
      clearMocks: true,
      restoreMocks: true,
      unstubGlobals: true,
      unstubEnvs: true,
      env: loadEnv(mode, process.cwd(), ''),
      exclude: [...configDefaults.exclude, 'dist/**', 'build/**'],
      globals: true,
      tsconfig: './tsconfig.test.json',
      reporters: ['default', ['junit', { suiteName: 'Unit tests' }]],
      environment: 'jsdom',
      outputFile: {
        junit: './coverage/junit-report.xml',
      },
      coverage: {
        provider: 'v8',
        reporter: ['lcov', 'text', 'json'],
        reportsDirectory: './coverage',
        all: false,
        excludeAfterRemap: true,
        exclude: [
          '**/node_modules/**',
          '**/tests/**',
          '**/*.test.{ts,tsx}',
          '**/*.unit.test.{ts,tsx}',
          '**/vite-env.d.ts',
          '**/constants/**',
          '**/config/fam/*',
          '**/config/tests/*',
          '**/*.env.ts',
          '**/*.scss',
          '**/*.css',
          '**/*.d.ts',
          '**/registerServiceWorker.ts',
          '**/service-worker.ts',
          // Pure declarative type modules — no runtime logic to measure.
          // Logic-bearing schema modules (pagination, search, forestclient,
          // reportingUnit, districtvolumes, speciesComposition,
          // formulaConfiguration) stay measured: they carry .default()/.lazy
          // behaviour under test by schemaLogic.unit.test.ts and the hooks.
          '**/types.ts',
          '**/types/audit.types.ts',
          '**/types/auth.types.ts',
          '**/types/conditionalField.types.ts',
          '**/types/districtSelection.types.ts',
          '**/types/formulaInput.types.ts',
          '**/types/index.ts',
          '**/types/notification.types.ts',
          '**/types/preference.types.ts',
          '**/types/spreadsheet.types.ts',
          '**/types/tableResource.types.ts',
          '**/types/useBreakpoint.types.ts',
          '**/types/utils.types.ts',
          '**/main.tsx',
          '**/App.tsx',
          '**/e2e.setup.ts',
          '**/e2e.utils.ts',
          '**/DevTools.tsx',
          '**/vite.config.ts',
        ],
        include: ['src/**/*.ts', 'src/**/*.tsx'],
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      projects: [
        {
          name: 'node',
          extends: true,
          test: {
            setupFiles: [
              './src/config/tests/setup-env.ts',
              './src/config/tests/custom-matchers.ts',
            ],
            environment: 'jsdom',
            include: ['src/**/*.unit.test.{ts,tsx}'],
          },
        },
      ],
    },
  };
});
