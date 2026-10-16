/**
 * npm-audit-allowlist.cjs
 *
 * Verifies npm audit failures against a reviewed, time-bound, folder-scoped allowlist
 * of known unpatched devDependency advisories.
 */
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const MAX_BUFFER = 50 * 1024 * 1024; // 50MB

function parseArgs(args = process.argv.slice(2)) {
  const options = {
    allowlistPath: path.resolve(__dirname, 'audit-allowlist.json'),
    folder: path.basename(process.cwd()),
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--allowlist' && args[i + 1]) {
      options.allowlistPath = path.resolve(process.cwd(), args[i + 1]);
      i++;
    } else if (args[i] === '--folder' && args[i + 1]) {
      options.folder = args[i + 1];
      i++;
    }
  }
  return options;
}

function validateAllowlistSchema(allowlist) {
  if (!Array.isArray(allowlist)) {
    throw new Error('Allowlist must be a JSON array of advisory objects.');
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const idRegex = /^GHSA-[\w-]+$/;

  for (let i = 0; i < allowlist.length; i++) {
    const entry = allowlist[i];
    const prefix = `Allowlist entry at index ${i}`;
    if (!entry || typeof entry !== 'object') {
      throw new Error(`${prefix} must be an object.`);
    }
    if (!entry.id || !idRegex.test(entry.id)) {
      throw new Error(`${prefix} missing or invalid "id" (must match GHSA format).`);
    }
    if (!entry.url || typeof entry.url !== 'string') {
      throw new Error(`${prefix} missing or invalid "url".`);
    }
    if (!entry.package || typeof entry.package !== 'string') {
      throw new Error(`${prefix} missing or invalid "package" name.`);
    }
    if (!entry.owner || typeof entry.owner !== 'string') {
      throw new Error(`${prefix} missing or invalid "owner".`);
    }
    if (!entry.reviewBy || !dateRegex.test(entry.reviewBy) || Number.isNaN(Date.parse(entry.reviewBy))) {
      throw new Error(`${prefix} (${entry.id}) missing or invalid "reviewBy" date (must be YYYY-MM-DD).`);
    }
    if (entry.folders !== undefined) {
      if (
        !Array.isArray(entry.folders) ||
        entry.folders.length === 0 ||
        !entry.folders.every(f => typeof f === 'string' && f.trim().length > 0)
      ) {
        throw new Error(`${prefix} (${entry.id}) "folders" must be a non-empty array of strings.`);
      }
    }
  }
}

function loadAllowlist(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Allowlist file not found at ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const allowlist = JSON.parse(content);
  validateAllowlistSchema(allowlist);
  return allowlist;
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

function validateProdAuditReport(prodReport, rawProdOutput) {
  if (!prodReport || typeof prodReport !== 'object') {
    throw new Error(`npm audit (prod) returned non-object response: ${String(rawProdOutput).slice(0, 500)}`);
  }
  if (prodReport.error) {
    const errorDetails = typeof prodReport.error === 'object' ? JSON.stringify(prodReport.error) : prodReport.error;
    throw new Error(`npm audit (prod) failed with registry/network error: ${errorDetails}`);
  }
  if (!prodReport.vulnerabilities || typeof prodReport.vulnerabilities !== 'object') {
    throw new Error('npm audit (prod) returned malformed report missing "vulnerabilities" object.');
  }

  const prodVulns = Object.entries(prodReport.vulnerabilities).filter(([_, v]) => {
    return v.severity === 'high' || v.severity === 'critical';
  });
  if (prodVulns.length > 0) {
    const names = prodVulns.map(([name, v]) => `${name} (${v.severity})`).join(', ');
    throw new Error(`Allowlist only applies to devDependencies, but high/critical vulnerabilities were found in production dependencies: ${names}`);
  }
}

function checkAllowlistExpirations(allowlist, currentDate = new Date(), currentFolder = null) {
  const todayStr = currentDate.toISOString().split('T')[0];
  const expired = [];
  for (const entry of allowlist) {
    if (entry.folders && currentFolder && !entry.folders.includes(currentFolder)) {
      continue;
    }
    if (entry.reviewBy < todayStr) {
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

function evaluateAudit(report, allowlist, currentFolder = null) {
  const vulns = report.vulnerabilities || {};
  const allowlistMap = new Map();
  for (const entry of allowlist) {
    if (entry.folders && currentFolder && !entry.folders.includes(currentFolder)) {
      continue;
    }
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
        if (item.url) {
          keys.push(item.url);
          const ghsaMatch = item.url.match(/GHSA-[\w-]+/);
          if (ghsaMatch) keys.push(ghsaMatch[0]);
        }
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

    // Every single advisory key must be present in the active allowlist map
    const allAllowlisted = keys.every(key => allowlistMap.has(key));
    if (!allAllowlisted) {
      const unlisted = keys.filter(key => !allowlistMap.has(key));
      unhandled.push({ name, severity: v.severity, unlistedKeys: unlisted });
    } else {
      for (const key of keys) {
        const entry = allowlistMap.get(key);
        matchedEntries.set(entry.id || entry.url, entry);
      }
    }
  }

  return {
    ok: unhandled.length === 0 && matchedEntries.size > 0,
    unhandled,
    matchedEntries: Array.from(matchedEntries.values()),
  };
}

function run(overrides = {}) {
  const options = overrides.args ? parseArgs(overrides.args) : parseArgs();
  const exec = overrides.execSync || execSync;
  const allowlist = overrides.allowlist || loadAllowlist(options.allowlistPath);
  const logger = overrides.logger || console;

  logger.log(`Loading audit allowlist from: ${options.allowlistPath} (folder: ${options.folder})`);

  // 1. Check if any allowlisted entry has expired
  checkAllowlistExpirations(allowlist, overrides.currentDate || new Date(), options.folder);

  // 2. Run npm audit for all dependencies
  logger.log('Running npm audit --package-lock-only --json...');
  let rawAuditOutput = '';
  try {
    rawAuditOutput = exec('npm audit --package-lock-only --json', {
      encoding: 'utf8',
      maxBuffer: MAX_BUFFER,
    });
  } catch (err) {
    rawAuditOutput = err.stdout || '';
    if (!rawAuditOutput && err.stderr) {
      logger.error(err.stderr);
    }
  }

  let fullReport;
  try {
    fullReport = JSON.parse(rawAuditOutput);
  } catch (e) {
    throw new Error(`Failed to parse npm audit JSON output: ${e.message}\nRaw output: ${rawAuditOutput.slice(0, 500)}`);
  }

  validateAuditReport(fullReport, rawAuditOutput);

  // 3. Confirm production dependencies are 100% clean of high/critical vulnerabilities (fails closed)
  logger.log('Checking production dependencies with npm audit --package-lock-only --omit=dev --json...');
  let rawProdOutput = '';
  try {
    rawProdOutput = exec('npm audit --package-lock-only --omit=dev --json', {
      encoding: 'utf8',
      maxBuffer: MAX_BUFFER,
    });
  } catch (err) {
    rawProdOutput = err.stdout || '';
    if (!rawProdOutput && err.stderr) {
      throw new Error(`npm audit (prod) command execution failed: ${err.stderr}`);
    }
  }

  if (!rawProdOutput || !rawProdOutput.trim()) {
    throw new Error('npm audit (prod) produced empty output. Cannot verify production cleanliness.');
  }

  let prodReport;
  try {
    prodReport = JSON.parse(rawProdOutput);
  } catch (e) {
    throw new Error(`Failed to parse npm audit (prod) JSON output: ${e.message}\nRaw output: ${rawProdOutput.slice(0, 500)}`);
  }

  validateProdAuditReport(prodReport, rawProdOutput);

  // 4. Evaluate against allowlist
  const { ok, unhandled, matchedEntries } = evaluateAudit(fullReport, allowlist, options.folder);

  if (!ok || unhandled.length > 0) {
    logger.error('\n✖ Audit failed with unhandled high/critical vulnerabilities:');
    for (const u of unhandled) {
      const keysInfo = u.unlistedKeys ? ` [Unlisted advisories: ${u.unlistedKeys.join(', ')}]` : '';
      logger.error(`  - ${u.name} (${u.severity})${keysInfo}`);
    }
    if (overrides.onExit) {
      overrides.onExit(1);
      return;
    }
    process.exit(1);
  }

  // 5. Emit GitHub Actions warnings so allowlisted items remain visible on every CI run
  logger.log('\n✔ All reported high/critical vulnerabilities matched the active allowlist:');
  for (const entry of matchedEntries) {
    const warningMsg = `Active audit allowlist entry matched: ${entry.id} (${entry.package}). Review by: ${entry.reviewBy}. Tracking: ${entry.trackingIssue}`;
    logger.log(`::warning::${warningMsg}`);
    logger.log(`  - [${entry.id}] ${entry.package}: ${entry.url} (Review by: ${entry.reviewBy})`);
  }
  logger.log('\nProduction dependencies verified clean. Audit passed with allowlist.');
  if (overrides.onExit) {
    overrides.onExit(0);
  }
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
  validateAllowlistSchema,
  validateAuditReport,
  validateProdAuditReport,
  checkAllowlistExpirations,
  evaluateAudit,
  run,
};
