import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { queryClient, queryClientConfig } from './config';
import { noRetry } from './retry';
import { THREE_HOURS } from './TimeUnits';

describe('queryClientConfig', () => {
  it('should set refetchOnMount to false', () => {
    expect(queryClientConfig.defaultOptions?.queries?.refetchOnMount).toBe(false);
  });

  it('should set refetchOnWindowFocus to false', () => {
    expect(queryClientConfig.defaultOptions?.queries?.refetchOnWindowFocus).toBe(false);
  });

  it('should set staleTime to THREE_HOURS', () => {
    expect(queryClientConfig.defaultOptions?.queries?.staleTime).toBe(THREE_HOURS);
  });

  it('should set gcTime to THREE_HOURS', () => {
    expect(queryClientConfig.defaultOptions?.queries?.gcTime).toBe(THREE_HOURS);
  });

  it('should set retry to noRetry', () => {
    expect(queryClientConfig.defaultOptions?.queries?.retry).toBe(noRetry);
  });
});

describe('queryClient', () => {
  it('should be an instance of QueryClient', () => {
    expect(queryClient).toBeInstanceOf(QueryClient);
  });

  it('should use the exported config', () => {
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(THREE_HOURS);
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(noRetry);
  });
});
