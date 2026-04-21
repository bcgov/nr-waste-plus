/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { UserService } from './users.service';

import type { UserPreference } from '@/context/preference/types';

vi.mock('axios');

const mockConfig = { baseURL: 'http://localhost' };
let service: UserService;

beforeEach(() => {
  service = new UserService(mockConfig as any);
});

describe('UserService', () => {
  it('getUserPreferences should return user preferences from API', async () => {
    const mockPrefs = { theme: 'g10' };
    (service as any).doRequest = vi.fn().mockResolvedValue(mockPrefs);
    const result = await service.getUserPreferences();
    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'GET',
      url: '/api/users/preferences',
    });
    expect(result).toEqual(mockPrefs);
  });

  it('updateUserPreferences should send preferences to API', async () => {
    (service as any).doRequest = vi.fn().mockResolvedValue(undefined);
    const prefs: UserPreference = { theme: 'g100' };
    const result = await service.updateUserPreferences(prefs);
    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'PUT',
      url: '/api/users/preferences',
      body: prefs,
    });
    expect(result).toBeUndefined();
  });

  it('setUserBookmarkedRu should PUT a bookmark for the given reporting unit', async () => {
    (service as any).doRequest = vi.fn().mockResolvedValue(undefined);
    const ruId = 42;
    const result = await service.setUserBookmarkedRu(ruId);
    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'PUT',
      url: '/api/users/bookmarks/42',
    });
    expect(result).toBeUndefined();
  });

  it('deleteUserBookmarkedRu should DELETE a bookmark for the given reporting unit', async () => {
    (service as any).doRequest = vi.fn().mockResolvedValue(undefined);
    const ruId = 42;
    const result = await service.deleteUserBookmarkedRu(ruId);
    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'DELETE',
      url: '/api/users/bookmarks/42',
    });
    expect(result).toBeUndefined();
  });
});
