import { describe, expect, it } from 'vitest';

import * as CoastShim from '@/components/waste/ReportingUnits/CoastSubmissionDetailsForm';
import * as InteriorShim from '@/components/waste/ReportingUnits/InteriorSubmissionDetailsForm';
import * as SubmissionDetailsForm from '@/components/waste/ReportingUnits/SubmissionDetailsForm';

describe('block details shims (foundation)', () => {
  it('exposes shim modules', () => {
    expect(CoastShim).toBeTruthy();
    expect(InteriorShim).toBeTruthy();
    expect(SubmissionDetailsForm).toBeTruthy();
  });
});
