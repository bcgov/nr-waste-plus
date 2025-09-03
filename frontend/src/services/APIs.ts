import { getUserTokenFromCookie } from '@/context/auth/authUtils';
import { env } from '@/env';
import { SearchService } from '@/services//search.service';
import { ForestClientService } from '@/services/forestclient.service';
import { UserService } from '@/services/users.service';

import { CodesService } from './codes.service';

import type { APIConfig } from '@/config/api/types';

export const BackendApiConfig: APIConfig = {
  BASE: env.VITE_BACKEND_URL,
  VERSION: '0',
  WITH_CREDENTIALS: true,
  CREDENTIALS: 'include',
  TOKEN: getUserTokenFromCookie(),
  USERNAME: undefined,
  PASSWORD: undefined,
  HEADERS: undefined,
  ENCODE_PATH: undefined,
};

BackendApiConfig.TOKEN = async () => {
  return getUserTokenFromCookie() ?? '';
};

// Register all services here
const serviceConstructors = {
  user: new UserService(BackendApiConfig),
  search: new SearchService(BackendApiConfig),
  codes: new CodesService(BackendApiConfig),
  forestclient: new ForestClientService(BackendApiConfig),
} as const;

type ExternalApiType = {
  [K in keyof typeof serviceConstructors]: (typeof serviceConstructors)[K];
};

const API: ExternalApiType = serviceConstructors;

export default API;
