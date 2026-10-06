const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const scriptPath = path.join(__dirname, 'merge-coverage.cjs');

function coverageFile() {
  return {
    '/tmp/example.js': {
      path: '/tmp/example.js',
      statementMap: { '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } } },
      fnMap: {},
      branchMap: {},
      s: { '0': 1 },
      f: {},
      b: {},
    },
  };
}

function runMerge({ coverageFiles = {}, includeUnit = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'merge-coverage-'));
  const nycOutput = path.join(root, '.nyc_output');
  const coverage = path.join(root, 'coverage');
  fs.mkdirSync(nycOutput, { recursive: true });
  fs.mkdirSync(coverage, { recursive: true });
  if (includeUnit) {
    fs.writeFileSync(path.join(coverage, 'coverage-final.json'), JSON.stringify(coverageFile()));
  }
  for (const [name, value] of Object.entries(coverageFiles)) {
    fs.writeFileSync(path.join(nycOutput, name), value);
  }
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: path.dirname(scriptPath),
    env: { ...process.env, NYC_OUTPUT_DIR: nycOutput, COVERAGE_DIR: coverage },
    encoding: 'utf8',
  });
  return { root, nycOutput, coverage, result };
}

test('merges coverage and generates coverage outputs', () => {
  const run = runMerge({ includeUnit: true });

  assert.equal(run.result.status, 0, run.result.stderr);
  assert.ok(fs.existsSync(path.join(run.nycOutput, 'coverage.json')));
  assert.ok(fs.existsSync(path.join(run.coverage, 'lcov.info')));
  assert.match(fs.readFileSync(path.join(run.coverage, 'lcov.info'), 'utf8'), /SF:/);
});

test('skips malformed JSON while merging valid coverage', () => {
  const run = runMerge({
    coverageFiles: {
      'valid.json': JSON.stringify(coverageFile()),
      'malformed.json': '{',
    },
  });

  assert.equal(run.result.status, 0, run.result.stderr);
  assert.match(run.result.stderr, /skipping malformed\.json/);
  assert.ok(fs.existsSync(path.join(run.nycOutput, 'coverage.json')));
});

test('fails when no coverage JSON files are available', () => {
  const run = runMerge();

  assert.equal(run.result.status, 1);
  assert.match(run.result.stderr, /No coverage JSON files found/);
});
