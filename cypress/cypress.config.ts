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

let debugPort = 0;

const writeFile = (filePath: string, data: Array<Record<string, unknown>>) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(
      filePath,
      JSON.stringify({ generatedAt: new Date().toISOString(), checks: data }, null, 2),
      "utf8"
    );
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
    const search = u.search; // we will ignore it

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


async function setupNodeEvents(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
): Promise<Cypress.PluginConfigOptions> {
  let a11yResults: Array<Record<string, unknown>> = [];
  let uiuxResults: Array<Record<string, unknown>> = [];
  let lighthouseResults: Array<Record<string, unknown>> = [];
  let lighthouseReport : Array<Record<string, unknown>> = [];


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

    if(lighthouseReport[normalizedURL]) return lighthouseReport[normalizedURL];

    // Run Lighthouse
    const result = await lighthouse.default(url, {
      port: debugPort,
      hostname: "127.0.0.1",
      output: "json",
      logLevel: "error",
      formFactor: (options.formFactor as "mobile" | "desktop") || "mobile",
      screenEmulation: options.screenEmulation,
      ...options,
    }) ?? {} as { lhr: any };

    // Extract the useful parts
    const lhr = result.lhr;

    const report = {
      url: normalizedURL,
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
    lighthouseReport[normalizedURL] = report;

    return report;
  },
  });

  on("before:run", () => {
    a11yResults = [];
    cleanFile(A11Y_REPORT_FILE);
    cleanFile(UIUX_REPORT_FILE);
    cleanFile(LIGHTHOUSE_REPORT_FILE);
  });

  on("after:run", () => {
    writeFile(A11Y_REPORT_FILE, a11yResults);
    writeFile(UIUX_REPORT_FILE, uiuxResults);
    writeFile(LIGHTHOUSE_REPORT_FILE, lighthouseResults);
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