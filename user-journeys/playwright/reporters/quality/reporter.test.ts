import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type { TestCase, TestResult } from "@playwright/test/reporter";

import { QualityReporter } from "./reporter.ts";

function tempOutputDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "quality-reporter-"));
}

test("QualityReporter does not print to stdio", () => {
  assert.equal(new QualityReporter().printsToStdio(), false);
});

test("an empty run still writes all three JSON files and summary.md", () => {
  const outputDir = tempOutputDir();
  const reporter = new QualityReporter({ outputDir });

  reporter.onBegin();
  reporter.onEnd();

  for (const kind of ["a11y", "uiux", "lighthouse"]) {
    const file = path.join(outputDir, `${kind}.json`);
    assert.ok(fs.existsSync(file), `${kind}.json was not written`);
    const data = JSON.parse(fs.readFileSync(file, "utf8")) as {
      schemaVersion: number;
      generatedAt: string;
      checks: unknown[];
    };
    assert.equal(data.schemaVersion, 1);
    assert.deepEqual(data.checks, []);
    assert.ok(Number.isNaN(Date.parse(data.generatedAt)) === false);
  }
  assert.ok(fs.existsSync(path.join(outputDir, "summary.md")));

  fs.rmSync(outputDir, { recursive: true, force: true });
});

test("onBegin clears stale quality output", () => {
  const outputDir = tempOutputDir();
  fs.writeFileSync(path.join(outputDir, "stale.json"), "{}");

  new QualityReporter({ outputDir }).onBegin();

  assert.equal(fs.existsSync(path.join(outputDir, "stale.json")), false);
  fs.rmSync(outputDir, { recursive: true, force: true });
});

test("onTestEnd routes an attached event into its kind file", () => {
  const outputDir = tempOutputDir();
  const reporter = new QualityReporter({ outputDir });
  const event = {
    schemaVersion: 1,
    kind: "a11y",
    feature: "screen-load.feature",
    scenario: "the page loads",
    attempt: 0,
    recordedAt: "2026-11-26T12:00:00.000Z",
    url: "http://localhost:3000/",
    violationCount: 0,
    violations: [],
  };
  const testCase = {
    id: "test-1",
    results: [],
    outcome: () => "expected",
    titlePath: () => ["screen-load.feature", "the page loads"],
  } as unknown as TestCase;
  const result = {
    attachments: [
      {
        name: "quality:a11y",
        contentType: "application/json",
        body: Buffer.from(JSON.stringify(event)),
      },
    ],
    retry: 0,
    status: "passed",
    duration: 10,
  } as unknown as TestResult;

  reporter.onBegin();
  reporter.onTestEnd(testCase, result);
  reporter.onEnd();

  const a11y = JSON.parse(
    fs.readFileSync(path.join(outputDir, "a11y.json"), "utf8"),
  ) as { checks: unknown[] };
  assert.equal(a11y.checks.length, 1);
  const uiux = JSON.parse(
    fs.readFileSync(path.join(outputDir, "uiux.json"), "utf8"),
  ) as { checks: unknown[] };
  assert.deepEqual(uiux.checks, []);

  fs.rmSync(outputDir, { recursive: true, force: true });
});
