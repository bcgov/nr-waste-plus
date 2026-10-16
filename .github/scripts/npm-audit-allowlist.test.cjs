const assert = require('node:assert/strict');
const test = require('node:test');
const {
  validateAllowlistSchema,
  validateAuditReport,
  validateProdAuditReport,
  checkAllowlistExpirations,
  evaluateAudit,
  run,
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
    /"folders" must be a non-empty array/
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
          folders: [],
        },
      ]),
    /"folders" must be a non-empty array/
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
          folders: [''],
        },
      ]),
    /"folders" must be a non-empty array/
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
          folders: [123],
        },
      ]),
    /"folders" must be a non-empty array/
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
  assert.equal(result.unhandled[0].unlistedKeys[0], 'https://github.com/advisories/GHSA-unlisted-secondary');
  assert.equal(result.unhandled[0].unlistedKeys[1], 'GHSA-unlisted-secondary');
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

test('evaluateAudit flags completely unlisted packages', () => {
  const allowlist = [
    {
      id: 'GHSA-vfj7-8cjw-p6xm',
      url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
      package: 'braces',
    },
  ];

  const report = {
    vulnerabilities: {
      otherVuln: {
        name: 'otherVuln',
        severity: 'critical',
        via: [
          {
            url: 'https://github.com/advisories/GHSA-unrelated-package',
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

test('run() successfully passes when audit matches allowlist and prod is clean', () => {
  const mockAllowlist = [
    {
      id: 'GHSA-vfj7-8cjw-p6xm',
      url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
      package: 'braces',
      owner: 'Team',
      reviewBy: '2099-01-01',
    },
  ];

  const fullAuditJson = JSON.stringify({
    vulnerabilities: {
      braces: {
        name: 'braces',
        severity: 'high',
        via: [{ url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm', name: 'braces' }],
      },
    },
  });

  const prodAuditJson = JSON.stringify({ vulnerabilities: {} });

  let exitCode = null;
  const logs = [];

  run({
    allowlist: mockAllowlist,
    execSync: (cmd) => {
      if (cmd.includes('--omit=dev')) return prodAuditJson;
      return fullAuditJson;
    },
    logger: {
      log: (msg) => logs.push(msg),
      error: (msg) => logs.push(`ERR: ${msg}`),
    },
    onExit: (code) => {
      exitCode = code;
    },
  });

  assert.equal(exitCode, 0);
  assert.ok(logs.some((l) => l.includes('Audit passed with allowlist')));
});

test('run() fails when production audit detects high/critical vulnerabilities', () => {
  const mockAllowlist = [
    {
      id: 'GHSA-vfj7-8cjw-p6xm',
      url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
      package: 'braces',
      owner: 'Team',
      reviewBy: '2099-01-01',
    },
  ];

  const fullAuditJson = JSON.stringify({
    vulnerabilities: {
      braces: {
        name: 'braces',
        severity: 'high',
        via: [{ url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm', name: 'braces' }],
      },
    },
  });

  const prodAuditWithVuln = JSON.stringify({
    vulnerabilities: {
      braces: { name: 'braces', severity: 'high' },
    },
  });

  assert.throws(
    () =>
      run({
        allowlist: mockAllowlist,
        execSync: (cmd) => {
          if (cmd.includes('--omit=dev')) return prodAuditWithVuln;
          return fullAuditJson;
        },
        logger: { log: () => {}, error: () => {} },
      }),
    /Allowlist only applies to devDependencies/
  );
});

test('run() exits with 1 when unhandled vulnerability exists in full audit', () => {
  const mockAllowlist = [
    {
      id: 'GHSA-vfj7-8cjw-p6xm',
      url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
      package: 'braces',
      owner: 'Team',
      reviewBy: '2099-01-01',
    },
  ];

  const fullAuditWithUnlisted = JSON.stringify({
    vulnerabilities: {
      otherPkg: {
        name: 'otherPkg',
        severity: 'high',
        via: [{ url: 'https://github.com/advisories/GHSA-unlisted', name: 'otherPkg' }],
      },
    },
  });

  const prodAuditClean = JSON.stringify({ vulnerabilities: {} });

  let exitCode = null;
  run({
    allowlist: mockAllowlist,
    execSync: (cmd) => {
      if (cmd.includes('--omit=dev')) return prodAuditClean;
      return fullAuditWithUnlisted;
    },
    logger: { log: () => {}, error: () => {} },
    onExit: (code) => {
      exitCode = code;
    },
  });

  assert.equal(exitCode, 1);
});

test('run() throws when allowlist entry is expired', () => {
  const expiredAllowlist = [
    {
      id: 'GHSA-vfj7-8cjw-p6xm',
      url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
      package: 'braces',
      owner: 'Team',
      reviewBy: '2026-01-01',
    },
  ];

  assert.throws(
    () =>
      run({
        allowlist: expiredAllowlist,
        currentDate: new Date('2026-10-16'),
        execSync: () => '',
        logger: { log: () => {}, error: () => {} },
      }),
    /expired and require re-evaluation/
  );
});

test('run() throws when audit output is empty or unparseable', () => {
  const validAllowlist = [
    {
      id: 'GHSA-vfj7-8cjw-p6xm',
      url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
      package: 'braces',
      owner: 'Team',
      reviewBy: '2099-01-01',
    },
  ];

  // Empty output
  assert.throws(
    () =>
      run({
        allowlist: validAllowlist,
        execSync: () => '',
        logger: { log: () => {}, error: () => {} },
      }),
    /Failed to parse npm audit JSON output/
  );

  // Unparseable JSON
  assert.throws(
    () =>
      run({
        allowlist: validAllowlist,
        execSync: () => '{ broken-json',
        logger: { log: () => {}, error: () => {} },
      }),
    /Failed to parse npm audit JSON output/
  );
});

test('run() throws when full audit returns an error object', () => {
  const validAllowlist = [
    {
      id: 'GHSA-vfj7-8cjw-p6xm',
      url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
      package: 'braces',
      owner: 'Team',
      reviewBy: '2099-01-01',
    },
  ];

  assert.throws(
    () =>
      run({
        allowlist: validAllowlist,
        execSync: () => JSON.stringify({ error: { code: 'ENOTFOUND', summary: 'getaddrinfo ENOTFOUND' } }),
        logger: { log: () => {}, error: () => {} },
      }),
    /failed with registry\/network error/
  );
});

test('run() respects --folder scoping and fails when folder is not in allowed folders', () => {
  const scopedAllowlist = [
    {
      id: 'GHSA-vfj7-8cjw-p6xm',
      url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
      package: 'braces',
      owner: 'Team',
      reviewBy: '2099-01-01',
      folders: ['frontend'],
    },
  ];

  const fullAuditJson = JSON.stringify({
    vulnerabilities: {
      braces: {
        name: 'braces',
        severity: 'high',
        via: [{ url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm', name: 'braces' }],
      },
    },
  });

  const prodAuditJson = JSON.stringify({ vulnerabilities: {} });

  let exitCode = null;
  // Run with folder set to 'cypress', which is not in ['frontend']
  run({
    allowlist: scopedAllowlist,
    args: ['--folder', 'cypress'],
    execSync: (cmd) => {
      if (cmd.includes('--omit=dev')) return prodAuditJson;
      return fullAuditJson;
    },
    logger: { log: () => {}, error: () => {} },
    onExit: (code) => {
      exitCode = code;
    },
  });

  assert.equal(exitCode, 1);
});
