import type { CancelablePromise } from '@/config/api/CancelablePromise';
import type { UserPreference } from '@/context/preference/types';

import { problemDetailsMiddleware } from '@/config/api/problemDetailsMiddleware';
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
      middleware: [problemDetailsMiddleware()],
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
      middleware: [problemDetailsMiddleware()],
    });
  }
}
