import { describe, it, expect, vi, beforeEach } from 'vitest';

import { coastProcessor } from './coast/processor';
import { CompositeSpreadsheetProcessor } from './compositeProcessor';
import { interiorProcessor } from './interior/processor';

import { ExcelReader } from '@/services/excelReader/excelReader';

const mockFile = new File(['dummy'], 'test.xlsx', {
  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
});

describe('CompositeSpreadsheetProcessor', () => {
  let processor: CompositeSpreadsheetProcessor;

  beforeEach(() => {
    vi.restoreAllMocks();
    processor = new CompositeSpreadsheetProcessor();
  });

  it('starts with null kind', () => {
    expect(processor.kind).toBeNull();
  });

  // ---- routing ----

  it('routes interior files to interior processor and sets kind', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockResolvedValue(['Interior']);
    vi.spyOn(interiorProcessor, 'load').mockResolvedValue({
      success: true,
      data: [
        {
          district: 'DCC',
          dryBeltAvoidableSawlog: 2.04,
          dryBeltAvoidableGradeY4: null,
          dryBeltUnavoidable: null,
          dryBeltTotal: null,
          transitionZoneAvoidableSawlog: null,
          transitionZoneAvoidableGradeY4: null,
          transitionZoneUnavoidable: null,
          transitionZoneTotal: null,
          wetBeltAvoidableSawlog: null,
          wetBeltAvoidableGradeY4: null,
          wetBeltUnavoidable: null,
          wetBeltTotal: null,
        },
      ],
    });

    const result = await processor.load(mockFile);
    expect(processor.kind).toBe('interior');
    expect(result.success).toBe(true);
  });

  it('routes coast files to coast processor and sets kind', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockResolvedValue(['Coast']);
    vi.spyOn(coastProcessor, 'load').mockResolvedValue({
      success: true,
      data: [
        {
          district: 'DCK',
          matureAvoidableSawlog: 16.19,
          matureAvoidable025: null,
          matureAvoidableGradeY: null,
          matureUnavoidableGradeY: null,
          matureTotal: null,
          immatureAvoidableSawlog: null,
          immatureAvoidable025: null,
          immatureAvoidableGradeY: null,
          immatureUnavoidableGradeY: null,
          immatureTotal: null,
          heliMultiplier: null,
        },
      ],
    });

    const result = await processor.load(mockFile);
    expect(processor.kind).toBe('coast');
    expect(result.success).toBe(true);
  });

  // ---- error paths ----

  it('returns failure for unrecognized file', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockResolvedValue(['Random']);
    vi.spyOn(ExcelReader.prototype, 'readRaw').mockResolvedValue([['A']]);

    const result = await processor.load(mockFile);
    expect(result.success).toBe(false);
    expect(processor.kind).toBeNull();
  });

  it('returns failure when identifySpreadsheet throws non-Error', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockRejectedValue('string oops');

    const result = await processor.load(mockFile);
    expect(result.success).toBe(false);
    expect(processor.kind).toBeNull();
  });

  it('returns failure when sub-processor throws Error', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockResolvedValue(['Interior']);
    vi.spyOn(interiorProcessor, 'load').mockRejectedValue(new Error('Parse error'));

    const result = await processor.load(mockFile);
    expect(result.success).toBe(false);
    expect(processor.kind).toBe('interior');
  });

  it('returns failure when sub-processor throws non-Error', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockResolvedValue(['Coast']);
    vi.spyOn(coastProcessor, 'load').mockRejectedValue('string boom');

    const result = await processor.load(mockFile);
    expect(result.success).toBe(false);
    expect(processor.kind).toBe('coast');
  });
});
