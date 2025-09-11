import { describe, expect, it } from 'vitest';

import { filterClientByKeyword } from './utils';

import type { ForestClientDto } from '@/services/types';

describe('filterClientByKeyword', () => {
  const baseClient: ForestClientDto = {
    clientNumber: '12345',
    clientName: 'Acme Forestry',
    legalFirstName: 'John',
    legalMiddleName: 'Q',
    clientStatusCode: { code: 'A', description: 'Active' },
    clientTypeCode: { code: 'T', description: 'Type' },
    acronym: 'ACF',
    name: 'Acme',
  };

  it('returns true if keyword matches acronym', () => {
    expect(filterClientByKeyword(baseClient, 'acf')).toBe(true);
  });

  it('returns true if keyword matches clientName', () => {
    expect(filterClientByKeyword(baseClient, 'forestry')).toBe(true);
  });

  it('returns true if keyword matches clientNumber', () => {
    expect(filterClientByKeyword(baseClient, '12345')).toBe(true);
  });

  it('returns true if keyword matches legalFirstName', () => {
    expect(filterClientByKeyword(baseClient, 'john')).toBe(true);
  });

  it('returns true if keyword matches legalMiddleName', () => {
    expect(filterClientByKeyword(baseClient, 'q')).toBe(true);
  });

  it('returns true if keyword matches name', () => {
    expect(filterClientByKeyword(baseClient, 'acme')).toBe(true);
  });

  it('returns false if keyword does not match any field', () => {
    expect(filterClientByKeyword(baseClient, 'xyz')).toBe(false);
  });

  it('is case-insensitive and trims fields', () => {
    const client: ForestClientDto = { ...baseClient, clientName: '  Acme Forestry  ' };
    expect(filterClientByKeyword(client, 'acme')).toBe(true);
    expect(filterClientByKeyword(client, 'FORESTRY')).toBe(true);
  });

  it('handles missing optional fields gracefully', () => {
    const client: ForestClientDto = { ...baseClient, name: undefined };
    expect(filterClientByKeyword(client, 'acme')).toBe(true); // matches clientName
    expect(filterClientByKeyword(client, 'xyz')).toBe(false);
  });

  it('returns false if all fields are empty', () => {
    const emptyClient: ForestClientDto = {
      clientNumber: '',
      clientName: '',
      legalFirstName: '',
      legalMiddleName: '',
      clientStatusCode: { code: '', description: '' },
      clientTypeCode: { code: '', description: '' },
      acronym: '',
      name: undefined,
    };
    expect(filterClientByKeyword(emptyClient, 'anything')).toBe(false);
  });
});
