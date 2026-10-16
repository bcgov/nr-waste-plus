const assert = require('node:assert/strict');
const test = require('node:test');
const {
  validateAuditReport,
  verifyProductionCleanliness,
  checkAllowlistExpirations,
  evaluateAudit,
} = require('./npm-audit-allowlist.cjs');

test('validateAuditReport rejects invalid reports', () => {
  assert.throws(() => validateAuditReport(null), /non-object/);
  assert.throws(() => validateAuditReport('string'), /non-object/);
  assert.throws(() => validateAuditReport({ error: { code: 'ENOTFOUND' } }), /registry\/network error/);
  assert.throws(() => validateAuditReport({}), /missing "vulnerabilities" object/);
  assert.throws(() => validateAuditReport({ vulnerabilities: {} }), /reported 0 vulnerabilities/);

  // Valid report does not throw
  assert.doesNotThrow(() => validateAuditReport({ vulnerabilities: { braces: {} } }));
});

test('verifyProductionCleanliness ensures zero high/critical vulns in prod', () => {
  // Empty or low/moderate prod vulns should pass
  assert.doesNotThrow(() => verifyProductionCleanliness({ vulnerabilities: {} }));
  assert.doesNotThrow(() => verifyProductionCleanliness({ vulnerabilities: { foo: { severity: 'low' } } }));

  // High or critical prod vulns must throw
  assert.throws(
    () => verifyProductionCleanliness({ vulnerabilities: { braces: { severity: 'high' } } }),
    /Allowlist only applies to devDependencies/
  );
  assert.throws(
    () => verifyProductionCleanliness({ vulnerabilities: { braces: { severity: 'critical' } } }),
    /Allowlist only applies to devDependencies/
  );
});

test('checkAllowlistExpirations rejects expired reviewBy dates', () => {
  const futureAllowlist = [
    { id: 'GHSA-vfj7-8cjw-p6xm', package: 'braces', reviewBy: '2099-01-01' },
  ];
  assert.doesNotThrow(() => checkAllowlistExpirations(futureAllowlist, new Date('2026-10-16')));

  const expiredAllowlist = [
    { id: 'GHSA-vfj7-8cjw-p6xm', package: 'braces', reviewBy: '2026-09-01', trackingIssue: 'https://example.com' },
  ];
  assert.throws(
    () => checkAllowlistExpirations(expiredAllowlist, new Date('2026-10-16')),
    /expired and require re-evaluation/
  );
});

test('evaluateAudit matches allowlisted advisories and catches unhandled ones', () => {
  const allowlist = [
    {
      id: 'GHSA-vfj7-8cjw-p6xm',
      url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
      package: 'braces',
    },
  ];

  const report = {
    vulnerabilities: {
      braces: {
        name: 'braces',
        severity: 'high',
        via: [
          {
            url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
            name: 'braces',
          },
        ],
      },
      micromatch: {
        name: 'micromatch',
        severity: 'high',
        via: ['braces'],
      },
      stylelint: {
        name: 'stylelint',
        severity: 'high',
        via: ['micromatch'],
      },
    },
  };

  const result = evaluateAudit(report, allowlist);
  assert.equal(result.ok, true);
  assert.equal(result.unhandled.length, 0);
  assert.equal(result.matchedEntries.length, 1);
  assert.equal(result.matchedEntries[0].id, 'GHSA-vfj7-8cjw-p6xm');
});

test('evaluateAudit flags unhandled vulnerabilities', () => {
  const allowlist = [
    {
      id: 'GHSA-vfj7-8cjw-p6xm',
      url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
      package: 'braces',
    },
  ];

  const report = {
    vulnerabilities: {
      braces: {
        name: 'braces',
        severity: 'high',
        via: [
          {
            url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
            name: 'braces',
          },
        ],
      },
      otherVuln: {
        name: 'otherVuln',
        severity: 'critical',
        via: [
          {
            url: 'https://github.com/advisories/GHSA-other',
            name: 'otherVuln',
          },
        ],
      },
    },
  };

  const result = evaluateAudit(report, allowlist);
  assert.equal(result.ok, false);
  assert.equal(result.unhandled.length, 1);
  assert.equal(result.unhandled[0].name, 'otherVuln');
});
