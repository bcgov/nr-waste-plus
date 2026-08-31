import { describe, expect, it } from 'vitest';

import fixture from '../../shared/formula-conformance.json';

type Expected = {
  status: 'VALID' | 'INVALID' | 'PENDING_EVALUATOR';
  errors?: Array<{ code: string; startOffset?: number; endOffset?: number }>;
  reason?: string;
};

describe('formula conformance fixture', () => {
  it('contains executable backend cases and explicit evaluator boundaries', () => {
    expect(fixture.contractVersion).toBe('1.0');
    expect(fixture.namespaces).toEqual(['da', 'sc', 'submission', 'hbs', 'fta']);
    expect(fixture.diagnosticCodes).toHaveLength(7);
    expect(fixture.rounding).toEqual({
      scale: 3,
      mode: 'HALF_UP',
      examples: ['0.0004', '0.0005', '1.2345'],
    });

    const ids = fixture.cases.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('valid-all-approved-namespaces');
    expect(ids).toContain('invalid-unused-if-branch');

    let executable = 0;
    let pending = 0;
    for (const testCase of fixture.cases) {
      const expected = testCase.expected as Expected;
      expect(testCase.id).toMatch(/^[a-z0-9-]+$/);
      expect(testCase.mode).toMatch(/^(MATHEMATICAL|CONDITIONAL)$/);
      if (expected.status === 'PENDING_EVALUATOR') {
        pending += 1;
        expect(expected.reason).toBeTruthy();
      } else {
        executable += 1;
        expect(testCase.expression ?? testCase.definitions).toBeTruthy();
        if (expected.status === 'INVALID') {
          expect(expected.errors?.length).toBeGreaterThan(0);
          for (const error of expected.errors ?? []) {
            expect(fixture.diagnosticCodes).toContain(error.code);
            if (error.startOffset !== undefined)
              expect(error.endOffset).toBeGreaterThanOrEqual(error.startOffset);
          }
        }
      }
    }
    expect(executable).toBeGreaterThan(10);
    expect(pending).toBe(4);
  });
});
