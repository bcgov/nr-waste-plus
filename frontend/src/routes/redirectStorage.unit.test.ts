import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearPersistedRedirect,
  persistRedirectUrl,
  readPersistedRedirect,
} from './redirectStorage';

describe('redirectStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('persistRedirectUrl', () => {
    it('shouldStoreUrl_inSessionStorage', () => {
      persistRedirectUrl('/search?q=test');
      expect(sessionStorage.getItem('redirectAfterLogin')).toBe('/search?q=test');
    });

    it('shouldOverwriteExistingUrl', () => {
      persistRedirectUrl('/first');
      persistRedirectUrl('/second');
      expect(sessionStorage.getItem('redirectAfterLogin')).toBe('/second');
    });

    it('shouldNotThrow_whenSessionStorageUnavailable', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      expect(() => persistRedirectUrl('/path')).not.toThrow();
      spy.mockRestore();
    });
  });

  describe('readPersistedRedirect', () => {
    it('shouldReturnNull_whenNothingStored', () => {
      expect(readPersistedRedirect()).toBeNull();
    });

    it('shouldReturnStoredUrl', () => {
      sessionStorage.setItem('redirectAfterLogin', '/clients');
      expect(readPersistedRedirect()).toBe('/clients');
    });

    it('shouldReturnNull_whenSessionStorageThrows', () => {
      const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      expect(readPersistedRedirect()).toBeNull();
      spy.mockRestore();
    });
  });

  describe('clearPersistedRedirect', () => {
    it('shouldRemoveStoredUrl', () => {
      sessionStorage.setItem('redirectAfterLogin', '/search');
      clearPersistedRedirect();
      expect(sessionStorage.getItem('redirectAfterLogin')).toBeNull();
    });

    it('shouldNotThrow_whenNothingToRemove', () => {
      expect(() => clearPersistedRedirect()).not.toThrow();
    });

    it('shouldNotThrow_whenSessionStorageThrows', () => {
      const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      expect(() => clearPersistedRedirect()).not.toThrow();
      spy.mockRestore();
    });
  });
});
