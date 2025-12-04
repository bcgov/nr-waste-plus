import { describe, it, expect, vi, type Mock, beforeEach } from 'vitest';

import { loadUserPreference, saveUserPreference, initialValue } from './utils';

import APIs from '@/services/APIs';

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

describe('loadUserPreference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (APIs.user.updateUserPreferences as Mock).mockResolvedValue({});
  });

  it('no value initially, resort to default', async () => {
    (APIs.user.getUserPreferences as Mock).mockResolvedValueOnce({}).mockResolvedValueOnce({});
    const result = await loadUserPreference();
    expect(result).toEqual(initialValue);
  });

  it('returns preference', async () => {
    (APIs.user.getUserPreferences as Mock).mockResolvedValueOnce({ theme: 'g100' });
    const result = await loadUserPreference();
    expect(result).toEqual({ theme: 'g100' });
  });
});

describe('saveUserPreference', () => {
  it('saves merged preference', async () => {
    (APIs.user.getUserPreferences as Mock).mockResolvedValueOnce({ theme: 'g100' });
    const result = await saveUserPreference({ otherSetting: 'value' });
    expect(result).toEqual({ theme: 'g100', otherSetting: 'value' });
  });

  it('saves new preference when nothing exists in API', async () => {
    (APIs.user.getUserPreferences as Mock).mockResolvedValueOnce({});
    const result = await saveUserPreference({ theme: 'g90' });
    expect(result).toEqual({ theme: 'g90' });
  });
});
