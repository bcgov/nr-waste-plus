import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import APIs from '@/services/APIs';

import { loadUserPreference, saveUserPreference, initialValue } from './utils';

const mockStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    reset: () => {
      store = {};
    },
  };
})();

vi.mock('@/services/APIs', () => {
  return {
    default: {
      user: {
        getUserPreferences: vi.fn(),
        updateUserPreferences: vi.fn(),
      },
    },
  };
});

beforeEach(() => {
  mockStorage.reset();
  vi.stubGlobal('localStorage', mockStorage);
});

afterEach(() => {
  vi.restoreAllMocks();
  mockStorage.reset();
  mockStorage.clear();
  vi.stubGlobal('localStorage', mockStorage);
});

describe('loadUserPreference', () => {
  it('returns initial default preference if nothing is stored and API returns nothing', async () => {
    (APIs.user.getUserPreferences as vi.Mock).mockResolvedValueOnce({ theme: 'g10' });

    const result = await loadUserPreference();
    expect(result).toEqual(initialValue);
  });

  it('returns stored preference if available in localStorage', async () => {
    mockStorage.setItem('userPreference', JSON.stringify({ theme: 'white' }));
    (APIs.user.getUserPreferences as vi.Mock).mockResolvedValueOnce({ theme: 'white' });
    const result = await loadUserPreference();
    expect(result).toEqual({ theme: 'white' });
  });

  it('returns API preference if not in localStorage and API returns value', async () => {
    (APIs.user.getUserPreferences as vi.Mock).mockResolvedValueOnce({ theme: 'g90' });
    mockStorage.clear();
    const result = await loadUserPreference();
    expect(result).toEqual({ theme: 'g90' });
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      'userPreference',
      JSON.stringify({ theme: 'g90' }),
    );
  });
});

describe('saveUserPreference', () => {
  it('saves merged preference to localStorage and API', async () => {
    (APIs.user.getUserPreferences as vi.Mock).mockResolvedValueOnce({ theme: 'white' });
    const result = await saveUserPreference({ theme: 'g10' });
    expect(result).toEqual({ theme: 'g10' });
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      'userPreference',
      JSON.stringify({ theme: 'g10' }),
    );
  });

  it('saves new preference when nothing exists in API', async () => {
    (APIs.user.getUserPreferences as vi.Mock).mockResolvedValueOnce({});
    const result = await saveUserPreference({ theme: 'g90' });
    expect(result).toEqual({ theme: 'g90' });
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      'userPreference',
      JSON.stringify({ theme: 'g90' }),
    );
  });
});
