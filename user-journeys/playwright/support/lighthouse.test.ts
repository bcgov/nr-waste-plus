const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

type LighthouseModule = {
  normalizePath(url: string): string;
  parseThresholdTable(table: { raw(): string[][] }): Record<string, number>;
  normalizeMetricKey(metric: string): string;
  parseTiming(raw: string | number): number;
  getLighthouseTaxonomy(id: string): string;
  getLighthouseSeverity(id: string, value: number | null): string;
  severityFromScore(score: number): string;
  resolveFormFactor(envValue: string | undefined, viewportWidth: number): string;
  stableSerialize(value: unknown): string;
};

// CommonJS package: compile the pure helpers before requiring them. The module
// imports @playwright/test types only, so the transpiled output has no runtime
// dependency on Playwright or Lighthouse.
function loadLighthouse(): LighthouseModule {
  const file = path.join(__dirname, "lighthouse.ts");
  const source = fs.readFileSync(file, "utf8");
  const js: string = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: file,
  }).outputText;
  const loaded: { exports: LighthouseModule } = { exports: {} as LighthouseModule };
  new Function("module", "exports", "require", js)(
    loaded,
    loaded.exports,
    () => {
      throw new Error("unexpected runtime dependency in pure helper");
    },
  );
  return loaded.exports;
}

const pure = loadLighthouse();

test("normalizePath strips query/hash and prefers hash routing", () => {
  assert.equal(pure.normalizePath("https://example.test/search?page=2"), "/search");
  assert.equal(pure.normalizePath("https://example.test/#/details?id=1"), "/details?id=1");
  assert.equal(pure.normalizePath("https://example.test/search/"), "/search");
  assert.equal(pure.normalizePath("https://example.test/"), "/");
});

test("parseThresholdTable reads DataTable.raw() and normalizes aliases", () => {
  const table = {
    raw: () => [
      ["performance", "75"],
      ["accessibility", "90"],
      ["best-practices", "90"],
      ["seo", "80"],
      ["cls", "0.1"],
    ],
  };
  assert.deepEqual(pure.parseThresholdTable(table), {
    performance: 75,
    accessibility: 90,
    "best-practices": 90,
    seo: 80,
    "cumulative-layout-shift": 0.1,
  });
});

test("parseThresholdTable rejects malformed and empty tables", () => {
  assert.throws(() => pure.parseThresholdTable({ raw: () => [["performance"]] }));
  assert.throws(() => pure.parseThresholdTable({ raw: () => [["performance", "NaN"]] }));
  assert.throws(() => pure.parseThresholdTable({ raw: () => [] }));
});

test("parseTiming covers ms, s and bare numbers", () => {
  assert.equal(pure.parseTiming("95"), 95);
  assert.equal(pure.parseTiming("2500ms"), 2500);
  assert.equal(pure.parseTiming("2.5s"), 2500);
  assert.equal(pure.parseTiming(0.1), 0.1);
});

test("metric taxonomy and severity mirror the Cypress mapping", () => {
  assert.equal(pure.normalizeMetricKey("ttfb"), "server-response-time");
  assert.equal(pure.normalizeMetricKey(" LCP "), "largest-contentful-paint");
  assert.equal(pure.normalizeMetricKey("cls"), "cumulative-layout-shift");
  assert.equal(pure.getLighthouseTaxonomy("largest-contentful-paint"), "web-vitals");
  assert.equal(pure.getLighthouseTaxonomy("server-response-time"), "network");
  assert.equal(pure.getLighthouseSeverity("largest-contentful-paint", 5_000), "major");
  assert.equal(pure.getLighthouseSeverity("cumulative-layout-shift", 0.3), "critical");
  assert.equal(pure.severityFromScore(89), "minor");
});

test("form factor comes from env, then viewport width", () => {
  assert.equal(pure.resolveFormFactor("mobile", 1600), "mobile");
  assert.equal(pure.resolveFormFactor(undefined, 390), "mobile");
  assert.equal(pure.resolveFormFactor(undefined, 1600), "desktop");
});

test("stableSerialize is key-order independent", () => {
  assert.equal(
    pure.stableSerialize({ b: 1, a: { d: 2, c: 3 } }),
    pure.stableSerialize({ a: { c: 3, d: 2 }, b: 1 }),
  );
});
