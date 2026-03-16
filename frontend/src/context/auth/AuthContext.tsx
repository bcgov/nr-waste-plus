import { createContext, type ReactNode } from 'react';

import type { FamLoginUser, IdpProviderType } from './types';

/**
 * Shape of the authentication context exposed to consumers.
 */
export type AuthContextType = {
  user: FamLoginUser | undefined;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (provider: IdpProviderType) => void;
  logout: () => void;
  userToken: () => string | undefined;
  getClients: () => string[];
};

/**
 * Props accepted by the auth provider.
 */
export type AuthProviderProps = {
  children: ReactNode;
};

/**
 * React context storing the current auth state and actions.
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
