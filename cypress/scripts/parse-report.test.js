const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { generateSummary } = require('./parse-report.js');

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value), 'utf8');
}

function createReports() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'parse-report-'));
  writeJson(path.join(root, 'mochawesome/report.json'), {
    stats: { tests: 1, passes: 1, failures: 0, pending: 0, skipped: 0, duration: 250 },
    results: [{ file: 'example.feature', suites: [{ tests: [] }] }],
  });
  writeJson(path.join(root, 'a11y/a11y-results.json'), { checks: [] });
  writeJson(path.join(root, 'lighthouse/lighthouse-results.json'), { checks: [] });
  writeJson(path.join(root, 'uiux/uiux-results.json'), { checks: [] });
  return root;
}

test('generates markdown from all report families', () => {
  const reportRoot = createReports();
  const outputPath = path.join(reportRoot, 'summary.md');

  generateSummary({ reportRoot, outputPath, now: new Date('2026-01-02T03:04:05.000Z') });

  const markdown = fs.readFileSync(outputPath, 'utf8');
  assert.match(markdown, /# Cypress Test Summary/);
  assert.match(markdown, /## Accessibility checks/);
  assert.match(markdown, /## Lighthouse Quality Report/);
  assert.match(markdown, /## UI\/UX Report Summary/);
  assert.match(markdown, /\*\*Generated At:\*\* 2026-01-02T03:04:05\.000Z/);
});

test('rejects malformed JSON input', () => {
  const reportRoot = createReports();
  fs.writeFileSync(path.join(reportRoot, 'a11y/a11y-results.json'), '{', 'utf8');

  assert.throws(
    () => generateSummary({ reportRoot, outputPath: path.join(reportRoot, 'summary.md') }),
    SyntaxError,
  );
});

test('rejects missing report input', () => {
  const reportRoot = createReports();
  fs.rmSync(path.join(reportRoot, 'lighthouse/lighthouse-results.json'));

  assert.throws(
    () => generateSummary({ reportRoot, outputPath: path.join(reportRoot, 'summary.md') }),
    { code: 'ENOENT' },
  );
});
