const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_REPORT_DIR = path.resolve(__dirname, "..", "reports", "mochawesome");
const DEFAULT_OUTPUT_FILE = path.resolve(__dirname, "..", "summary.md");
const DEFAULT_A11Y_REPORT_FILE = path.resolve(
  __dirname,
  "..",
  "reports",
  "a11y",
  "a11y-results.json"
);
const REPORT_DIR = process.env.MOCHAWESOME_DIR || DEFAULT_REPORT_DIR;
const OUTPUT_FILE = process.env.GITHUB_SUMMARY_FILE || DEFAULT_OUTPUT_FILE;
const A11Y_REPORT_FILE = process.env.A11Y_REPORT_FILE || DEFAULT_A11Y_REPORT_FILE;

function getJsonFilesRecursively(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getJsonFilesRecursively(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(fullPath);
    }
  }

  return files;
}

function sanitize(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replaceAll(/\r?\n/g, " ").replaceAll(/\s+/g, " ").trim();
}

function collectTestsFromSuite(suite, acc) {
  if (!suite || typeof suite !== "object") {
    return;
  }

  if (Array.isArray(suite.tests)) {
    acc.push(...suite.tests);
  }

  if (Array.isArray(suite.suites)) {
    for (const childSuite of suite.suites) {
      collectTestsFromSuite(childSuite, acc);
    }
  }
}

function collectTestsFromResult(result, file) {
  const tests = [];

  if (Array.isArray(result.suites)) {
    for (const suite of result.suites) {
      if (Array.isArray(suite.tests)) {
        tests.push(
          ...suite.tests.map((test) => ({
            ...test,
            file: file || result.file || "unknown",
          }))
        );
      }
      collectTestsFromSuite(suite, tests);
    }
  }

  return tests;
}

function readMochawesomeData(jsonFiles) {
  const parsedRuns = [];

  for (const filePath of jsonFiles) {
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const json = JSON.parse(raw);
      parsedRuns.push(json);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      console.warn(`Skipping invalid JSON report: ${filePath} (${message})`);
    }
  }

  return parsedRuns;
}

function readA11yData(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.checks)) {
      return parsed.checks;
    }
    return [];
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.warn(`Skipping invalid accessibility report: ${filePath} (${message})`);
    return [];
  }
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

function createFailureRecord(test, file) {
  const resolvedFile = test.file || file;
  return {
    title: sanitize(test.fullTitle || test.title || "Unnamed test"),
    file: sanitize(resolvedFile),
    durationMs: Number(test.duration || 0),
    message: sanitize(test.err?.message || ""),
    screenshots: findScreenshotsForTest(test.title, resolvedFile),
    videos: findVideosForTest(resolvedFile),
  };
}

function collectFailedTestsFromSuite(suite, file, acc) {
  if (!suite || typeof suite !== "object") {
    return;
  }

  if (Array.isArray(suite.tests)) {
    for (const test of suite.tests) {
      if (test && (test.fail === true || test.state === "failed")) {
        acc.push(createFailureRecord(test, file));
      }
    }
  }

  if (Array.isArray(suite.suites)) {
    for (const childSuite of suite.suites) {
      collectFailedTestsFromSuite(childSuite, file, acc);
    }
  }
}

function collectFailedTestsFromResult(result, acc) {
  const file = result.file || result.fullFile || "unknown";
  if (!Array.isArray(result.suites)) {
    return;
  }

  for (const suite of result.suites) {
    collectFailedTestsFromSuite(suite, file, acc);
  }
}

function aggregateData(runs) {
  const totals = {
    tests: 0,
    passes: 0,
    failures: 0,
    pending: 0,
    skipped: 0,
    durationMs: 0,
  };

  const failedTests = [];

  for (const run of runs) {
    const stats = run.stats || {};
    totals.tests += Number(stats.tests || 0);
    totals.passes += Number(stats.passes || 0);
    totals.failures += Number(stats.failures || 0);
    totals.pending += Number(stats.pending || 0);
    totals.skipped += Number(stats.skipped || 0);
    totals.durationMs += Number(stats.duration || 0);

    const results = Array.isArray(run.results) ? run.results : [];
    for (const result of results) {
      collectFailedTestsFromResult(result, failedTests);
    }
  }

  return { totals, failedTests };
}

function findVideosForTest(featureFile) {
  const videoDir = path.resolve(__dirname, "..", "cypress", "videos");

  if (!fs.existsSync(videoDir)) {
    return [];
  }

  const videos = [];
  const featureName = path.basename(featureFile);

  try {
    const files = fs.readdirSync(videoDir);
    for (const file of files) {
      if (file.endsWith(".mp4") && file.includes(featureName)) {
        videos.push(path.join(videoDir, file));
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.warn(`Unable to read Cypress videos directory: ${videoDir} (${message})`);
  }

  return videos;
}

function findScreenshotsForTest(testTitle, featureFile) {
  const screenshotDir = path.resolve(__dirname, "..", "cypress", "screenshots");

  if (!fs.existsSync(screenshotDir)) {
    return [];
  }

  const screenshots = [];
  const featureName = path.basename(featureFile);

  try {
    const entries = fs.readdirSync(screenshotDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const featureDirPath = path.join(screenshotDir, entry.name);
      if (entry.name !== featureName) {
        continue;
      }

      const screenshotFiles = fs.readdirSync(featureDirPath);
      for (const file of screenshotFiles) {
        if (
          file.endsWith(".png") &&
          file.includes(" -- ") &&
          file.includes(testTitle) &&
          file.includes("(failed)")
        ) {
          screenshots.push(path.join(featureDirPath, file));
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.warn(`Unable to read Cypress screenshots directory: ${screenshotDir} (${message})`);
  }

  return screenshots;
}

function formatDuration(durationMs) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return "0s";
  }

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function formatFailureItem(failure) {
  let line = `- **${failure.title}**`;

  if (failure.file) {
    line += ` (${failure.file})`;
  }

  if (failure.durationMs > 0) {
    line += ` - ${formatDuration(failure.durationMs)}`;
  }

  if (failure.message) {
    line += `\n  - ${failure.message}`;
  }

  if (Array.isArray(failure.screenshots) && failure.screenshots.length > 0) {
    for (const screenshot of failure.screenshots) {
      const filename = path.basename(screenshot);
      const relativePath = path.relative(
        path.resolve(__dirname, ".."),
        screenshot
      );
      line += `\n  - 📸 [${filename}](${relativePath})`;
    }
  }

  if (Array.isArray(failure.videos) && failure.videos.length > 0) {
    for (const video of failure.videos) {
      const filename = path.basename(video);
      const relativePath = path.relative(
        path.resolve(__dirname, ".."),
        video
      );
      line += `\n  - 🎥 [${filename}](${relativePath})`;
    }
  }

  return `${line}\n`;
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

function createMarkdown({ reportCount, totals, failedTests, a11y }) {
  const status = totals.failures > 0 ? "❌ Failed" : "✅ Passed";
  const nowIso = new Date().toISOString();

  let markdown = "";
  markdown += "## Cypress Test Summary\n\n";
  markdown += `**Status:** ${status}  \n`;
  markdown += `**Reports Processed:** ${reportCount}  \n`;
  markdown += `**Generated At:** ${nowIso}  \n\n`;

  markdown += "| Metric | Value |\n";
  markdown += "| --- | ---: |\n";
  markdown += `| Total tests | ${totals.tests} |\n`;
  markdown += `| Passed | ${totals.passes} |\n`;
  markdown += `| Failed | ${totals.failures} |\n`;
  markdown += `| Pending | ${totals.pending} |\n`;
  markdown += `| Skipped | ${totals.skipped} |\n`;
  markdown += `| Duration | ${formatDuration(totals.durationMs)} |\n\n`;

  markdown += "### Accessibility checks\n\n";
  markdown += `- Checks executed: ${a11y.totals.checks}\n`;
  markdown += `- Total violations: ${a11y.totals.violations}\n\n`;

  if (a11y.topViolations.length > 0) {
    markdown += "### Top accessibility violations\n\n";
    for (const violation of a11y.topViolations) {
      markdown += formatA11yViolationItem(violation);
    }
    markdown += "\n";
  }

  if (failedTests.length > 0) {
    markdown += "### Failed tests\n\n";

    const maxFailures = 50;
    const displayedFailures = failedTests.slice(0, maxFailures);

    for (const failure of displayedFailures) {
      markdown += formatFailureItem(failure);
    }

    if (failedTests.length > maxFailures) {
      markdown += `\n_Only first ${maxFailures} failed tests are shown._\n`;
    }
  } else {
    markdown += "### Failed tests\n\n";
    markdown += "No failed tests 🎉\n";
  }

  return markdown;
}

function createFallbackMarkdown(reason) {
  const nowIso = new Date().toISOString();
  return [
    "## Cypress Test Summary",
    "",
    "**Status:** ⚠️ No report data",
    `**Generated At:** ${nowIso}`,
    "",
    reason,
    "",
    "Ensure Cypress ran with mochawesome JSON output enabled.",
    "Expected report directory: `reports/mochawesome`",
  ].join("\n");
}

function main() {
  const jsonFiles = getJsonFilesRecursively(REPORT_DIR);
  const a11yChecks = readA11yData(A11Y_REPORT_FILE);
  const a11y = aggregateA11yData(a11yChecks);

  if (jsonFiles.length === 0) {
    const markdown = createFallbackMarkdown(
      "No mochawesome JSON files were found after test execution."
    );
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, markdown, "utf8");
    console.log(`Markdown summary created: ${OUTPUT_FILE}`);
    return;
  }

  const runs = readMochawesomeData(jsonFiles);

  if (runs.length === 0) {
    const markdown = createFallbackMarkdown(
      "All mochawesome files were unreadable or invalid JSON."
    );
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, markdown, "utf8");
    console.log(`Markdown summary created: ${OUTPUT_FILE}`);
    return;
  }

  const aggregated = aggregateData(runs);
  const markdown = createMarkdown({
    reportCount: runs.length,
    totals: aggregated.totals,
    failedTests: aggregated.failedTests,
    a11y,
  });

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, markdown, "utf8");

  console.log(`Markdown summary created: ${OUTPUT_FILE}`);
}

main();
