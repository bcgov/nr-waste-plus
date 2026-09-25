import { describe, expect, it } from 'vitest';

import { FORMULA_VARIABLES_DISTRICT_CODE } from './formulaConfiguration.constants.ts';

describe('FORMULA_VARIABLES_DISTRICT_CODE', () => {
  it('pins the district code sent to the variables endpoint', () => {
    expect(FORMULA_VARIABLES_DISTRICT_CODE).toBe('DKM');
  });
});
