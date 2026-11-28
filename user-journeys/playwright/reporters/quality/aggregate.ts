import type { TestCase, TestResult } from "@playwright/test/reporter";

import { parseEvent } from "./schema.ts";
import type {
  A11yEvent,
  LighthouseEvent,
  QualityEvent,
  UiuxEvent,
} from "./schema.ts";

export type TestOutcome = "skipped" | "expected" | "unexpected" | "flaky";

export interface AttemptRecord {
  attempt: number;
  status: TestResult["status"];
  events: QualityEvent[];
}

export interface Collected {
  events: QualityEvent[];
  attempts: AttemptRecord[];
}

export interface SummarisableTest {
  title: string;
  status: TestResult["status"];
  outcome: TestOutcome;
  durationMs: number;
  events: QualityEvent[];
  file?: string;
  error?: string;
}

export interface QualitySummary {
  generatedAt: string;
  totals: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
    durationMs: number;
  };
  a11y: { checks: number; violations: number };
  uiux: { checks: number; violations: number; major: number; minor: number; info: number };
  lighthouse: { checks: number; passed: number; failed: number };
  failures: Array<{
    title: string;
    status: TestResult["status"];
    durationMs: number;
    file: string;
    error: string;
  }>;
  a11yEvents: A11yEvent[];
  uiuxEvents: UiuxEvent[];
  lighthouseEvents: LighthouseEvent[];
}

type Attachment = TestResult["attachments"][number];

function eventsFrom(attachments: readonly Attachment[]): QualityEvent[] {
  const events: QualityEvent[] = [];
  for (const attachment of attachments) {
    if (!attachment.name.startsWith("quality:") || !attachment.body) continue;
    events.push(parseEvent(JSON.parse(attachment.body.toString("utf8"))));
  }
  return events;
}

export function collect(testCase: TestCase, results: TestResult[]): Collected {
  if (testCase.results.length > results.length) {
    results = testCase.results;
  }
  if (results.length === 0) return { events: [], attempts: [] };

  const finalResult = results[results.length - 1];
  const attempts: AttemptRecord[] = results.slice(0, -1).map((result) => ({
    attempt: result.retry,
    status: result.status,
    events: eventsFrom(result.attachments),
  }));

  return {
    events: eventsFrom(finalResult.attachments),
    attempts,
  };
}

const isA11y = (event: QualityEvent): event is A11yEvent => event.kind === "a11y";
const isUiux = (event: QualityEvent): event is UiuxEvent => event.kind === "uiux";
const isLighthouse = (event: QualityEvent): event is LighthouseEvent =>
  event.kind === "lighthouse";

export function summarise(
  allTests: readonly SummarisableTest[],
  generatedAt = "",
): QualitySummary {
  const totals: QualitySummary["totals"] = {
    total: allTests.length,
    passed: 0,
    failed: 0,
    skipped: 0,
    flaky: 0,
    durationMs: 0,
  };
  const a11yEvents: A11yEvent[] = [];
  const uiuxEvents: UiuxEvent[] = [];
  const lighthouseEvents: LighthouseEvent[] = [];
  const failures: QualitySummary["failures"] = [];

  for (const test of allTests) {
    if (test.outcome === "expected") totals.passed += 1;
    if (test.outcome === "unexpected") totals.failed += 1;
    if (test.outcome === "skipped") totals.skipped += 1;
    if (test.outcome === "flaky") totals.flaky += 1;
    totals.durationMs += test.durationMs;

    if (test.outcome === "unexpected") {
      failures.push({
        title: test.title,
        status: test.status,
        durationMs: test.durationMs,
        file: test.file ?? "",
        error: test.error ?? "",
      });
    }

    for (const event of test.events) {
      if (isA11y(event)) a11yEvents.push(event);
      if (isUiux(event)) uiuxEvents.push(event);
      if (isLighthouse(event)) lighthouseEvents.push(event);
    }
  }

  return {
    generatedAt,
    totals,
    a11yEvents,
    uiuxEvents,
    lighthouseEvents,
    a11y: {
      checks: a11yEvents.length,
      violations: a11yEvents.reduce((sum, event) => sum + event.violationCount, 0),
    },
    uiux: {
      checks: uiuxEvents.filter((event) => event.event === "check").length,
      violations: uiuxEvents.filter((event) => event.event === "violation").length,
      major: uiuxEvents.filter((event) => event.severity === "major").length,
      minor: uiuxEvents.filter((event) => event.severity === "minor").length,
      info: uiuxEvents.filter((event) => event.severity === "info").length,
    },
    lighthouse: {
      checks: lighthouseEvents.length,
      passed: lighthouseEvents.filter((event) => event.passed).length,
      failed: lighthouseEvents.filter((event) => !event.passed).length,
    },
    failures,
  };
}
