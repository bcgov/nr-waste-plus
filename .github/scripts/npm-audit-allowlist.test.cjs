const assert = require('node:assert/strict');
const test = require('node:test');
const {
  validateAllowlistSchema,
  validateAuditReport,
  validateProdAuditReport,
  checkAllowlistExpirations,
  evaluateAudit,
} = require('./npm-audit-allowlist.cjs');

test('validateAllowlistSchema enforces required fields and format', () => {
  assert.throws(() => validateAllowlistSchema(null), /must be a JSON array/);
  assert.throws(() => validateAllowlistSchema([{}]), /missing or invalid "id"/);
  assert.throws(() => validateAllowlistSchema([{ id: 'INVALID' }]), /missing or invalid "id"/);
  assert.throws(
    () => validateAllowlistSchema([{ id: 'GHSA-vfj7-8cjw-p6xm' }]),
    /missing or invalid "url"/
  );
  assert.throws(
    () => validateAllowlistSchema([{ id: 'GHSA-vfj7-8cjw-p6xm', url: 'https://example.com' }]),
    /missing or invalid "package"/
  );
  assert.throws(
    () => validateAllowlistSchema([{ id: 'GHSA-vfj7-8cjw-p6xm', url: 'https://example.com', package: 'braces' }]),
    /missing or invalid "owner"/
  );
  assert.throws(
    () =>
      validateAllowlistSchema([
        {
          id: 'GHSA-vfj7-8cjw-p6xm',
          url: 'https://example.com',
          package: 'braces',
          owner: 'Team',
        },
      ]),
    /missing or invalid "reviewBy"/
  );
  assert.throws(
    () =>
      validateAllowlistSchema([
        {
          id: 'GHSA-vfj7-8cjw-p6xm',
          url: 'https://example.com',
          package: 'braces',
          owner: 'Team',
          reviewBy: 'invalid-date',
        },
      ]),
    /missing or invalid "reviewBy"/
  );
  assert.throws(
    () =>
      validateAllowlistSchema([
        {
          id: 'GHSA-vfj7-8cjw-p6xm',
          url: 'https://example.com',
          package: 'braces',
          owner: 'Team',
          reviewBy: '2026-12-01',
          folders: 'not-an-array',
        },
      ]),
    /"folders" must be an array/
  );

  // Valid schema passes without error
  assert.doesNotThrow(() =>
    validateAllowlistSchema([
      {
        id: 'GHSA-vfj7-8cjw-p6xm',
        url: 'https://example.com',
        package: 'braces',
        owner: 'Team Alliance',
        reviewBy: '2026-12-01',
        folders: ['frontend'],
      },
    ])
  );
});

test('validateAuditReport rejects invalid reports', () => {
  assert.throws(() => validateAuditReport(null), /non-object/);
  assert.throws(() => validateAuditReport('string'), /non-object/);
  assert.throws(() => validateAuditReport({ error: { code: 'ENOTFOUND' } }), /registry\/network error/);
  assert.throws(() => validateAuditReport({}), /missing "vulnerabilities" object/);
  assert.throws(() => validateAuditReport({ vulnerabilities: {} }), /reported 0 vulnerabilities/);

  // Valid report does not throw
  assert.doesNotThrow(() => validateAuditReport({ vulnerabilities: { braces: {} } }));
});

test('validateProdAuditReport ensures zero high/critical vulns in prod and fails closed on error', () => {
  // Empty or low/moderate prod vulns should pass
  assert.doesNotThrow(() => validateProdAuditReport({ vulnerabilities: {} }));
  assert.doesNotThrow(() => validateProdAuditReport({ vulnerabilities: { foo: { severity: 'low' } } }));

  // Network/registry error in prod report must throw
  assert.throws(
    () => validateProdAuditReport({ error: { code: 'ENOTFOUND' } }),
    /registry\/network error/
  );
  assert.throws(
    () => validateProdAuditReport(null),
    /non-object/
  );
  assert.throws(
    () => validateProdAuditReport({}),
    /missing "vulnerabilities" object/
  );

  // High or critical prod vulns must throw
  assert.throws(
    () => validateProdAuditReport({ vulnerabilities: { braces: { severity: 'high' } } }),
    /Allowlist only applies to devDependencies/
  );
  assert.throws(
    () => validateProdAuditReport({ vulnerabilities: { braces: { severity: 'critical' } } }),
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

  // Expired in another folder does not trigger failure if scoped
  const scopedExpiredAllowlist = [
    { id: 'GHSA-vfj7-8cjw-p6xm', package: 'braces', reviewBy: '2026-09-01', folders: ['frontend'] },
  ];
  assert.doesNotThrow(() => checkAllowlistExpirations(scopedExpiredAllowlist, new Date('2026-10-16'), 'cypress'));
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

test('evaluateAudit rejects mixed advisories on a single package (must be ALL, not ANY)', () => {
  const allowlist = [
    {
      id: 'GHSA-vfj7-8cjw-p6xm',
      url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
      package: 'braces',
    },
  ];

  // Package has both allowlisted and an unlisted advisory in via
  const mixedReport = {
    vulnerabilities: {
      braces: {
        name: 'braces',
        severity: 'high',
        via: [
          {
            url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
            name: 'braces',
          },
          {
            url: 'https://github.com/advisories/GHSA-unlisted-secondary',
            name: 'braces',
          },
        ],
      },
    },
  };

  const result = evaluateAudit(mixedReport, allowlist);
  assert.equal(result.ok, false);
  assert.equal(result.unhandled.length, 1);
  assert.equal(result.unhandled[0].name, 'braces');
  assert.ok(result.unhandled[0].unlistedKeys.includes('https://github.com/advisories/GHSA-unlisted-secondary'));
});

test('evaluateAudit respects folder scoping', () => {
  const allowlist = [
    {
      id: 'GHSA-vfj7-8cjw-p6xm',
      url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
      package: 'braces',
      folders: ['frontend'],
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
    },
  };

  // Matches in frontend
  const feResult = evaluateAudit(report, allowlist, 'frontend');
  assert.equal(feResult.ok, true);

  // Fails in cypress because allowlist entry is scoped to frontend
  const cyResult = evaluateAudit(report, allowlist, 'cypress');
  assert.equal(cyResult.ok, false);
  assert.equal(cyResult.unhandled.length, 1);
});
