import { describe, it, expect } from 'vitest';

import { toKebabCase } from './utils';

describe('toKebabCase', () => {
  it('converts simple single word to lowercase', () => {
    expect(toKebabCase('Hello')).toBe('hello');
  });

  it('converts multiple words to kebab-case', () => {
    expect(toKebabCase('Hello World')).toBe('hello-world');
  });

  it('converts three or more words to kebab-case', () => {
    expect(toKebabCase('This Is A Test')).toBe('this-is-a-test');
  });

  it('removes leading whitespace', () => {
    expect(toKebabCase('  Hello World')).toBe('hello-world');
  });

  it('removes trailing whitespace', () => {
    expect(toKebabCase('Hello World  ')).toBe('hello-world');
  });

  it('removes both leading and trailing whitespace', () => {
    expect(toKebabCase('  Hello World  ')).toBe('hello-world');
  });

  it('handles multiple spaces between words', () => {
    expect(toKebabCase('Hello  World  Test')).toBe('hello-world-test');
  });

  it('handles tabs and multiple whitespace types', () => {
    expect(toKebabCase('Hello   World')).toBe('hello-world');
  });

  it('converts uppercase text to lowercase', () => {
    expect(toKebabCase('HELLO WORLD')).toBe('hello-world');
  });

  it('converts mixed case text', () => {
    expect(toKebabCase('HeLLo WoRLd')).toBe('hello-world');
  });

  it('handles single word with leading/trailing spaces', () => {
    expect(toKebabCase('  Hello  ')).toBe('hello');
  });

  it('returns empty string for empty input', () => {
    expect(toKebabCase('')).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(toKebabCase('   ')).toBe('');
  });

  it('handles text with numbers', () => {
    expect(toKebabCase('Test 123 Value')).toBe('test-123-value');
  });

  it('handles text with hyphens already present', () => {
    expect(toKebabCase('test-case')).toBe('test-case');
  });

  it('handles text with underscores', () => {
    expect(toKebabCase('test_case')).toBe('test_case');
  });

  it('converts field names with spaces correctly', () => {
    expect(toKebabCase('First Name')).toBe('first-name');
  });

  it('converts field names with numbers correctly', () => {
    expect(toKebabCase('Field 1 Name')).toBe('field-1-name');
  });

  it('preserves single spaces in normal input', () => {
    expect(toKebabCase('One Two')).toBe('one-two');
  });

  it('handles text with special characters (spaces only filtered)', () => {
    expect(toKebabCase('Hello @ World')).toBe('hello-@-world');
  });

  it('handles consecutive spaces and converts correctly', () => {
    expect(toKebabCase('Hello     World     Test')).toBe('hello-world-test');
  });

  it('works with common form field labels', () => {
    expect(toKebabCase('Email Address')).toBe('email-address');
    expect(toKebabCase('Phone Number')).toBe('phone-number');
    expect(toKebabCase('Zip Code')).toBe('zip-code');
  });

  it('handles very long text', () => {
    const longText = 'This Is A Very Long Field Name That Spans Many Words';
    expect(toKebabCase(longText)).toBe('this-is-a-very-long-field-name-that-spans-many-words');
  });
});
