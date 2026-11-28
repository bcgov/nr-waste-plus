import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import type { QualitySummary } from "./aggregate.ts";

import {
  renderQualityMarkdown,
  SECTION_ORDER,
} from "./renderers/index.ts";
import {
  formatConfigSettingsSummary,
  formatLighthouseProfile,
  formatScreenEmulation,
  formatTiming,
  normalizeUrl,
} from "./renderers/lighthouse.ts";
import { formatDuration } from "./renderers/summary.ts";

const GOLDEN_DIR = path.resolve(
  process.cwd(),
  "playwright/reporters/quality/__golden__",
);

function fixture(name: string): QualitySummary {
  return JSON.parse(
    fs.readFileSync(path.join(GOLDEN_DIR, `input-${name}.json`), "utf8"),
  ) as QualitySummary;
}

function expected(name: string): string {
  return fs.readFileSync(path.join(GOLDEN_DIR, name), "utf8");
}

test("full summary matches the golden markdown", () => {
  assert.equal(
    renderQualityMarkdown(fixture("with-events")),
    expected("summary.expected.md"),
  );
});

test("empty sections match the golden markdown", () => {
  const markdown = renderQualityMarkdown(fixture("empty"));
  assert.equal(markdown, expected("summary-empty.expected.md"));
  assert.equal(markdown.match(/No checks recorded/g)?.length, 3);
  assert.equal(markdown.includes("## Other failed tests"), false);
});

test("section order is summary, a11y, lighthouse, uiux, failures", () => {
  assert.deepEqual([...SECTION_ORDER], [
    "summary",
    "a11y",
    "lighthouse",
    "uiux",
    "failures",
  ]);
});

test("metrics table always shows flaky and never shows pending", () => {
  const markdown = renderQualityMarkdown(fixture("empty"));
  assert.match(markdown, /\| Flaky \(passed after retry\) \| 0 \|/);
  assert.equal(markdown.includes("Pending"), false);
  assert.match(markdown, /# Test Summary/);
  assert.equal(markdown.includes("Cypress"), false);
});

test("formatDuration mirrors the Cypress minutes and seconds output", () => {
  assert.equal(formatDuration(0), "0m 0s");
  assert.equal(formatDuration(65432), "1m 5s");
  assert.equal(formatDuration(3_600_000), "60m 0s");
});

test("formatTiming keeps the Cypress millisecond and second split", () => {
  assert.equal(formatTiming(null), "N/A");
  assert.equal(formatTiming(undefined), "N/A");
  assert.equal(formatTiming(0.2), "200ms");
  assert.equal(formatTiming(2100), "2.10s");
});

test("lighthouse helper formatting mirrors the Cypress output", () => {
  const options = {
    formFactor: "mobile" as const,
    screenEmulation: {
      mobile: true,
      width: 412,
      height: 823,
      deviceScaleFactor: 1.75,
      disabled: false,
    },
  };

  assert.equal(
    formatLighthouseProfile(options),
    "mobile (412x823, dpr 1.75)",
  );
  assert.equal(
    formatLighthouseProfile({ formFactor: "desktop", screenEmulation: null }),
    "desktop (screen emulation: not provided)",
  );
  assert.equal(
    formatScreenEmulation(options.screenEmulation),
    "mobile=true, width=412, height=823, dpr=1.75, disabled=false",
  );
  assert.equal(formatScreenEmulation(null), "not provided");
  assert.equal(
    formatConfigSettingsSummary({
      emulatedFormFactor: "mobile",
      throttlingMethod: "simulate",
      screenEmulation: options.screenEmulation,
    }),
    "emulatedFormFactor=mobile; throttlingMethod=simulate; screenEmulation=mobile=true, 412x823, dpr=1.75",
  );
  assert.equal(formatConfigSettingsSummary(null), "unknown");
});

test("normalizeUrl drops hash, query and trailing slash", () => {
  assert.equal(
    normalizeUrl("https://example.gov.bc.ca/#/home?source=audit"),
    "https://example.gov.bc.ca/",
  );
  assert.equal(
    normalizeUrl("https://example.gov.bc.ca/reporting/"),
    "https://example.gov.bc.ca/reporting",
  );
  assert.equal(normalizeUrl("not a url"), "not a url");
});

test("lighthouse renderer keeps the latest attempt for duplicate events", () => {
  const base = fixture("with-events");
  const original = base.lighthouseEvents[1];
  const retry = {
    ...original,
    attempt: 1,
    value: 3000,
    passed: false,
  };
  const markdown = renderQualityMarkdown({
    ...base,
    lighthouseEvents: [original, retry],
  });

  assert.match(markdown, /\| - \| LCP \| 3\.00s \| <= 2\.50s \| ❌ FAIL \|/);
  assert.equal(markdown.includes("2.10s"), false);
});
