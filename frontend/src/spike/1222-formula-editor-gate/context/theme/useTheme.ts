import { useMemo } from 'react';

export const useTheme = () => {
  return useMemo(() => ({ theme: 'light' as const }), []);
};
