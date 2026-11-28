import type { QualitySummary } from "../aggregate.ts";
import type { UiuxEvent } from "../schema.ts";

function groupBy<T>(events: readonly T[], keyOf: (event: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const event of events) {
    const key = keyOf(event);
    const group = groups.get(key) ?? [];
    group.push(event);
    groups.set(key, group);
  }
  return groups;
}

function row(violation: boolean, event: UiuxEvent): string {
  const status = violation ? "❌ Violation" : "✔️ Passed";
  return `| ${status} | ${event.severity ?? ""} | ${event.taxonomy} | ${event.property} | ${event.expected} | ${event.actual} | ${event.element}:${event.selector ?? ""} |\n`;
}

export function renderUiux(data: QualitySummary): string {
  const events = data.uiuxEvents;
  if (events.length === 0) {
    return "## UI/UX Report Summary\n\nNo checks recorded";
  }

  const lines = [
    "## UI/UX Report Summary",
    "",
    `Checks executed: ${events.length} | Total violations: ${events.filter((event) => event.event === "violation").length}`,
    "",
    "### 📊 Summary Totals",
    "",
    "| Category | Count |",
    "| ---------- | ------- |",
    `| ✔️ Checks Passed | ${data.uiux.checks} |`,
    `| ❌ Violations | ${data.uiux.violations} |`,
    `| 🔥 Major | ${data.uiux.major} |`,
    `| ⚠️ Minor | ${data.uiux.minor} |`,
    `| ℹ️ Info | ${data.uiux.info} |`,
  ];

  for (const [, featureEvents] of groupBy(events, (event) => event.feature)) {
    for (const [, scenarioEvents] of groupBy(
      featureEvents,
      (event) => event.scenario,
    )) {
      lines.push("", `#### 🎯 Scenario: **${scenarioEvents[0].scenario}**`, "");
      lines.push("| Status | Severity | Taxonomy | Property | Expected | Actual | Element |");
      lines.push("| ------ | ---------- | ---------- | ---------- | ---------- | -------- | --------- |");
      for (const event of scenarioEvents.filter((e) => e.event === "check")) {
        lines.push(row(false, event).replace(/\n$/, ""));
      }
      for (const event of scenarioEvents.filter((e) => e.event === "violation")) {
        lines.push(row(true, event).replace(/\n$/, ""));
      }
      lines.push("", "---");
    }
  }

  return lines.join("\n");
}
