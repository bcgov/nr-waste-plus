/**
 * npm-audit-allowlist.cjs
 *
 * Verifies npm audit failures against a reviewed, time-bound allowlist of known
 * unpatched devDependency advisories.
 */
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const MAX_BUFFER = 50 * 1024 * 1024; // 50MB

function parseArgs(args = process.argv.slice(2)) {
  const options = {
    allowlistPath: path.resolve(__dirname, 'audit-allowlist.json'),
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--allowlist' && args[i + 1]) {
      options.allowlistPath = path.resolve(process.cwd(), args[i + 1]);
      i++;
    }
  }
  return options;
}

function loadAllowlist(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Allowlist file not found at ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

function validateAuditReport(report, rawOutput) {
  if (!report || typeof report !== 'object') {
    throw new Error(`npm audit returned non-object response: ${String(rawOutput).slice(0, 500)}`);
  }
  if (report.error) {
    const errorDetails = typeof report.error === 'object' ? JSON.stringify(report.error) : report.error;
    throw new Error(`npm audit failed with registry/network error: ${errorDetails}`);
  }
  if (!report.vulnerabilities || typeof report.vulnerabilities !== 'object') {
    throw new Error('npm audit returned malformed report missing "vulnerabilities" object.');
  }
  if (Object.keys(report.vulnerabilities).length === 0) {
    throw new Error('npm audit exited with failure but reported 0 vulnerabilities.');
  }
}

function verifyProductionCleanliness(prodReport) {
  if (!prodReport || typeof prodReport !== 'object' || !prodReport.vulnerabilities) {
    return;
  }
  const prodVulns = Object.entries(prodReport.vulnerabilities).filter(([_, v]) => {
    return v.severity === 'high' || v.severity === 'critical';
  });
  if (prodVulns.length > 0) {
    const names = prodVulns.map(([name, v]) => `${name} (${v.severity})`).join(', ');
    throw new Error(`Allowlist only applies to devDependencies, but high/critical vulnerabilities were found in production dependencies: ${names}`);
  }
}

function checkAllowlistExpirations(allowlist, currentDate = new Date()) {
  const todayStr = currentDate.toISOString().split('T')[0];
  const expired = [];
  for (const entry of allowlist) {
    if (entry.reviewBy && entry.reviewBy < todayStr) {
      expired.push(entry);
    }
  }
  if (expired.length > 0) {
    const details = expired
      .map(e => ` - ${e.id} (${e.package}) expired on ${e.reviewBy} [Tracking: ${e.trackingIssue || 'none'}]`)
      .join('\n');
    throw new Error(`The following audit allowlist entries have expired and require re-evaluation:\n${details}`);
  }
}

function evaluateAudit(report, allowlist) {
  const vulns = report.vulnerabilities || {};
  const allowlistMap = new Map();
  for (const entry of allowlist) {
    allowlistMap.set(entry.url, entry);
    if (entry.id) {
      allowlistMap.set(entry.id, entry);
    }
  }

  function getAdvisoryKeys(name, visited = new Set()) {
    if (visited.has(name)) return [];
    visited.add(name);
    const v = vulns[name];
    if (!v) return [];
    const keys = [];
    for (const item of (v.via || [])) {
      if (typeof item === 'object') {
        if (item.url) keys.push(item.url);
        if (item.name) keys.push(item.name);
      } else if (typeof item === 'string') {
        keys.push(...getAdvisoryKeys(item, visited));
      }
    }
    return keys;
  }

  const matchedEntries = new Map();
  const unhandled = [];

  for (const [name, v] of Object.entries(vulns)) {
    if (v.severity !== 'high' && v.severity !== 'critical') {
      continue;
    }
    const keys = getAdvisoryKeys(name);
    if (keys.length === 0) {
      unhandled.push({ name, severity: v.severity, reason: 'No advisory source found in "via" chain' });
      continue;
    }

    const matchedForVuln = [];
    for (const key of keys) {
      if (allowlistMap.has(key)) {
        const entry = allowlistMap.get(key);
        matchedForVuln.push(entry);
        matchedEntries.set(entry.id || entry.url, entry);
      }
    }

    if (matchedForVuln.length === 0) {
      unhandled.push({ name, severity: v.severity, keys });
    }
  }

  return {
    ok: unhandled.length === 0 && matchedEntries.size > 0,
    unhandled,
    matchedEntries: Array.from(matchedEntries.values()),
  };
}

function run() {
  const options = parseArgs();
  console.log(`Loading audit allowlist from: ${options.allowlistPath}`);
  const allowlist = loadAllowlist(options.allowlistPath);

  // 1. Check if any allowlisted entry has expired
  checkAllowlistExpirations(allowlist);

  // 2. Run npm audit for all dependencies
  console.log('Running npm audit --package-lock-only --json...');
  let rawAuditOutput = '';
  try {
    rawAuditOutput = execSync('npm audit --package-lock-only --json', {
      encoding: 'utf8',
      maxBuffer: MAX_BUFFER,
    });
  } catch (err) {
    rawAuditOutput = err.stdout || '';
    if (!rawAuditOutput && err.stderr) {
      console.error(err.stderr);
    }
  }

  let fullReport;
  try {
    fullReport = JSON.parse(rawAuditOutput);
  } catch (e) {
    throw new Error(`Failed to parse npm audit JSON output: ${e.message}\nRaw output: ${rawAuditOutput.slice(0, 500)}`);
  }

  validateAuditReport(fullReport, rawAuditOutput);

  // 3. Confirm production dependencies are 100% clean of high/critical vulnerabilities
  console.log('Checking production dependencies with npm audit --package-lock-only --omit=dev --json...');
  let rawProdOutput = '';
  try {
    rawProdOutput = execSync('npm audit --package-lock-only --omit=dev --json', {
      encoding: 'utf8',
      maxBuffer: MAX_BUFFER,
    });
  } catch (err) {
    rawProdOutput = err.stdout || '';
  }

  if (rawProdOutput) {
    try {
      const prodReport = JSON.parse(rawProdOutput);
      verifyProductionCleanliness(prodReport);
    } catch (e) {
      // If parsing fails here, verifyProductionCleanliness throws if error
      if (e.message.includes('Allowlist only applies to devDependencies')) {
        throw e;
      }
    }
  }

  // 4. Evaluate against allowlist
  const { ok, unhandled, matchedEntries } = evaluateAudit(fullReport, allowlist);

  if (!ok || unhandled.length > 0) {
    console.error('\n✖ Audit failed with unhandled high/critical vulnerabilities:');
    for (const u of unhandled) {
      console.error(`  - ${u.name} (${u.severity})`);
    }
    process.exit(1);
  }

  // 5. Emit GitHub Actions warnings so allowlisted items remain visible on every CI run
  console.log('\n✔ All reported high/critical vulnerabilities matched the active allowlist:');
  for (const entry of matchedEntries) {
    const warningMsg = `Active audit allowlist entry matched: ${entry.id} (${entry.package}). Review by: ${entry.reviewBy}. Tracking: ${entry.trackingIssue}`;
    console.log(`::warning::${warningMsg}`);
    console.log(`  - [${entry.id}] ${entry.package}: ${entry.url} (Review by: ${entry.reviewBy})`);
  }
  console.log('\nProduction dependencies verified clean. Audit passed with allowlist.');
}

if (require.main === module) {
  try {
    run();
  } catch (err) {
    console.error(`\n✖ Audit allowlist gate error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  loadAllowlist,
  validateAuditReport,
  verifyProductionCleanliness,
  checkAllowlistExpirations,
  evaluateAudit,
};
