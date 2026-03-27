function mochawesomeToMarkdown(reports) {
  let total = 0, passed = 0, failed = 0, pending = 0, skipped = 0;
  let durationMs = 0;
  const failedTests = [];

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
`;
}

module.exports = {
  mochawesomeToMarkdown,
  testSummaryToMarkdown
};