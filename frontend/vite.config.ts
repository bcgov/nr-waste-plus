import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import tsconfigPaths from 'vite-tsconfig-paths';
import { configDefaults } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const define = {
    global: {},
  };
  return {
    define,
    resolve: {
      alias: {
        '@/': new URL('./src/', import.meta.url).pathname,
      },
    },
    plugins: [
      react(),
      tsconfigPaths(),
      VitePWA({
        registerType: 'autoUpdate',
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'service-worker.ts',
        injectRegister: 'auto',
        devOptions: {
          enabled: true,
          type: 'module', // use module type for service worker in development
        },
        workbox: {
          navigateFallback: '/index.html',
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          sourcemap: true,
          maximumFileSizeToCacheInBytes: 6000000,
        },
        injectManifest: {
          maximumFileSizeToCacheInBytes: 6000000,
        },
        manifest: {
          id: '/',
          lang: 'en',
          short_name: 'WastePlus',
          name: 'Waste Plus',
          start_url: '.',
          display: 'standalone',
          theme_color: '#000000',
          background_color: '#ffffff',
          description: 'Report logging waste and residue data for billing and cut control',
          icons: [
            {
              src: '/icons/favicon.ico',
              sizes: '48x48',
              type: 'image/x-icon',
            },
            {
              src: '/icons/favicon-16x16.png',
              sizes: '16x16',
              type: 'image/png',
            },
            {
              src: '/icons/favicon-32x32.png',
              sizes: '32x32',
              type: 'image/png',
            },
            {
              src: '/icons/favicon-64x64.png',
              sizes: '64x64',
              type: 'image/png',
            },
            {
              src: '/icons/android-chrome-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icons/android-chrome-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
          screenshots: [
            {
              src: '/screenshots/homepage-light.jpeg',
              sizes: '2434x1237',
              type: 'image/jpeg',
              form_factor: 'wide',
            },
            {
              src: '/screenshots/homepage-dark.jpeg',
              sizes: '2434x1237',
              type: 'image/jpeg',
              form_factor: 'wide',
            },
            {
              src: '/screenshots/mobile-homepage-light.jpeg',
              sizes: '320x920',
              type: 'image/jpeg',
            },
            {
              src: '/screenshots/mobile-homepage-dark.jpeg',
              sizes: '320x920',
              type: 'image/jpeg',
            },
          ],
          display_override: ['window-controls-overlay', 'standalone'],
        },
      }),
    ],
    build: {
      chunkSizeWarningLimit: 1024,
      outDir: 'build',
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
      ],
    },
    server: {
      port: 3000,
      hmr: {
        overlay: false,
      },
    },
    preview: {
      port: 3000,
    },
    test: {
      alias: {
        '@/': new URL('./src/', import.meta.url).pathname,
      },
      testTimeout: 5000,
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
        reporter: ['lcov', 'cobertura', 'html', 'json', 'text'],
        reportsDirectory: './coverage',
        all: false,
        excludeAfterRemap: true,
        exclude: [
          '**/node_modules/**',
          '**/tests/**',
          '**/*.test.{ts,tsx}',
          '**/*.unit.test.{ts,tsx}',
          '**/vite-env.d.ts',
          '**/types/**',
          '**/constants/**',
          '**/config/fam/*',
          '**/config/react-query/*',
          '**/config/tests/*',
          '**/*.env.ts',
          '**/*.scss',
          '**/*.css',
          '**/*.d.ts',
          '**/types.ts',
          '**/*.types.ts',
          '**/main.tsx',
          '**/App.tsx',
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
