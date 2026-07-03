#!/usr/bin/env node
'use strict';

/**
 * Merge Istanbul-format coverage files and generate reports.
 *
 * Replaces `nyc merge` + `nyc report` from the old coverage:merge script.
 * Uses istanbul-lib-* packages directly (already transitive deps of
 * @vitest/coverage-v8), eliminating the nyc → @istanbuljs/load-nyc-config →
 * js-yaml dependency chain that required a CVE override.
 *
 * See: https://github.com/bcgov/nr-waste-plus/issues/954
 */

const path = require('path');
const fs = require('fs');
const { createCoverageMap } = require('istanbul-lib-coverage');
const { createContext } = require('istanbul-lib-report');
const reports = require('istanbul-reports');
const makeDir = require('make-dir');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const NYC_OUTPUT_DIR = path.resolve(PROJECT_ROOT, '.nyc_output');
const COVERAGE_DIR = path.resolve(PROJECT_ROOT, 'coverage');

async function main() {
  // 1. Copy unit coverage from vitest into .nyc_output so it gets merged
  await makeDir(NYC_OUTPUT_DIR);
  const unitCoveragePath = path.join(COVERAGE_DIR, 'coverage-final.json');
  if (fs.existsSync(unitCoveragePath)) {
    fs.copyFileSync(
      unitCoveragePath,
      path.join(NYC_OUTPUT_DIR, 'unit-coverage.json'),
    );
    console.info('Copied unit coverage to .nyc_output/unit-coverage.json');
  } else {
    console.warn(
      'Warning: %s not found — skipping unit coverage',
      unitCoveragePath,
    );
  }

  // 2. Read all coverage files from .nyc_output and merge
  const map = createCoverageMap({});
  const files = fs
    .readdirSync(NYC_OUTPUT_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'coverage.json');

  if (files.length === 0) {
    console.error('No coverage JSON files found in %s', NYC_OUTPUT_DIR);
    process.exit(1);
  }

  for (const file of files) {
    const filePath = path.join(NYC_OUTPUT_DIR, file);
    try {
      const report = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      map.merge(report);
    } catch (err) {
      console.warn('Warning: skipping %s — %s', file, err.message);
    }
  }

  // 3. Write merged coverage
  const mergedPath = path.join(NYC_OUTPUT_DIR, 'coverage.json');
  fs.writeFileSync(mergedPath, JSON.stringify(map, null, 2));
  console.info(
    'Coverage files in %s merged into %s',
    NYC_OUTPUT_DIR,
    mergedPath,
  );

  // 4. Generate lcov report (consumed by SonarQube)
  await makeDir(COVERAGE_DIR);
  const context = createContext({
    dir: COVERAGE_DIR,
    coverageMap: map,
  });

  reports
    .create('lcov', {
      skipEmpty: false,
      skipFull: false,
      projectRoot: PROJECT_ROOT,
    })
    .execute(context);

  reports
    .create('text-summary', {
      skipEmpty: false,
      skipFull: false,
      projectRoot: PROJECT_ROOT,
    })
    .execute(context);

  console.info('LCOV and text-summary reports generated in %s', COVERAGE_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
