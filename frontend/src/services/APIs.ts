import { CodesService } from './codes.service';

import type { APIConfig } from '@/config/api/types';

import { failureNotificationMiddleware } from '@/config/api/failureNotificationMiddleware';
import { problemDetailsMiddleware } from '@/config/api/problemDetailsMiddleware';
import { getUserAccessTokenFromCookie } from '@/context/auth/authUtils';
import { env } from '@/env';
import { SearchService } from '@/services//search.service';
import { ForestClientService } from '@/services/forestclient.service';
import { UserService } from '@/services/users.service';
import { getB3Headers } from '@/services/utils';

/**
 * Base configuration shared by all generated backend service clients.
 */
export const BackendApiConfig: APIConfig = {
  BASE: env.VITE_BACKEND_URL,
  VERSION: '0',
  WITH_CREDENTIALS: true,
  CREDENTIALS: 'include',
  TOKEN: undefined,
  USERNAME: undefined,
  PASSWORD: undefined,
  HEADERS: undefined,
  ENCODE_PATH: undefined,
  MIDDLEWARE: [problemDetailsMiddleware(), failureNotificationMiddleware()],
};

BackendApiConfig.TOKEN = async () => {
  return getUserAccessTokenFromCookie() ?? '';
};

BackendApiConfig.HEADERS = async () => {
  return getB3Headers();
};

/**
 * Lazily configured service instances available to the frontend.
 */
const serviceConstructors = {
  user: new UserService(BackendApiConfig),
  search: new SearchService(BackendApiConfig),
  codes: new CodesService(BackendApiConfig),
  forestclient: new ForestClientService(BackendApiConfig),
} as const;

type ExternalApiType = {
  [K in keyof typeof serviceConstructors]: (typeof serviceConstructors)[K];
};

/**
 * Registry of backend service clients used throughout the application.
 */
const API: ExternalApiType = serviceConstructors;

export default API;
