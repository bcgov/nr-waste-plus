import { defineConfig } from "cypress";
import webpack from "@cypress/webpack-preprocessor";
import { addCucumberPreprocessorPlugin } from "@badeball/cypress-cucumber-preprocessor";
import * as dotenv from "dotenv"; 
import fs from "node:fs";
import path from "node:path";

dotenv.config();

const A11Y_REPORT_FILE = path.resolve(__dirname, "reports", "a11y", "a11y-results.json");
const UIUX_REPORT_FILE = path.resolve(__dirname, "reports", "uiux", "uiux-results.json");
const LIGHTHOUSE_REPORT_FILE = path.resolve(__dirname, "reports", "lighthouse", "lighthouse-results.json");

const RUN_RESULT_FILE = path.resolve(__dirname, "reports", "run-result.json");
const FLAKY_SUMMARY_FILE = path.resolve(__dirname, "reports", "flaky", "flaky-summary.json");

let debugPort = 0;

interface LighthouseScreenEmulation {
  mobile?: boolean;
  width?: number;
  height?: number;
  deviceScaleFactor?: number;
  disabled?: boolean;
}

interface LighthouseTaskOptions {
  formFactor?: "mobile" | "desktop";
  screenEmulation?: LighthouseScreenEmulation;
  [key: string]: unknown;
}

const writeFile = (filePath: string, data: Array<Record<string, unknown>>) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(
      filePath,
      JSON.stringify({ generatedAt: new Date().toISOString(), checks: data }, null, 2),
      "utf8"
    );
};

const writeJsonFile = (filePath: string, data: unknown) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
};

const cleanFile = (filePath: string) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath);
  }
};

const normalizePath = (url: any): any => {
  try {
    const u = new URL(url);

    // Remove hash and query
    const hash = u.hash.replace(/^#/, ""); // remove leading #

    // Prefer hash-based routing if present
    let path = hash || u.pathname;

    // Normalize empty path
    if (!path || path === "") path = "/";

    // Ensure leading slash
    if (!path.startsWith("/")) path = "/" + path;

    // Remove trailing slash except for root
    if (path !== "/" && path.endsWith("/")) {
      path = path.slice(0, -1);
    }

    return path;
  } catch {
    return url; // fallback
  }
};

const sortKeysDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort((a, b) => a.localeCompare(b))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
};

const stableSerialize = (value: unknown): string => JSON.stringify(sortKeysDeep(value));


async function setupNodeEvents(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
): Promise<Cypress.PluginConfigOptions> {
  let a11yResults: Array<Record<string, unknown>> = [];
  let uiuxResults: Array<Record<string, unknown>> = [];
  let lighthouseResults: Array<Record<string, unknown>> = [];
  let lighthouseReport: Record<string, Record<string, unknown>> = {};


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
    "uiux:record": (payload: Record<string, unknown>) => {
      uiuxResults.push(payload);
      return null;
    },
    "uiux:reset": () => {
      uiuxResults = [];
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
    "lighthouse:record": (payload: Record<string, unknown>) => {
      lighthouseResults.push(payload);
      return null;
    },
    "lighthouse:reset": () => {
      lighthouseResults = [];
      return null;
    },
    async "lighthouse:run"({ url, options }) {
    const lighthouse = await import("lighthouse");
    const normalizedURL = normalizePath(url);
    const inputOptions = (options ?? {}) as LighthouseTaskOptions;
    const effectiveOptions: LighthouseTaskOptions = {
      formFactor: inputOptions.formFactor || "mobile",
      screenEmulation: inputOptions.screenEmulation,
      ...inputOptions,
    };
    const cacheKey = `${normalizedURL}|${stableSerialize(effectiveOptions)}`;

    if (lighthouseReport[cacheKey]) return lighthouseReport[cacheKey];

    let lighthouseConfig: unknown;
    if (effectiveOptions.formFactor === "desktop") {
      try {
        const desktopConfig = await import("lighthouse/core/config/desktop-config.js");
        lighthouseConfig = desktopConfig.default;
      } catch {
        lighthouseConfig = undefined;
      }
    }

    // Run Lighthouse
    const result = await lighthouse.default(url, {
      port: debugPort,
      hostname: "127.0.0.1",
      output: "json",
      logLevel: "error",
      ...effectiveOptions,
    }, lighthouseConfig as any) ?? {} as { lhr: any };

    // Extract the useful parts
    const lhr = result.lhr;

    const report = {
      url: normalizedURL,
      lighthouseOptions: {
        formFactor: effectiveOptions.formFactor,
        screenEmulation: effectiveOptions.screenEmulation ?? null,
      },
      lighthouseConfigSettings: result.lhr?.configSettings ?? {},
      categories: Object.fromEntries(
          Object.entries(lhr.categories)
            .filter(([, v]) => (v as any).score !== undefined)
            .map(([k, v]) => [k, (v as any).score ?? 0])
            .map(([k, v]) => [k, Math.round(v * 100)])
        ),
      metrics: Object.fromEntries(
          Object.entries(result.lhr.audits)
            .filter(([, v]) => (v as any).numericValue !== undefined)
            .map(([k, v]) => [k, (v as any).numericValue ?? null])
        ),
      raw: lhr,
    };
    lighthouseReport[cacheKey] = report;

    return report;
  },
  });

  // Q2 (video-on-failure): drop a spec's video when no test failed in it.
  // NOTE: videoUploadOnPasses was removed in Cypress 13, so we delete the
  // passing-spec video here instead of relying on a removed option.
  on("after:spec", (_spec: unknown, results: CypressCommandLine.RunResult) => {
    if (!results) return;
    const video = results.video;
    if (!video) return;
    const failed = (results.tests ?? []).some((test) => {
      const attempts = (test as unknown as { attempts?: Array<{ state: string }> }).attempts ?? [];
      return attempts.some((a) => a.state === "failed");
    });
    if (!failed) {
      try {
        fs.unlinkSync(video);
      } catch {
        // video already gone or locked; ignore
      }
    }
  });

  on("before:run", () => {
    a11yResults = [];
    lighthouseReport = {};
    cleanFile(A11Y_REPORT_FILE);
    cleanFile(UIUX_REPORT_FILE);
    cleanFile(LIGHTHOUSE_REPORT_FILE);
    cleanFile(RUN_RESULT_FILE);
    cleanFile(FLAKY_SUMMARY_FILE);
  });

  on("after:run", (results) => {
    writeFile(A11Y_REPORT_FILE, a11yResults);
    writeFile(UIUX_REPORT_FILE, uiuxResults);
    writeFile(LIGHTHOUSE_REPORT_FILE, lighthouseResults);

    // Persist the full Cypress RunResult so retry data (results.tests[].attempts[])
    // survives the run for analysis. The mochawesome JSON does NOT carry attempt/flaky
    // fields, so this is the only source of truth for flaky detection.
    if (results && "tests" in results) {
      writeJsonFile(RUN_RESULT_FILE, results);

      // A test is flaky when it was retried (attempts.length > 1) and ultimately passed.
      const runResult = results as unknown as CypressCommandLine.RunResult;
      let flakyCount = 0;
      for (const test of runResult.tests ?? []) {
        const attempts = test.attempts ?? [];
        const finalState = attempts.length
          ? attempts[attempts.length - 1]?.state
          : test.state;
        if (attempts.length > 1 && finalState === "passed") {
          flakyCount += 1;
        }
      }
      writeJsonFile(FLAKY_SUMMARY_FILE, { flaky: flakyCount, generatedAt: new Date().toISOString() });
    }
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
    // Interim reduction (Q4, #1083): dropped 2 -> 1 now that the Q3 flaky signal
    // is visible in the CI summary. Move to 0 only after 2-4 weeks of Q3 data show
    // a flaky rate below 1%.
    runMode: 1,
    openMode: 0,
  },
});