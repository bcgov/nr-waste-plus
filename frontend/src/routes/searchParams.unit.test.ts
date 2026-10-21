import { describe, expect, it } from 'vitest';

import { searchParamCodec, validateWasteSearch, wasteSearchSchema } from './searchParams';

describe('wasteSearchSchema (validateWasteSearch)', () => {
  it('parses comma-joined arrays into string arrays', () => {
    expect(validateWasteSearch({ district: 'DCC,DSC' }).district).toEqual(['DCC', 'DSC']);
  });

  it('recovers single numeric values into one-element arrays (qss decodes them as numbers)', () => {
    expect(validateWasteSearch({ clientNumbers: 90000003 }).clientNumbers).toEqual(['90000003']);
  });

  it('parses an empty array param into an empty array', () => {
    expect(validateWasteSearch({ district: '' }).district).toEqual([]);
  });

  it('still accepts legacy JSON-array URLs (decoded by the router codec first)', () => {
    const fromUrl = searchParamCodec.parseSearch('district=%5B%22DCC%22%2C%22DSC%22%5D');
    expect(validateWasteSearch(fromUrl).district).toEqual(['DCC', 'DSC']);
  });

  it('keeps plain numeric-looking search terms as strings', () => {
    expect(validateWasteSearch({ mainSearchTerm: '12345' }).mainSearchTerm).toBe('12345');
  });

  it('JSON-decodes legacy quoted-string URLs (decoded by the router codec first)', () => {
    const fromUrl = searchParamCodec.parseSearch('mainSearchTerm=%2212345%22');
    expect(validateWasteSearch(fromUrl).mainSearchTerm).toBe('12345');
  });

  it('parses true/false params into booleans', () => {
    const parsed = validateWasteSearch({ legacy: 'false', multiMark: 'true' });
    expect(parsed.legacy).toBe(false);
    expect(parsed.multiMark).toBe(true);
  });

  it('degrades malformed values to undefined instead of throwing (lenient per DEC-011)', () => {
    const parsed = validateWasteSearch({ multiMark: 'garbage', district: { nested: true } });
    expect(parsed.multiMark).toBeUndefined();
    expect(parsed.district).toBeUndefined();
  });

  it('strips unknown keys', () => {
    const parsed = validateWasteSearch({ hacker: 'yes', mainSearchTerm: 'abc' });
    expect(parsed).toEqual({ mainSearchTerm: 'abc' });
    expect('hacker' in parsed).toBe(false);
  });

  it('treats a missing search object as empty state', () => {
    expect(validateWasteSearch(undefined)).toEqual({});
  });

  it('exposes legacy as a boolean in the inferred type', () => {
    // Compile-time shape guard: legacy must be boolean | undefined.
    const value: boolean | undefined = wasteSearchSchema.parse({ legacy: 'false' }).legacy;
    expect(value).toBe(false);
  });
});

describe('searchParamCodec (router-level URL encoding)', () => {
  it('writes strings plainly — no double-quote wrapping', () => {
    const encoded = searchParamCodec.stringifySearch({ mainSearchTerm: '12345' });
    expect(encoded).toContain('mainSearchTerm=12345');
    expect(encoded).not.toContain('%22');
  });

  it('writes booleans as true/false literals', () => {
    const encoded = searchParamCodec.stringifySearch({ legacy: false, multiMark: true });
    expect(encoded).toContain('legacy=false');
    expect(encoded).toContain('multiMark=true');
  });

  it('joins arrays with commas (URL-encoded as %2C by the query-string layer)', () => {
    const encoded = searchParamCodec.stringifySearch({ district: ['DCC', 'DSC'] });
    expect(encoded).toContain('district=DCC%2CDSC');
  });

  it('round-trips values through the full pipeline (codec → schema)', () => {
    const search = { mainSearchTerm: '12345', district: ['DCC', 'DSC'], legacy: false };
    const decoded = validateWasteSearch(
      searchParamCodec.parseSearch(searchParamCodec.stringifySearch(search)),
    );
    // The qss decode layer turns the numeric-looking term into a number; the schema
    // coerces it back to a string, so the full pipeline is type-stable.
    expect(decoded).toEqual(search);
  });

  it('decodes legacy JSON-encoded strings and arrays from old URLs', () => {
    expect(searchParamCodec.parseSearch('mainSearchTerm=%2212345%22')).toEqual({
      mainSearchTerm: '12345',
    });
    expect(searchParamCodec.parseSearch('district=%5B%22DCC%22%2C%22DSC%22%5D')).toEqual({
      district: ['DCC', 'DSC'],
    });
  });
});
