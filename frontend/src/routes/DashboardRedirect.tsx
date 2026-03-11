import { useEffect, useRef, type FC } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const REDIRECT_KEYS = [
  'redirectAfterLogin',
  'returnTo',
  'redirectAfterLoginFallback',
  'returnToFallback',
] as const;

const readPersistedRedirect = (): string | null => {
  return (
    sessionStorage.getItem('redirectAfterLogin') ||
    sessionStorage.getItem('returnTo') ||
    localStorage.getItem('redirectAfterLoginFallback') ||
    localStorage.getItem('returnToFallback')
  );
};

const clearPersistedRedirect = () => {
  REDIRECT_KEYS.forEach((key) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  });
};

const isOAuthCallbackQuery = (search: string): boolean => {
  const params = new URLSearchParams(search);
  return params.has('code') && params.has('state');
};

const DashboardRedirect: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;

    const persistedRedirect = readPersistedRedirect();

    if (persistedRedirect) {
      clearPersistedRedirect();
      navigate(persistedRedirect, { replace: true });
      return;
    }

    if (isOAuthCallbackQuery(location.search)) {
      clearPersistedRedirect();
      navigate('/search', { replace: true });
      return;
    }

    clearPersistedRedirect();
    navigate(`/search${location.search}`, { replace: true });
  }, [location.search, navigate]);

  return null;
};

export default DashboardRedirect;
