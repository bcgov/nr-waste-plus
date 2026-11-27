import fs from "node:fs";
import path from "node:path";

import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";

import {
  collect,
  summarise,
  type QualitySummary,
  type SummarisableTest,
} from "./aggregate.ts";
import { SCHEMA_VERSION, type QualityEvent } from "./schema.ts";
import { renderQualityMarkdown } from "./renderers/index.ts";

const QUALITY_KINDS = ["a11y", "uiux", "lighthouse"] as const;

type QualityChecks = Record<(typeof QUALITY_KINDS)[number], QualityEvent[]>;

export interface QualityReporterOptions {
  outputDir?: string;
}

export class QualityReporter implements Reporter {
  private readonly outputDir: string;
  private readonly resultsByTest = new Map<string, TestResult[]>();
  private readonly testsByTest = new Map<string, SummarisableTest>();

  constructor(options: QualityReporterOptions = {}) {
    this.outputDir = path.resolve(
      process.cwd(),
      options.outputDir ?? "reports/quality",
    );
  }

  printsToStdio(): boolean {
    return false;
  }

  onBegin(): void {
    fs.rmSync(this.outputDir, { recursive: true, force: true });
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const results = this.resultsByTest.get(test.id) ?? [];
    results.push(result);
    this.resultsByTest.set(test.id, results);

    const { events } = collect(test, results);
    this.testsByTest.set(test.id, {
      title: test.titlePath().join(" > "),
      status: result.status,
      outcome: test.outcome(),
      durationMs: result.duration,
      events,
      file: test.location?.file ?? "",
      error: result.error?.message ?? "",
    });
  }

  onEnd(): void {
    const tests = [...this.testsByTest.values()];
    const generatedAt = new Date().toISOString();
    const summary: QualitySummary = summarise(tests, generatedAt);
    const checks: QualityChecks = { a11y: [], uiux: [], lighthouse: [] };
    for (const test of tests) {
      for (const event of test.events) checks[event.kind].push(event);
    }

    for (const kind of QUALITY_KINDS) {
      fs.writeFileSync(
        path.join(this.outputDir, `${kind}.json`),
        JSON.stringify(
          { schemaVersion: SCHEMA_VERSION, generatedAt, checks: checks[kind] },
          null,
          2,
        ),
      );
    }

    const markdown = renderQualityMarkdown(summary);
    fs.writeFileSync(path.join(this.outputDir, "summary.md"), markdown);

    const stepSummary = process.env.GITHUB_STEP_SUMMARY;
    if (stepSummary) fs.appendFileSync(stepSummary, markdown);
  }
}

export default QualityReporter;
