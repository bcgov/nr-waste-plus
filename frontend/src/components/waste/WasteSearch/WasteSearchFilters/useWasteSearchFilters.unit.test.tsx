import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import useSyncPreferencesToFilters from '@/hooks/useSyncPreferencesToFilters';
import { searchParamCodec, validateWasteSearch } from '@/routes/searchParams';

import { useWasteSearchFilters } from './useWasteSearchFilters';

vi.mock('@/hooks/useSyncPreferencesToFilters', () => ({
  default: vi.fn(),
}));

/**
 * Router wrapper that mounts a real `/search` route with the production
 * `validateSearch` schema and codec, so hooks read the URL through the same
 * pipeline as the application.
 */
function createSearchRouterWrapper(initialPath: string) {
  return function SearchRouterWrapper({ children }: { children: ReactNode }) {
    const [router] = useState(() => {
      const rootRoute = createRootRoute({ component: () => <Outlet /> });
      const searchRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/search',
        validateSearch: validateWasteSearch,
        component: () => <>{children}</>,
      });
      return createRouter({
        routeTree: rootRoute.addChildren([searchRoute]),
        history: createMemoryHistory({ initialEntries: [initialPath] }),
        ...searchParamCodec,
      });
    });
    return <RouterProvider router={router} />;
  };
}

/**
 * Mounts the hook and waits for the router to render the matched route —
 * RouterProvider resolves matches asynchronously, so the first synchronous
 * render completes before the hook's component tree exists.
 */
async function mountHook(path = '/search') {
  const rendered = renderHook(() => useWasteSearchFilters(), {
    wrapper: createSearchRouterWrapper(path),
  });
  await waitFor(() => {
    expect(rendered.result.current).not.toBeNull();
  });
  return rendered;
}

describe('useWasteSearchFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('URL hydration', () => {
    it('shouldDeriveFiltersFromUrlSearch_whenMountedWithParams', async () => {
      const { result } = await mountHook(
        '/search?mainSearchTerm=abc&district=DCC,DSC&legacy=false',
      );

      expect(result.current.filters.mainSearchTerm).toBe('abc');
      expect(result.current.filters.district).toEqual(['DCC', 'DSC']);
      expect(result.current.filters.legacy).toBe(false);
    });

    it('shouldSeedLegacyTrue_whenMountedOnBareSearch', async () => {
      const { result } = await mountHook('/search');

      // The source flag is always explicit in the URL: the toggle defaults to ON.
      await waitFor(() => {
        expect(result.current.filters).toEqual({ legacy: true });
      });
    });

    it('shouldNotReseedLegacy_whenUrlAlreadyCarriesTheFlag', async () => {
      const { result } = await mountHook('/search?legacy=false');

      expect(result.current.filters.legacy).toBe(false);
    });

    it('shouldDegradeMalformedValuesToUndefined_whenUrlCarriesGarbage', async () => {
      const { result } = await mountHook('/search?multiMark=garbage&requestByMe=yes');

      expect(result.current.filters.multiMark).toBeUndefined();
      expect(result.current.filters.requestByMe).toBeUndefined();
    });

    it('shouldCoerceNumericSearchTermsBackToStrings_whenUrlCarriesDigits', async () => {
      const { result } = await mountHook('/search?mainSearchTerm=12345');

      expect(result.current.filters.mainSearchTerm).toBe('12345');
    });
  });

  describe('modal state', () => {
    it('shouldReturnFalseForIsAdvancedSearchOpen_whenInitialized', async () => {
      const { result } = await mountHook('/search');

      expect(result.current.isAdvancedSearchOpen).toBe(false);
    });

    it('shouldToggleModalState_whenSetIsAdvancedSearchOpenCalled', async () => {
      const { result } = await mountHook('/search');

      act(() => {
        result.current.setIsAdvancedSearchOpen(true);
      });

      expect(result.current.isAdvancedSearchOpen).toBe(true);

      act(() => {
        result.current.setIsAdvancedSearchOpen(false);
      });

      expect(result.current.isAdvancedSearchOpen).toBe(false);
    });
  });

  describe('filter updates (routed through the URL)', () => {
    it('shouldUpdateFilterKey_whenHandleStringChangeCalled', async () => {
      const { result } = await mountHook('/search');

      act(() => {
        result.current.handleStringChange('mainSearchTerm')('search text');
      });

      await waitFor(() => {
        expect(result.current.filters.mainSearchTerm).toBe('search text');
      });
    });

    it('shouldDropEmptyStringValueFromUrl_whenHandleStringChangeCalledWithEmpty', async () => {
      const { result } = await mountHook('/search?mainSearchTerm=abc');

      act(() => {
        result.current.handleStringChange('mainSearchTerm')('');
      });

      await waitFor(() => {
        expect(result.current.filters.mainSearchTerm).toBeUndefined();
      });
    });

    it('shouldMapSelectedItemsToCodes_whenHandleActiveMultiSelectChangeCalled', async () => {
      const { result } = await mountHook('/search');

      act(() => {
        result.current.handleActiveMultiSelectChange('sampling')({
          selectedItems: [
            { code: 'A', description: 'Option A' },
            { code: 'B', description: 'Option B' },
          ],
        });
      });

      await waitFor(() => {
        expect(result.current.filters.sampling).toEqual(['A', 'B']);
      });
    });

    it('shouldClearArrayKey_whenHandleActiveMultiSelectChangeWithEmptySelection', async () => {
      const { result } = await mountHook('/search?sampling=A,B');

      act(() => {
        result.current.handleActiveMultiSelectChange('sampling')({ selectedItems: [] });
      });

      await waitFor(() => {
        expect(result.current.filters.sampling).toBeUndefined();
      });
    });

    it('shouldKeepLegacyFalseOnTheWire_whenToggledToPostgresSource', async () => {
      const { result } = await mountHook('/search');

      act(() => {
        result.current.handleChange('legacy')(false);
      });

      await waitFor(() => {
        expect(result.current.filters.legacy).toBe(false);
      });

      act(() => {
        result.current.handleChange('legacy')(true);
      });

      await waitFor(() => {
        expect(result.current.filters.legacy).toBe(true);
      });
    });

    it('shouldDropUncheckedCheckboxesFromTheUrl_whenSetToFalse', async () => {
      const { result } = await mountHook('/search?requestByMe=true&multiMark=true');

      expect(result.current.filters.requestByMe).toBe(true);

      act(() => {
        result.current.handleChange('requestByMe')(false);
      });

      await waitFor(() => {
        expect(result.current.filters.requestByMe).toBeUndefined();
      });

      // The untouched sibling checkbox stays put.
      expect(result.current.filters.multiMark).toBe(true);
    });

    it('shouldRemoveKey_whenOnRemoveFilterCalledWithoutValue', async () => {
      const { result } = await mountHook('/search?mainSearchTerm=remove-me');

      act(() => {
        result.current.onRemoveFilter('mainSearchTerm', undefined);
      });

      await waitFor(() => {
        expect(result.current.filters.mainSearchTerm).toBeUndefined();
      });
    });

    it('shouldRemoveOnlySpecifiedItem_whenOnRemoveFilterCalledWithValue', async () => {
      const { result } = await mountHook('/search?sampling=A,B,C');

      act(() => {
        result.current.onRemoveFilter('sampling', 'B');
      });

      await waitFor(() => {
        expect(result.current.filters.sampling).toEqual(['A', 'C']);
      });
    });

    it('shouldKeepOtherKeys_whenOnRemoveFilterCalled', async () => {
      const { result } = await mountHook('/search?sampling=A,B&district=D1');

      act(() => {
        result.current.onRemoveFilter('sampling', 'A');
      });

      await waitFor(() => {
        expect(result.current.filters.district).toEqual(['D1']);
      });
    });

    it('shouldReturnAllHandlerFunctions_whenInitialized', async () => {
      const { result } = await mountHook('/search');

      expect(typeof result.current.handleStringChange).toBe('function');
      expect(typeof result.current.handleActiveMultiSelectChange).toBe('function');
      expect(typeof result.current.handleChange).toBe('function');
      expect(typeof result.current.onRemoveFilter).toBe('function');
      expect(typeof result.current.setIsAdvancedSearchOpen).toBe('function');
    });
  });

  describe('useSyncPreferencesToFilters callback', () => {
    it('shouldReturnViewShapedItems_whenKeyIsSelectedClient', async () => {
      await mountHook('/search');
      const calls = vi.mocked(useSyncPreferencesToFilters).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const transformFn = calls[0][2]!;
      // Bare client-number strings are wrapped so viewDtoToSearch can read `.code`.
      expect(transformFn('selectedClient', '100')).toEqual([{ code: '100', description: '100' }]);
    });

    it('shouldPassViewShapedPreferenceThrough_whenSelectedClientIsAnObject', async () => {
      await mountHook('/search');
      const calls = vi.mocked(useSyncPreferencesToFilters).mock.calls;
      const transformFn = calls[0][2]!;
      // Real preference payloads arrive already view-shaped — String() coercion
      // would corrupt them into "[object Object]".
      expect(
        transformFn('selectedClient', {
          code: '90000003',
          description: '90000003 OAK HERITAGE LTD. (OAK)',
        }),
      ).toEqual([{ code: '90000003', description: '90000003 OAK HERITAGE LTD. (OAK)' }]);
    });

    it('shouldReturnEmptyArray_whenKeyIsSelectedClientAndValueIsFalsy', async () => {
      await mountHook('/search');
      const calls = vi.mocked(useSyncPreferencesToFilters).mock.calls;
      const transformFn = calls[0][2]!;
      expect(transformFn('selectedClient', '')).toEqual([]);
    });

    it('shouldReturnValueAsArray_whenKeyIsSelectedDistrict', async () => {
      await mountHook('/search');
      const calls = vi.mocked(useSyncPreferencesToFilters).mock.calls;
      const transformFn = calls[0][2]!;
      expect(transformFn('selectedDistrict', 'DT01')).toEqual(['DT01']);
    });

    it('shouldReturnValuePassthrough_whenKeyIsUnknown', async () => {
      await mountHook('/search');
      const calls = vi.mocked(useSyncPreferencesToFilters).mock.calls;
      const transformFn = calls[0][2]!;
      expect(transformFn('someOtherKey' as never, 'raw-value')).toBe('raw-value');
    });
  });
});
