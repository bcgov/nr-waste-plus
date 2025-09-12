import { createContext, type ReactNode } from 'react';

import type { FamLoginUser, IdpProviderType } from './types';

export type AuthContextType = {
  user: FamLoginUser | undefined;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (provider: IdpProviderType) => void;
  logout: () => void;
  userToken: () => string | undefined;
  getClients: () => string[];
};

export type AuthProviderProps = {
  children: ReactNode;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
