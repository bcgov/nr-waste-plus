import { defineConfig } from "cypress";
import webpack from "@cypress/webpack-preprocessor";
import { addCucumberPreprocessorPlugin } from "@badeball/cypress-cucumber-preprocessor";
import * as dotenv from "dotenv"; 
import fs from "node:fs";
import path from "node:path";

dotenv.config();

const A11Y_REPORT_FILE = path.resolve(__dirname, "reports", "a11y", "a11y-results.json");

let debugPort = 0;

async function setupNodeEvents(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
): Promise<Cypress.PluginConfigOptions> {
  let a11yResults: Array<Record<string, unknown>> = [];

  // This is required for the preprocessor to be able to generate JSON reports after each run, and more,
  await addCucumberPreprocessorPlugin(on, config);

    on("before:browser:launch", (browser, launchOptions) => {
    if (browser.family === "chromium") {
      const portArg = launchOptions.args.find((arg: string) =>
        arg.startsWith("--remote-debugging-port=")
      );
      if (portArg) {
        debugPort = Number.parseInt(portArg.split("=")[1], 10);
      }
    }
    return launchOptions;
  });

  on("task", {
    "a11y:record": (payload: Record<string, unknown>) => {
      a11yResults.push(payload);
      return null;
    },
    "a11y:reset": () => {
      a11yResults = [];
      return null;
    },
    async lighthouse(opts: {
      url: string;
      formFactor?: string;
      screenEmulation?: Record<string, unknown>;
    }) {
      const { default: lighthouseFn } = await import("lighthouse");
      const result = await lighthouseFn(opts.url, {
        port: debugPort,
        hostname: "127.0.0.1",
        output: "json",
        logLevel: "error",
        formFactor: (opts.formFactor as "mobile" | "desktop") || "mobile",
        screenEmulation: opts.screenEmulation,
      });

      if (!result) {
        throw new Error("Lighthouse returned no result.");
      }

      return {
        requestedUrl: result.lhr.requestedUrl,
        finalUrl: result.lhr.finalDisplayedUrl,
        fetchTime: result.lhr.fetchTime,
        categories: Object.fromEntries(
          Object.entries(result.lhr.categories).map(([k, v]) => [
            k,
            (v.score ?? 0) * 100,
          ])
        ),
        audits: Object.fromEntries(
          Object.entries(result.lhr.audits)
            .filter(([, v]) => v.numericValue !== undefined)
            .map(([k, v]) => [k, v.numericValue ?? null])
        ),
      };
    },
  });

  on("before:run", () => {
    a11yResults = [];
    fs.mkdirSync(path.dirname(A11Y_REPORT_FILE), { recursive: true });
    if (fs.existsSync(A11Y_REPORT_FILE)) {
      fs.rmSync(A11Y_REPORT_FILE);
    }
  });

  on("after:run", () => {
    fs.mkdirSync(path.dirname(A11Y_REPORT_FILE), { recursive: true });
    fs.writeFileSync(
      A11Y_REPORT_FILE,
      JSON.stringify({ generatedAt: new Date().toISOString(), checks: a11yResults }, null, 2),
      "utf8"
    );
  });

  on(
    "file:preprocessor",
    webpack({
      webpackOptions: {
        resolve: {
          extensions: [".ts", ".js"],
        },
        module: {
          rules: [
            {
              test: /\.ts$/,
              exclude: [/node_modules/],
              use: [
                {
                  loader: "ts-loader",
                },
              ],
            },
            {
              test: /\.feature$/,
              use: [
                {
                  loader: "@badeball/cypress-cucumber-preprocessor/webpack",
                  options: config,
                },
              ],
            },
          ],
        },
      },
    })
  );

  // Make sure to return the config object as it might have been modified by the plugin.
  return config;
}

export default defineConfig({
  e2e: {
    reporter: "mochawesome",
    reporterOptions: {
      reportDir: "reports/mochawesome",
      overwrite: false,
      html: false,
      json: true
    },
    specPattern: "**/*.feature",
    setupNodeEvents,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 60000,
    chromeWebSecurity: false,
    env: { 
      idir_username: process.env.idir_username,
      idir_password: process.env.idir_password,
      bceid_username: process.env.bceid_username,
      bceid_password: process.env.bceid_password,
    },
  },
  video: true,
  trashAssetsBeforeRuns: true,
  includeShadowDom: false,
  viewportHeight: 1080,
  viewportWidth: 1920,
  retries: {    
    runMode: 1,
    openMode: 0,
  },
});