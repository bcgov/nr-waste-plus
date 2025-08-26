import { getUserTokenFromCookie } from '@/context/auth/authUtils';
import { UserService } from '@/services/users.service';

import type { APIConfig } from '@/config/api/types';

export const BackendApiConfig: APIConfig = {
  BASE: 'http://localhost:8080',
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
} as const;

type ExternalApiType = {
  [K in keyof typeof serviceConstructors]: (typeof serviceConstructors)[K];
};

const API: ExternalApiType = serviceConstructors;

export default API;
