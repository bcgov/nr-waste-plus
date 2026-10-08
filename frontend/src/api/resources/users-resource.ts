/**
 * UsersResource — typed API resource for `/api/users` endpoints.
 *
 * Covers the authenticated user's preferences and reporting-unit
 * bookmarks. Framework-agnostic: imperative wrappers live in
 * `api/users.ts`. All requests flow through the middleware pipeline.
 *
 * @module api/resources/users-resource
 */

import { Resource } from '@/http/resource';

import type { ResourceRequestOptions } from '@/http/resource';
import type { Transport } from '@/http/types';
import type { UserPreference } from '@/context/preference/types';

/**
 * API resource for user preference and bookmark endpoints.
 *
 * @param transport - Configured pipeline from `createApiClient()`.
 */
export class UsersResource extends Resource<UserPreference> {
  constructor(transport: Transport) {
    super('/api/users', transport);
  }

  /**
   * Loads the current user's saved preferences.
   *
   * @param options - Request options (AbortSignal, pipeline meta).
   * @returns The user's preference payload.
   */
  readonly getUserPreferences = (options?: ResourceRequestOptions): Promise<UserPreference> =>
    this.get<UserPreference>('/preferences', options);

  /**
   * Persists the current user's preferences (idempotent full replace).
   *
   * @param preferences - The preference values to store.
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly updateUserPreferences = async (
    preferences: UserPreference,
    options?: ResourceRequestOptions,
  ): Promise<void> => {
    await this.request('PUT', '/preferences', { ...options, data: preferences });
  };

  /**
   * Adds a reporting unit to the user's bookmarks.
   *
   * Idempotent server-side: bookmarking an already-bookmarked unit is a
   * no-op, so the UI can toggle optimistically without checking current
   * state. Also flags the unit as available offline (future offline mode).
   *
   * @param ruId - The reporting unit ID.
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly setUserBookmarkedRu = async (
    ruId: number,
    options?: ResourceRequestOptions,
  ): Promise<void> => {
    await this.request('PUT', `/bookmarks/${encodeURIComponent(String(ruId))}`, options);
  };

  /**
   * Removes a reporting unit from the user's bookmarks (idempotent).
   *
   * @param ruId - The reporting unit ID.
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly deleteUserBookmarkedRu = async (
    ruId: number,
    options?: ResourceRequestOptions,
  ): Promise<void> => {
    await this.request('DELETE', `/bookmarks/${encodeURIComponent(String(ruId))}`, options);
  };
}
