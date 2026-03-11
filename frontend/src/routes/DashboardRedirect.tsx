import { useEffect, useRef, type FC } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { clearPersistedRedirect, readPersistedRedirect } from '@/routes/redirectStorage';

const isOAuthCallbackQuery = (search: string): boolean => {
  const params = new URLSearchParams(search);
  return params.has('code') && params.has('state');
};

const getSafeRedirectTarget = (value: string | null): string | null => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return null;
  }

  try {
    const parsed = new URL(value, globalThis.location.origin);

    if (parsed.origin !== globalThis.location.origin) {
      return null;
    }

    if (parsed.pathname === '/dashboard') {
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
};

const DashboardRedirect: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;

    const persistedRedirect = getSafeRedirectTarget(readPersistedRedirect());

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
