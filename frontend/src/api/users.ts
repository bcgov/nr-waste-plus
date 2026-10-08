/**
 * Users API — imperative wrappers for the authenticated user's
 * preferences and reporting-unit bookmarks.
 *
 * No TanStack hooks existed for these endpoints pre-migration
 * (PreferenceProvider manages its own state; waste-search row actions
 * use a local `useMutation`), so this module exports plain async
 * functions backed by a module-level {@link UsersResource} singleton.
 *
 * @module api/users
 */

import { client } from './client';
import { UsersResource } from './resources/users-resource';

import type { UserPreference } from '@/context/preference/types';

const usersResource = new UsersResource(client);

/**
 * Loads the current user's saved preferences.
 *
 * @param signal - Optional AbortSignal for cancellation.
 */
export const getUserPreferences = (signal?: AbortSignal): Promise<UserPreference> =>
  usersResource.getUserPreferences({ signal });

/**
 * Persists the current user's preferences.
 *
 * @param preferences - The preference values to store.
 * @param signal - Optional AbortSignal for cancellation.
 */
export const updateUserPreferences = (
  preferences: UserPreference,
  signal?: AbortSignal,
): Promise<void> => usersResource.updateUserPreferences(preferences, { signal });

/**
 * Bookmarks a reporting unit (idempotent server-side).
 *
 * @param ruId - The reporting unit ID.
 * @param signal - Optional AbortSignal for cancellation.
 */
export const setUserBookmarkedRu = (ruId: number, signal?: AbortSignal): Promise<void> =>
  usersResource.setUserBookmarkedRu(ruId, { signal });

/**
 * Removes a reporting unit bookmark (idempotent server-side).
 *
 * @param ruId - The reporting unit ID.
 * @param signal - Optional AbortSignal for cancellation.
 */
export const deleteUserBookmarkedRu = (ruId: number, signal?: AbortSignal): Promise<void> =>
  usersResource.deleteUserBookmarkedRu(ruId, { signal });
