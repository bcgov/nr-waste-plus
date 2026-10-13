import { describe, expect, it, beforeEach } from 'vitest';

import { DISABLED_PANELS_STORAGE_KEY, readDisabledPanelIds, writeDisabledPanelIds } from './panelPreferences';

describe('panelPreferences', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  describe('readDisabledPanelIds', () => {
    it('returns an empty list when nothing is persisted', () => {
      expect(readDisabledPanelIds()).toEqual([]);
    });

    it('returns the persisted ids', () => {
      globalThis.localStorage.setItem(DISABLED_PANELS_STORAGE_KEY, JSON.stringify(['query', 'form']));

      expect(readDisabledPanelIds()).toEqual(['query', 'form']);
    });

    it('returns an empty list for corrupted JSON', () => {
      globalThis.localStorage.setItem(DISABLED_PANELS_STORAGE_KEY, '{not json');

      expect(readDisabledPanelIds()).toEqual([]);
    });

    it('returns an empty list for a non-array payload', () => {
      globalThis.localStorage.setItem(DISABLED_PANELS_STORAGE_KEY, JSON.stringify({ query: true }));

      expect(readDisabledPanelIds()).toEqual([]);
    });

    it('filters out non-string entries from a mixed array', () => {
      globalThis.localStorage.setItem(DISABLED_PANELS_STORAGE_KEY, JSON.stringify(['query', 42, null, 'form']));

      expect(readDisabledPanelIds()).toEqual(['query', 'form']);
    });
  });

  describe('writeDisabledPanelIds', () => {
    it('persists the ids so a later read returns them', () => {
      writeDisabledPanelIds(['router']);

      expect(readDisabledPanelIds()).toEqual(['router']);
    });

    it('overwrites a previous value', () => {
      writeDisabledPanelIds(['router']);
      writeDisabledPanelIds(['form', 'query']);

      expect(readDisabledPanelIds()).toEqual(['form', 'query']);
    });

    it('persists an empty list to clear the preference', () => {
      writeDisabledPanelIds(['router']);
      writeDisabledPanelIds([]);

      expect(readDisabledPanelIds()).toEqual([]);
    });
  });
});
