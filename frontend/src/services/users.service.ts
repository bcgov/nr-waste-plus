import type { CancelablePromise } from '@/config/api/CancelablePromise';
import type { UserPreference } from '@/context/preference/types';


import { HttpClient, type APIConfig } from '@/config/api/types';

/**
 * Backend client for user preference endpoints.
 */
export class UserService extends HttpClient {
  /**
   * Creates a user service.
   *
   * @param config The API client configuration.
   */
  constructor(readonly config: APIConfig) {
    super(config);
  }

  /**
   * Loads the current user's saved preferences.
   *
   * @returns The user's preference payload.
   */
  getUserPreferences(): CancelablePromise<UserPreference> {
    return this.doRequest<UserPreference>(this.config, {
      method: 'GET',
      url: '/api/users/preferences',
    });
  }

  /**
   * Persists the current user's preferences.
   *
   * @param preferences The preference values to store.
   * @returns A promise that resolves when the update completes.
   */
  updateUserPreferences(preferences: UserPreference): CancelablePromise<void> {
    return this.doRequest<void>(this.config, {
      method: 'PUT',
      url: '/api/users/preferences',
      body: preferences,
    });
  }

  /**
   * Add a particular reporting unit to the user's bookmarks.
   * This is an idempotent operation - adding a bookmark for a reporting unit that
   * is already bookmarked will not cause an error, and will have no effect.
   * This means the frontend can optimistically call these endpoints without
   * needing to check the current bookmark state of the reporting unit beforehand.
   * It also serves as an indicator to the future offline mode to keep track of this
   * particular reporting unit, as the bookmarked reporting unit is flagged to be available offline.
   *
   * @param ruId The reporting unit ID.
   * @returns A promise that resolves when added.
   */
  setUserBookmarkedRu(ruId: number): CancelablePromise<void> {
    return this.doRequest<void>(this.config, {
      method: 'PUT',
      url: `/api/users/bookmarks/${ruId}`,
    });
  }

  /**
   * Remove a particular reporting unit from the user's bookmarks.
   * This is an idempotent operation - removing a bookmark for a reporting unit that
   * is not currently bookmarked will not cause an error, and will have no effect.
   * This means the frontend can optimistically call these endpoints without
   * needing to check the current bookmark state of the reporting unit beforehand.
   * It also serves as an indicator to the future offline mode to stop keeping track of this
   * particular reporting unit, as the bookmarked reporting unit is flagged to be available offline.
   *
   * @param ruId The reporting unit ID.
   * @returns A promise that resolves when removed.
   */
  deleteUserBookmarkedRu(ruId: number): CancelablePromise<void> {
    return this.doRequest<void>(this.config, {
      method: 'DELETE',
      url: `/api/users/bookmarks/${ruId}`,
    });
  }
}
