import type { QualitySummary } from "../aggregate.ts";

export function formatDuration(durationMs: number): string {
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function renderSummary(data: QualitySummary): string {
  const { totals, generatedAt } = data;

  return [
    "# Test Summary",
    "",
    `**Generated At:** ${generatedAt}`,
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    `| Total tests | ${totals.total} |`,
    `| Passed | ${totals.passed} |`,
    `| Failed | ${totals.failed} |`,
    `| Skipped | ${totals.skipped} |`,
    `| Flaky (passed after retry) | ${totals.flaky} |`,
    `| Duration | ${formatDuration(totals.durationMs)} |`,
  ].join("\n");
}
