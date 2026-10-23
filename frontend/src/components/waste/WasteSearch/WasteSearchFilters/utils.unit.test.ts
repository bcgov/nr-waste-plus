import { describe, expect, it } from 'vitest';

import { validateWasteSearch } from '@/routing/searchParams';

import { searchToViewDto, viewDtoToSearch } from './utils';

describe('searchToViewDto', () => {
  it('maps URL code strings to CodeDescriptionDto items for clientNumbers', () => {
    const search = validateWasteSearch({ clientNumbers: 'A01,B02' });
    expect(searchToViewDto(search)).toEqual({
      clientNumbers: [
        { code: 'A01', description: 'A01' },
        { code: 'B02', description: 'B02' },
      ],
    });
  });

  it('passes scalar and array filters through untouched', () => {
    const search = validateWasteSearch({
      mainSearchTerm: '12345',
      district: 'DCC,DSC',
      legacy: false,
    });
    expect(searchToViewDto(search)).toEqual({
      mainSearchTerm: '12345',
      district: ['DCC', 'DSC'],
      legacy: false,
    });
  });

  it('omits clientNumbers entirely when absent', () => {
    const search = validateWasteSearch({});
    expect('clientNumbers' in searchToViewDto(search)).toBe(false);
  });
});

describe('viewDtoToSearch', () => {
  it('collapses client CodeDescriptionDto items back to code strings', () => {
    const view = {
      clientNumbers: [
        { code: 'A01', description: 'Client A' },
        { code: 'B02', description: 'Client B' },
      ],
    };
    expect(viewDtoToSearch(view)).toEqual({ clientNumbers: ['A01', 'B02'] });
  });

  it('drops empty arrays, empty strings, and undefined values', () => {
    const view = {
      mainSearchTerm: '',
      sampling: [] as string[],
      district: ['DCC'],
      requestUserId: undefined,
    };
    expect(viewDtoToSearch(view)).toEqual({ district: ['DCC'] });
  });

  it('keeps legacy=false — it is a real value, not an empty one', () => {
    const view = { legacy: false };
    expect(viewDtoToSearch(view)).toEqual({ legacy: false });
  });

  it('drops false for checkbox filters — unchecked means absent', () => {
    const view = { requestByMe: false, multiMark: true };
    expect(viewDtoToSearch(view)).toEqual({ multiMark: true });
  });

  it('round-trips through validateWasteSearch preserving codes and the false flag', () => {
    const view = {
      mainSearchTerm: 'X01',
      clientNumbers: [{ code: 'X01', description: 'Extra Client' }],
      legacy: false,
    };
    const roundTripped = validateWasteSearch(viewDtoToSearch(view));
    expect(searchToViewDto(roundTripped)).toEqual({
      mainSearchTerm: 'X01',
      clientNumbers: [{ code: 'X01', description: 'X01' }],
      legacy: false,
    });
  });
});
