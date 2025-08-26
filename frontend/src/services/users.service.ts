import { HttpClient, type APIConfig } from '@/config/api/types';

import type { CancelablePromise } from '@/config/api/CancelablePromise';
import type { UserPreference } from '@/context/preference/types';

export class UserService extends HttpClient {
  constructor(readonly config: APIConfig) {
    super(config);
  }

  getUserPreferences(): CancelablePromise<UserPreference> {
    return this.doRequest<UserPreference>(this.config, {
      method: 'GET',
      url: '/api/users/preferences',
    });
  }

  updateUserPreferences(preferences: UserPreference): CancelablePromise<void> {
    return this.doRequest<void>(this.config, {
      method: 'PUT',
      url: '/api/users/preferences',
      body: preferences,
    });
  }
}
