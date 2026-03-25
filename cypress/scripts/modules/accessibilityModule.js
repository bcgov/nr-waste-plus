function accessibilityToMarkdown(data) {
const a11y = aggregateA11yData(data.checks);
  let md = `## Accessibility checks

- Checks executed: ${a11y.totals.checks}
- Total violations: ${a11y.totals.violations}
`;

if(a11y.totals.violations > 0) {
  md += `
### Accessibility test errors
`
}

if (a11y.topViolations.length > 0) {
    md += "## Top accessibility violations\n\n";
    for (const violation of a11y.topViolations) {
      md += formatA11yViolationItem(violation);
    }
    md += "\n";
  }

  return md;
}

function aggregateA11yData(checks) {
  const totals = {
    checks: 0,
    violations: 0,
  };

  const byRule = new Map();

  for (const check of checks) {
    totals.checks += 1;
    totals.violations += Number(check?.violationCount || 0);

    const violations = Array.isArray(check?.violations) ? check.violations : [];
    for (const violation of violations) {
      const id = sanitize(violation?.id || "unknown-rule");
      const impact = sanitize(violation?.impact || "unknown");
      const nodes = Number(violation?.nodes || 0);
      const help = sanitize(violation?.help || "");
      const helpUrl = sanitize(violation?.helpUrl || "");
      const key = `${id}::${impact}`;

      if (!byRule.has(key)) {
        byRule.set(key, {
          id,
          impact,
          nodes: 0,
          occurrences: 0,
          help,
          helpUrl,
        });
      }

      const current = byRule.get(key);
      current.nodes += nodes;
      current.occurrences += 1;
    }
  }

  const topViolations = Array.from(byRule.values())
    .sort((left, right) => right.nodes - left.nodes || right.occurrences - left.occurrences)
    .slice(0, 10);

  return {
    totals,
    topViolations,
  };
}

function formatA11yViolationItem(violation) {
  let line = `- **${violation.id}** (${violation.impact}) - ${violation.nodes} impacted node(s) across ${violation.occurrences} check(s)`;

  if (violation.help) {
    line += `\n  - ${violation.help}`;
  }

  if (violation.helpUrl) {
    line += `\n  - ${violation.helpUrl}`;
  }

  return `${line}\n`;
}

module.exports = {
  accessibilityToMarkdown,
};