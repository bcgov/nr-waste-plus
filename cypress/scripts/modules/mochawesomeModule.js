const fs = require('node:fs');
const path = require('node:path');

const FLAKY_SUMMARY_FILE = path.resolve(__dirname, '..', '..', 'reports', 'flaky', 'flaky-summary.json');

function readFlakyCount() {
  try {
    const content = fs.readFileSync(FLAKY_SUMMARY_FILE, 'utf8');
    const parsed = JSON.parse(content);
    return typeof parsed.flaky === 'number' ? parsed.flaky : 0;
  } catch {
    return 0;
  }
}

function mochawesomeToMarkdown(reports) {
  let total = 0, passed = 0, failed = 0, pending = 0, skipped = 0;
  let durationMs = 0;
  const failedTests = [];
  let flaky = readFlakyCount();

  for (const report of reports) {
    const stats = report.stats;
    total += stats.tests;
    passed += stats.passes;
    failed += stats.failures;
    pending += stats.pending;
    skipped += stats.skipped;
    durationMs += stats.duration;

    report.results.forEach(result => {
      result.suites.forEach(suite => {
        suite.tests.forEach(test => {
          if (test.fail) {
            failedTests.push({
              title: test.fullTitle,
              file: result.file,
              duration: test.duration,
              error: test.err?.message,
              screenshot: test.context?.screenshot,
              video: test.context?.video
            });
          }
        });
      });
    });
  }

  const duration = `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`;

  let md = `
`;

  if (failedTests.length > 0) {
    md += `## Other failed tests\n\n`;
    failedTests.forEach(t => {
      md += `- **${t.title}** (${t.file}) - ${t.duration}ms\n`;
      md += `  - ${t.error}\n`;
      if (t.screenshot) md += `  - 📸 ${t.screenshot}\n`;
      if (t.video) md += `  - 🎥 ${t.video}\n`;
      md += `\n`;
    });
  }

  return md;
}

function testSummaryToMarkdown(reports) {
  let total = 0, passed = 0, failed = 0, pending = 0, skipped = 0;
  let durationMs = 0;
  const failedTests = [];
  let flaky = readFlakyCount();

  for (const report of reports) {
    const stats = report.stats;
    total += stats.tests;
    passed += stats.passes;
    failed += stats.failures;
    pending += stats.pending;
    skipped += stats.skipped;
    durationMs += stats.duration;

    report.results.forEach(result => {
      result.suites.forEach(suite => {
        suite.tests.forEach(test => {
          if (test.fail) {
            failedTests.push({
              title: test.fullTitle,
              file: result.file,
              duration: test.duration,
              error: test.err?.message,
              screenshot: test.context?.screenshot,
              video: test.context?.video
            });
          }
        });
      });
    });
  }

  const duration = `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`;

  return `
| Metric | Value |
| --- | ---: |
| Total tests | ${total} |
| Passed | ${passed} |
| Failed | ${failed} |
| Pending | ${pending} |
| Skipped | ${skipped} |
| Duration | ${duration} |
${flaky > 0 ? `| Flaky (passed after retry) | ${flaky} |\n` : ""}`;
}

module.exports = {
  mochawesomeToMarkdown,
  testSummaryToMarkdown
};