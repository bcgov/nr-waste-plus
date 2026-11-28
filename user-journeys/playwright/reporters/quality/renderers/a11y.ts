import type { QualitySummary } from "../aggregate.ts";

interface RuleAggregate {
  id: string;
  impact: string;
  nodes: number;
  occurrences: number;
  help: string;
  helpUrl: string;
}

function aggregateRules(checks: QualitySummary["a11yEvents"]): RuleAggregate[] {
  const byRule = new Map<string, RuleAggregate>();

  for (const check of checks) {
    for (const violation of check.violations) {
      const id = violation.id || "unknown-rule";
      const impact = violation.impact || "unknown";
      const key = `${id}::${impact}`;
      const current = byRule.get(key);

      if (current) {
        current.nodes += violation.nodes;
        current.occurrences += 1;
      } else {
        byRule.set(key, {
          id,
          impact,
          nodes: violation.nodes,
          occurrences: 1,
          help: violation.help,
          helpUrl: violation.helpUrl,
        });
      }
    }
  }

  return [...byRule.values()]
    .sort(
      (left, right) =>
        right.nodes - left.nodes || right.occurrences - left.occurrences,
    )
    .slice(0, 10);
}

export function renderA11y(data: QualitySummary): string {
  if (data.a11yEvents.length === 0) {
    return "## Accessibility checks\n\nNo checks recorded";
  }

  const violationsCount = data.a11yEvents.reduce(
    (sum, check) => sum + check.violationCount,
    0,
  );
  const topViolations = aggregateRules(data.a11yEvents);
  const lines = [
    "## Accessibility checks",
    "",
    `- Checks executed: ${data.a11yEvents.length}`,
    `- Total violations: ${violationsCount}`,
    "",
  ];

  if (violationsCount > 0) {
    lines.push("### Accessibility test errors", "");
  }

  if (topViolations.length > 0) {
    lines.push("## Top accessibility violations", "");
    for (const violation of topViolations) {
      lines.push(
        `- **${violation.id}** (${violation.impact}) - ${violation.nodes} impacted node(s) across ${violation.occurrences} check(s)`,
      );
      if (violation.help) lines.push(`  - ${violation.help}`);
      if (violation.helpUrl) lines.push(`  - ${violation.helpUrl}`);
    }
  }

  return lines.join("\n").trimEnd();
}
