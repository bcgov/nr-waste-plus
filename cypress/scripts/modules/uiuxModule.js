function uiuxToMarkdown(data) {

  const totals = calculateTotals(data.checks);
  const byFeature = groupBy(data.checks, e => e.feature);

  let md = `## UI/UX Report Summary

Checks executed: ${data.checks.length} | Total violations: ${data.checks.filter(check => check.event === 'violation').length}

### 📊 Summary Totals

| Category | Count |
| ---------- | ------- |
| ✔️ Checks Passed | ${totals.passed} |
| ❌ Violations | ${totals.violations} |
| 🔥 Major | ${totals.major} |
| ⚠️ Minor | ${totals.minor} |
| ℹ️ Info | ${totals.info} |`;

  for (const [feature, featureEvents] of Object.entries(byFeature)) {
    const byScenario = groupBy(featureEvents, e => e.scenario);
    for (const [scenario, scenarioEvents] of Object.entries(byScenario)) {
      const checks = scenarioEvents.filter(e => e.event === "check");
      const violations = scenarioEvents.filter(e => e.event === "violation");
      
      md += `\n\n### 🎯 Scenario: **${scenario}**\n\n`;
      md += `| Status | Severity | Taxonomy | Property | Expected | Actual | Element |\n`;
      md += `| ------ | ---------- | ---------- | ---------- | ---------- | -------- | --------- |\n`;
  
      for (const e of checks) {
        md += generateMarkdowRowSummary(false, e);
      }

      for (const e of violations) {
        md += generateMarkdowRowSummary(true, e);
      }

      md += `\n---`;
    
    }

  }

  return md;
}

function generateMarkdowRowSummary(violation, entry) {
  return `| ${violation ? '❌ Violation' : '✔️ Passed'} | ${entry.severity || ''} | ${entry.taxonomy} | ${entry.property} | ${entry.expected} | ${entry.actual} | ${entry.element}:${entry.selector} |\n`;
}

function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

function calculateTotals(events) {
  return {
    passed: events.filter(e => e.event === "check").length,
    violations: events.filter(e => e.event === "violation").length,
    major: events.filter(e => e.severity === "major").length,
    minor: events.filter(e => e.severity === "minor").length,
    info: events.filter(e => e.severity === "info").length,
  };
}

module.exports = {
  uiuxToMarkdown
};