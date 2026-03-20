import { defineConfig } from "cypress";
import webpack from "@cypress/webpack-preprocessor";
import { addCucumberPreprocessorPlugin } from "@badeball/cypress-cucumber-preprocessor";
import { lighthouse, prepareAudit } from "cypress-audit";
import * as dotenv from "dotenv"; 
import fs from "node:fs";
import path from "node:path";

dotenv.config();

const A11Y_REPORT_FILE = path.resolve(__dirname, "reports", "a11y", "a11y-results.json");
const LIGHTHOUSE_REPORT_FILE = path.resolve(
  __dirname,
  "reports",
  "lighthouse",
  "lighthouse-results.json"
);

interface LighthouseSnapshot {
  requestedUrl: string;
  finalUrl: string;
  fetchTime: string;
  categories: Record<string, number | null>;
  audits: Record<string, number | null>;
}

const toRoundedNumber = (value: unknown, digits = 2): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const toCategoryScore = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.round(value * 100);
};

const toLighthouseSnapshot = (report: unknown): LighthouseSnapshot => {
  const parsed = (report || {}) as {
    lhr?: {
      requestedUrl?: string;
      finalUrl?: string;
      fetchTime?: string;
      categories?: Record<string, { score?: number | null }>;
      audits?: Record<string, { numericValue?: number | null }>;
    };
    requestedUrl?: string;
    finalUrl?: string;
    fetchTime?: string;
    categories?: Record<string, { score?: number | null }>;
    audits?: Record<string, { numericValue?: number | null }>;
  };

  const source = parsed.lhr || parsed;

  return {
    requestedUrl: source.requestedUrl || "",
    finalUrl: source.finalUrl || "",
    fetchTime: source.fetchTime || new Date().toISOString(),
    categories: {
      performance: toCategoryScore(source.categories?.performance?.score),
      accessibility: toCategoryScore(source.categories?.accessibility?.score),
      "best-practices": toCategoryScore(source.categories?.["best-practices"]?.score),
      seo: toCategoryScore(source.categories?.seo?.score),
      pwa: toCategoryScore(source.categories?.pwa?.score),
    },
    audits: {
      "server-response-time": toRoundedNumber(source.audits?.["server-response-time"]?.numericValue),
      "largest-contentful-paint": toRoundedNumber(source.audits?.["largest-contentful-paint"]?.numericValue),
      "cumulative-layout-shift": toRoundedNumber(source.audits?.["cumulative-layout-shift"]?.numericValue, 3),
      "total-blocking-time": toRoundedNumber(source.audits?.["total-blocking-time"]?.numericValue),
      "speed-index": toRoundedNumber(source.audits?.["speed-index"]?.numericValue),
      interactive: toRoundedNumber(source.audits?.interactive?.numericValue),
    },
  };
};

async function setupNodeEvents(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
): Promise<Cypress.PluginConfigOptions> {
  let a11yResults: Array<Record<string, unknown>> = [];
  let lighthouseResults: LighthouseSnapshot[] = [];

  // This is required for the preprocessor to be able to generate JSON reports after each run, and more,
  await addCucumberPreprocessorPlugin(on, config);

  on("task", {
    lighthouse: lighthouse((lighthouseReport: unknown) => {
      lighthouseResults.push(toLighthouseSnapshot(lighthouseReport));
      return null;
    }),
    "lighthouse:getLatest": () => {
      return lighthouseResults.length > 0 ? lighthouseResults[lighthouseResults.length - 1] : null;
    },
    "lighthouse:reset": () => {
      lighthouseResults = [];
      return null;
    },
    "a11y:record": (payload: Record<string, unknown>) => {
      a11yResults.push(payload);
      return null;
    },
    "a11y:reset": () => {
      a11yResults = [];
      return null;
    },
  });

  on("before:run", () => {
    a11yResults = [];
    lighthouseResults = [];

    fs.mkdirSync(path.dirname(A11Y_REPORT_FILE), { recursive: true });
    fs.mkdirSync(path.dirname(LIGHTHOUSE_REPORT_FILE), { recursive: true });

    if (fs.existsSync(A11Y_REPORT_FILE)) {
      fs.rmSync(A11Y_REPORT_FILE);
    }

    if (fs.existsSync(LIGHTHOUSE_REPORT_FILE)) {
      fs.rmSync(LIGHTHOUSE_REPORT_FILE);
    }
  });

  on("after:run", () => {
    fs.mkdirSync(path.dirname(A11Y_REPORT_FILE), { recursive: true });
    fs.mkdirSync(path.dirname(LIGHTHOUSE_REPORT_FILE), { recursive: true });

    fs.writeFileSync(
      A11Y_REPORT_FILE,
      JSON.stringify({ generatedAt: new Date().toISOString(), checks: a11yResults }, null, 2),
      "utf8"
    );

    fs.writeFileSync(
      LIGHTHOUSE_REPORT_FILE,
      JSON.stringify({ generatedAt: new Date().toISOString(), audits: lighthouseResults }, null, 2),
      "utf8"
    );
  });

  on("before:browser:launch", (_browser, launchOptions) => {
    const hasRemoteDebuggingPort = launchOptions.args.some((arg) =>
      arg.startsWith("--remote-debugging-port=")
    );

    if (!hasRemoteDebuggingPort) {
      launchOptions.args.push("--remote-debugging-port=9222");
    }

    prepareAudit(launchOptions);
    return launchOptions;
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

const reporter = process.env.MOCHAWESOME_REPORT === "true"
  ? "mochawesome"
  : require.resolve("@badeball/cypress-cucumber-preprocessor/pretty-reporter");

export default defineConfig({
  e2e: {
    reporter,
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