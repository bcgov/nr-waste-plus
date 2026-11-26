import assert from "node:assert/strict";
import test from "node:test";

import type { TestCase, TestResult } from "@playwright/test/reporter";

import { collect, summarise, type SummarisableTest } from "./aggregate.ts";

const base = {
  schemaVersion: 1,
  feature: "screen-load.feature",
  scenario: "the page loads",
  attempt: 0,
  recordedAt: "2026-11-26T12:00:00.000Z",
};

function a11yEvent(violationCount: number) {
  return {
    ...base,
    kind: "a11y",
    url: "http://localhost:3000/",
    violationCount,
    violations: [],
  };
}

function result(events: unknown[], retry: number, status: TestResult["status"]): TestResult {
  const attachments = events.map((event) => ({
    name: "quality:a11y",
    contentType: "application/json",
    body: Buffer.from(JSON.stringify(event)),
  }));
  return {
    attachments,
    retry,
    status,
    duration: 100,
  } as unknown as TestResult;
}

const testCase = {
  id: "test-1",
  results: [] as TestResult[],
  outcome: () => "expected",
  titlePath: () => ["screen-load.feature", "the page loads"],
} as unknown as TestCase;

test("collect uses the final attempt and keeps earlier attempts separately", () => {
  const first = result([a11yEvent(3)], 0, "failed");
  const second = result([a11yEvent(0)], 1, "passed");

  const collected = collect(testCase, [first, second]);

  assert.equal(collected.events.length, 1);
  assert.equal(
    (collected.events[0] as { violationCount: number }).violationCount,
    0,
  );
  assert.equal(collected.attempts.length, 1);
  assert.equal(collected.attempts[0].attempt, 0);
  assert.equal(collected.attempts[0].status, "failed");
  assert.equal(
    (collected.attempts[0].events[0] as { violationCount: number })
      .violationCount,
    3,
  );
});

test("collect ignores non-quality attachments and empty results", () => {
  const unrelated = {
    ...result([], 0, "passed"),
    attachments: [
      {
        name: "screenshot",
        contentType: "image/png",
        body: Buffer.from("not json"),
      },
    ],
  } as TestResult;

  assert.deepEqual(collect(testCase, []), { events: [], attempts: [] });
  assert.deepEqual(collect(testCase, [unrelated]).events, []);
});

test("summarise counts flaky from the outcome passed in as data", () => {
  const flaky: SummarisableTest = {
    title: "retried and passed",
    status: "passed",
    outcome: "flaky",
    durationMs: 250,
    events: [],
  };
  const passed: SummarisableTest = {
    title: "passed first time",
    status: "passed",
    outcome: "expected",
    durationMs: 50,
    events: [],
  };

  const summary = summarise([flaky, passed]);

  assert.equal(summary.totals.total, 2);
  assert.equal(summary.totals.flaky, 1);
  assert.equal(summary.totals.passed, 1);
  assert.equal(summary.totals.failed, 0);
  assert.equal(summary.totals.durationMs, 300);
});

test("summarise buckets quality events by kind", () => {
  const withEvents: SummarisableTest = {
    title: "records quality",
    status: "passed",
    outcome: "expected",
    durationMs: 10,
    events: [
      a11yEvent(2) as SummarisableTest["events"][number],
      {
        ...base,
        kind: "uiux",
        event: "violation",
        type: "token",
        taxonomy: "spacing",
        severity: "major",
        property: "margin",
        expected: "1rem",
        actual: "2rem",
        element: "main",
        selector: "#root",
      } as SummarisableTest["events"][number],
      {
        ...base,
        kind: "lighthouse",
        type: "metric",
        id: "lcp",
        name: "LCP",
        value: 1200,
        threshold: 2500,
        comparison: "<=",
        passed: true,
        severity: "info",
        taxonomy: "web-vitals",
        url: "http://localhost:3000/",
        lighthouseOptions: { formFactor: "mobile", screenEmulation: null },
        lighthouseConfigSettings: {},
      } as SummarisableTest["events"][number],
    ],
  };

  const summary = summarise([withEvents]);

  assert.equal(summary.a11y.checks, 1);
  assert.equal(summary.a11y.violations, 2);
  assert.equal(summary.uiux.violations, 1);
  assert.equal(summary.uiux.major, 1);
  assert.equal(summary.lighthouse.passed, 1);
});
