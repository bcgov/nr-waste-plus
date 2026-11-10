import { describe, expect, it } from 'vitest';

import CoastShim, {
  type CoastSubmissionDetailsFormProps,
  type CoastSubmissionDetailsValues,
} from '@/components/waste/ReportingUnits/CoastSubmissionDetailsForm';
import InteriorShim, {
  type InteriorBecSubzoneVariantOption,
  type InteriorSubmissionDetailsValues,
} from '@/components/waste/ReportingUnits/InteriorSubmissionDetailsForm';
import * as InteriorTypes from '@/components/waste/ReportingUnits/InteriorSubmissionDetailsForm/types';
import SubmissionDetailsForm, {
  resolveSubmissionVariant,
} from '@/components/waste/ReportingUnits/SubmissionDetailsForm';
import { renderWithAppAsync } from '@/config/tests/renderWithApp';

describe('D20/S3b back-compat shims', () => {
  it('re-exports submission details components and types', async () => {
    const coastValues: CoastSubmissionDetailsValues = {
      primaryLoggingCompleteDate: '',
      harvestStatusCode: '',
      maturityCode: '',
      isHeliLogging: false,
      cableYardingAreaHa: '',
      groundBasedAreaHa: '',
      skylineLoggingAreaHa: '',
      wasteBenchmark: '',
      hasDispersedRetention: false,
      dispersedRetentionPct: '',
      dispersedRetentionExplanation: '',
      districtAverageCriteriaCodes: [],
    };
    const interiorValues: InteriorSubmissionDetailsValues = {
      primaryLoggingCompleteDate: '',
      harvestStatusCode: '',
      becZoneCode: '',
      becSubzoneVariantCode: '',
      benchmarkZone: '',
      wasteBenchmark: '',
      hasDispersedRetention: false,
      dispersedRetentionPct: '',
      dispersedRetentionExplanation: '',
      districtAverageCriteriaCodes: [],
    };
    const variant: InteriorBecSubzoneVariantOption = {
      code: 'dw2',
      description: 'dw2',
      becZoneCode: 'SBS',
      areas: null,
    };
    const coastProps: CoastSubmissionDetailsFormProps = {
      mode: 'form',
      harvestStatuses: [],
      maturityOptions: [],
      districtAverageCriteria: [],
    };

    expect(CoastShim).toBeTypeOf('function');
    expect(InteriorShim).toBeTypeOf('function');
    expect(SubmissionDetailsForm).toBeTypeOf('function');
    expect(resolveSubmissionVariant({ code: 'C', description: 'Coast' })).toBe('coast');
    expect(coastValues.isHeliLogging).toBe(false);
    expect(interiorValues.becZoneCode).toBe('');
    expect(variant.becZoneCode).toBe('SBS');
    expect(coastProps.mode).toBe('form');
    expect(InteriorTypes).toBeTruthy();

    await renderWithAppAsync(
      <SubmissionDetailsForm
        variant="interior"
        mode="form"
        harvestStatuses={[]}
        becZones={[]}
        becSubzoneVariants={[]}
        maturityOptions={[]}
        districtAverageCriteria={[]}
      />,
    );
  });
});
