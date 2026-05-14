/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import useSyncFiltersToSearchParams from './index';

let mockSearchStr = '';
const mockNavigate = vi.fn();

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useRouterState: ({ select }: { select: (s: { location: { searchStr: string } }) => unknown }) =>
      select({ location: { searchStr: mockSearchStr } }),
    useNavigate: () => mockNavigate,
  };
});

/** Extract the URLSearchParams from the last navigate call made by the hook. */
const getLastNavParams = (): URLSearchParams => {
  const call = mockNavigate.mock.calls.at(-1)?.[0] as { search?: any };
  const searchValues = typeof call?.search === 'function' ? call.search() : call?.search;
  return new URLSearchParams(Object.entries(searchValues ?? {}));
};

type Filters = {
  search?: string;
  status?: string[];
  district?: string[];
  active?: boolean;
  config?: Record<string, unknown>;
  count?: number;
  temp?: string;
  users?: UserOption[];
};

type UserOption = {
  code: string;
  description: string;
};

describe('useSyncFiltersToSearchParams', () => {
  beforeEach(() => {
    mockSearchStr = '';
    mockNavigate.mockClear();
  });

  // --- Hydration from URL ---

  it('shouldHydrateStringFilter_whenMountedWithUrlParams', () => {
    mockSearchStr = new URLSearchParams({ search: 'hello' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: '' });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.search).toBe('hello');
  });

  it('shouldHydrateFromUrl_whenInitialFiltersAreEmpty', () => {
    mockSearchStr = new URLSearchParams({ search: 'hello' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({});
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.search).toBe('hello');
  });

  it('shouldHydrateArrayFromCommaSeparated_whenMountedWithUrlParams', () => {
    mockSearchStr = new URLSearchParams({ status: 'open,closed' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ status: [] });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.status).toEqual(['open', 'closed']);
  });

  it('shouldHydrateBooleanTrue_whenMountedWithUrlParams', () => {
    mockSearchStr = new URLSearchParams({ active: 'true' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ active: false });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.active).toBe(true);
  });

  it('shouldHydrateBooleanFalse_whenMountedWithUrlParams', () => {
    mockSearchStr = new URLSearchParams({ active: 'false' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ active: true });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.active).toBe(false);
  });

  it('shouldHydrateJsonArray_whenMountedWithUrlParams', () => {
    mockSearchStr = new URLSearchParams({ district: '["d1","d2"]' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ district: [] });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.district).toEqual(['d1', 'd2']);
  });

  it('shouldHydrateJsonObject_whenMountedWithUrlParams', () => {
    mockSearchStr = new URLSearchParams({ config: '{"key":"value"}' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ config: {} });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.config).toEqual({ key: 'value' });
  });

  it('shouldHydrateTransformedValues_whenFromSearchParamProvided', () => {
    mockSearchStr = new URLSearchParams({ users: 'alpha,beta' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ users: [] });
      useSyncFiltersToSearchParams(filters, setFilters, {
        transforms: {
          users: {
            fromSearchParam: (value) =>
              Array.isArray(value)
                ? value.map((code) => ({
                    code: String(code),
                    description: `User ${String(code)}`,
                  }))
                : [],
          },
        },
      });
      return filters;
    });

    expect(result.current.users).toEqual([
      { code: 'alpha', description: 'User alpha' },
      { code: 'beta', description: 'User beta' },
    ]);
  });

  it('shouldHydrateAsNumber_whenDefaultTypeIsNumber', () => {
    mockSearchStr = new URLSearchParams({ count: '42' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ count: 0 });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.count).toBe(42);
    expect(typeof result.current.count).toBe('number');
  });

  it('shouldKeepAsString_whenDefaultTypeIsString', () => {
    mockSearchStr = new URLSearchParams({ search: '42' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: '' });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.search).toBe('42');
    expect(typeof result.current.search).toBe('string');
  });

  it('shouldNotCallSetFilters_whenUrlHasNoSearchParams', () => {
    mockSearchStr = '';
    const setFiltersSpy = vi.fn();

    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: '' });
      const wrappedSetFilters = (update: React.SetStateAction<Filters>) => {
        setFiltersSpy(update);
        setFilters(update);
      };
      useSyncFiltersToSearchParams(filters, wrappedSetFilters);
      return filters;
    });

    expect(setFiltersSpy).not.toHaveBeenCalled();
  });

  it('shouldFallBackToString_whenJsonParsingFails', () => {
    mockSearchStr = new URLSearchParams({ config: '{invalid-json' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ config: {} });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    // Should fall through to string since JSON parse fails
    expect(result.current.config).toBe('{invalid-json');
  });

  // --- Syncing filters to URL ---

  it('shouldSyncStringFilter_whenFilterChanges', () => {
    renderHook(
      ({ filters }: { filters: Filters }) => {
        const [state, setState] = useState<Filters>(filters);
        useSyncFiltersToSearchParams(state, setState);
        return { state, setState };
      },
      { initialProps: { filters: { search: 'test' } } },
    );

    // After initial render, setSearchParams should be called
    expect(mockNavigate).toHaveBeenCalled();
    const params = getLastNavParams();
    expect(params.get('search')).toBe('test');
  });

  it('shouldSyncArrayAsCommaSeparated_whenFilterChanges', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ status: ['open', 'closed'] });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(mockNavigate).toHaveBeenCalled();
    const params = getLastNavParams();
    expect(params.get('status')).toBe('open,closed');
  });

  it('shouldSyncObjectAsJson_whenFilterChanges', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ config: { key: 'value' } });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(mockNavigate).toHaveBeenCalled();
    const params = getLastNavParams();
    expect(params.get('config')).toBe('{"key":"value"}');
  });

  it('shouldSyncTransformedValues_whenToSearchParamProvided', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({
        users: [
          { code: 'alpha', description: 'User alpha' },
          { code: 'beta', description: 'User beta' },
        ],
      });
      useSyncFiltersToSearchParams(filters, setFilters, {
        transforms: {
          users: {
            toSearchParam: (value) => value?.map((item) => item.code) ?? [],
          },
        },
      });
      return filters;
    });

    expect(mockNavigate).toHaveBeenCalled();
    const params = getLastNavParams();
    expect(params.get('users')).toBe('alpha,beta');
  });

  it('shouldSyncBooleanFilter_whenFilterChanges', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ active: true });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(mockNavigate).toHaveBeenCalled();
    const params = getLastNavParams();
    expect(params.get('active')).toBe('true');
  });

  it('shouldSyncNumberFilter_whenFilterChanges', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ count: 42 });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(mockNavigate).toHaveBeenCalled();
    const params = getLastNavParams();
    expect(params.get('count')).toBe('42');
  });

  it('shouldPreserveUnrelatedQueryParams_whenSyncingFilters', () => {
    mockSearchStr = new URLSearchParams({ tab: 'details' }).toString();

    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: 'test' });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    const params = getLastNavParams();
    expect(params.get('tab')).toBe('details');
    expect(params.get('search')).toBe('test');
  });

  it('shouldNotCallSetSearchParams_whenParamsAreUnchanged', () => {
    mockSearchStr = new URLSearchParams({ search: 'same' }).toString();

    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: 'same' });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shouldUseReplaceTrue_whenSettingSearchParams', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: 'test' });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(mockNavigate.mock.calls.at(-1)?.[0]).toMatchObject({ replace: true });
  });

  // --- Empty values ---

  it('shouldOmitEmptyString_whenIncludeEmptyIsFalse', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: '', active: true });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    const params = getLastNavParams();
    expect(params.has('search')).toBe(false);
    expect(params.get('active')).toBe('true');
  });

  it('shouldOmitEmptyArray_whenIncludeEmptyIsFalse', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ status: [], search: 'hello' });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    const params = getLastNavParams();
    expect(params.has('status')).toBe(false);
    expect(params.get('search')).toBe('hello');
  });

  it('shouldOmitFalse_whenIncludeEmptyIsFalse', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ active: false, search: 'hi' });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    const params = getLastNavParams();
    expect(params.has('active')).toBe(false);
  });

  it('shouldOmitUndefinedAndNull_whenIncludeEmptyIsFalse', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({
        search: undefined,
        config: undefined,
        active: true,
      });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    const params = getLastNavParams();
    expect(params.has('search')).toBe(false);
    expect(params.has('config')).toBe(false);
    expect(params.get('active')).toBe('true');
  });

  it('shouldIncludeEmptyValues_whenIncludeEmptyIsTrue', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: '', active: false, status: [] });
      useSyncFiltersToSearchParams(filters, setFilters, { includeEmpty: true });
      return filters;
    });

    const params = getLastNavParams();
    expect(params.get('search')).toBe('');
    expect(params.get('active')).toBe('false');
    expect(params.get('status')).toBe('');
  });

  // --- Exclude option ---

  it('shouldExcludeSpecifiedKeys_whenExcludeOptionSet', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: 'hello', temp: 'local' });
      useSyncFiltersToSearchParams(filters, setFilters, { exclude: ['temp'] });
      return filters;
    });

    const params = getLastNavParams();
    expect(params.get('search')).toBe('hello');
    expect(params.has('temp')).toBe(false);
  });

  it('shouldExcludeKeysFromHydration_whenExcludeOptionSet', () => {
    mockSearchStr = new URLSearchParams({ search: 'hello', temp: 'from-url' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: '', temp: 'default' });
      useSyncFiltersToSearchParams(filters, setFilters, { exclude: ['temp'] });
      return filters;
    });

    expect(result.current.search).toBe('hello');
    expect(result.current.temp).toBe('default');
  });

  // --- Hydration happens only once ---

  it('shouldHydrateOnlyOnce_whenMountedAndUrlChanges', () => {
    mockSearchStr = new URLSearchParams({ search: 'initial' }).toString();
    const setFiltersSpy = vi.fn();

    const { rerender } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: '' });
      const wrappedSetFilters = (update: React.SetStateAction<Filters>) => {
        setFiltersSpy(update);
        setFilters(update);
      };
      useSyncFiltersToSearchParams(filters, wrappedSetFilters);
      return filters;
    });

    // Called once on mount for hydration
    expect(setFiltersSpy).toHaveBeenCalledTimes(1);

    // Rerender - should not hydrate again
    setFiltersSpy.mockClear();
    rerender();
    expect(setFiltersSpy).not.toHaveBeenCalled();
  });

  // --- Filter updates sync to URL ---

  it('shouldUpdateUrl_whenFiltersChange', () => {
    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: 'first' });
      useSyncFiltersToSearchParams(filters, setFilters);
      return { filters, setFilters };
    });

    mockNavigate.mockClear();

    act(() => {
      result.current.setFilters({ search: 'second' });
    });

    expect(mockNavigate).toHaveBeenCalled();
    const params = getLastNavParams();
    expect(params.get('search')).toBe('second');
  });

  it('shouldRemoveUrlParam_whenFilterKeyRemoved', () => {
    mockSearchStr = new URLSearchParams({ search: 'first', tab: 'details' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: 'first' });
      useSyncFiltersToSearchParams(filters, setFilters);
      return { filters, setFilters };
    });

    mockNavigate.mockClear();

    act(() => {
      result.current.setFilters({});
    });

    expect(mockNavigate).toHaveBeenCalled();
    const params = getLastNavParams();
    expect(params.has('search')).toBe(false);
    expect(params.get('tab')).toBe('details');
  });

  // --- Multiple filters ---

  it('shouldSyncMultipleFilters_whenMultipleFiltersChange', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({
        search: 'query',
        status: ['open'],
        active: true,
        district: ['d1', 'd2'],
      });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    const params = getLastNavParams();
    expect(params.get('search')).toBe('query');
    expect(params.get('status')).toBe('open');
    expect(params.get('active')).toBe('true');
    expect(params.get('district')).toBe('d1,d2');
  });

  it('shouldHydrateMultipleFilters_whenMountedWithMultipleUrlParams', () => {
    mockSearchStr = new URLSearchParams({
      search: 'query',
      status: 'open,closed',
      active: 'true',
    }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({
        search: '',
        status: [],
        active: false,
      });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.search).toBe('query');
    expect(result.current.status).toEqual(['open', 'closed']);
    expect(result.current.active).toBe(true);
  });

  // --- Merging behavior ---

  it('shouldMergeHydratedValues_whenUrlParamsOverlapWithDefaults', () => {
    mockSearchStr = new URLSearchParams({ search: 'from-url' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({
        search: 'default',
        active: true,
        status: ['pending'],
      });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    // search should be overridden by URL
    expect(result.current.search).toBe('from-url');
    // active and status should keep defaults since they are not in URL
    expect(result.current.active).toBe(true);
    expect(result.current.status).toEqual(['pending']);
  });

  // --- Deserialization edge case: comma in value with dot ---

  it('shouldNotSplitDotsInCommaSeparated_whenFilterContainsDots', () => {
    mockSearchStr = new URLSearchParams({ search: '1,234.56' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: '' });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    // Contains a dot, so the heuristic should keep it as a string
    expect(result.current.search).toBe('1,234.56');
  });

  // --- Deserialization: default comma-split path (non-array default) ---

  it('shouldSplitCommaString_whenDefaultTypeIsStringAndValueContainsCommaWithoutDot', () => {
    // expectedValue is '' (string) — not boolean/number/array — falls to default heuristic
    mockSearchStr = new URLSearchParams({ search: 'a,b,c' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: '' });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.search).toEqual(['a', 'b', 'c']);
  });

  // --- Deserialization: array default with empty string value ---

  it('shouldReturnEmptyArray_whenArrayDefaultAndUrlValueIsEmptyString', () => {
    mockSearchStr = new URLSearchParams({ status: '' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ status: [] });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.status).toEqual([]);
  });

  // --- Deserialization: number default with non-numeric string ---

  it('shouldReturnOriginalString_whenNumberDefaultAndValueIsNonNumeric', () => {
    mockSearchStr = new URLSearchParams({ count: 'not-a-number' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ count: 0 });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    // Number('not-a-number') === NaN → !isNaN is false → returns original string
    expect(result.current.count).toBe('not-a-number');
  });

  // --- Deserialization: boolean default with non-boolean string ---

  it('shouldReturnFalse_whenBooleanDefaultAndUrlValueIsNonBooleanString', () => {
    // typeof expectedValue === 'boolean' triggers the boolean branch
    // return value === 'true' — 'yes' !== 'true' → false
    mockSearchStr = new URLSearchParams({ active: 'yes' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ active: true });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.active).toBe(false);
  });

  // --- Hydration: unknown URL key skipped inside setFilters callback ---

  it('shouldSkipUnknownUrlKey_whenHydratingAndKnownKeyIsAlsoPresent', () => {
    // 'search' triggers hasHydrationParams=true; 'unknownKey' not in filters → skipped
    mockSearchStr = new URLSearchParams({ search: 'hello', unknownKey: 'ignored' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: '' });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.search).toBe('hello');
    expect((result.current as any).unknownKey).toBeUndefined();
  });

  // --- Hydration: all URL params excluded → hasHydrationParams stays false ---

  it('shouldNotHydrate_whenAllUrlParamsAreExcluded', () => {
    mockSearchStr = new URLSearchParams({ temp: 'should-be-ignored' }).toString();
    const setFiltersSpy = vi.fn();

    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ temp: 'default' });
      const wrapped = (update: React.SetStateAction<Filters>) => {
        setFiltersSpy(update);
        setFilters(update);
      };
      useSyncFiltersToSearchParams(filters, wrapped, { exclude: ['temp'] });
      return filters;
    });

    expect(setFiltersSpy).not.toHaveBeenCalled();
  });

  // --- Transform without fromSearchParam → falls back to deserializeValue result ---

  it('shouldUseDeserializedValue_whenTransformHasToSearchParamButNoFromSearchParam', () => {
    mockSearchStr = new URLSearchParams({ users: 'alpha,beta' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ users: [] });
      useSyncFiltersToSearchParams(filters, setFilters, {
        transforms: {
          users: {
            toSearchParam: (value) => value?.map((u) => u.code) ?? [],
            // no fromSearchParam — hook falls back to deserializeValue
          },
        },
      });
      return filters;
    });

    // Array default + comma string → split by default deserialization
    expect(result.current.users).toEqual(['alpha', 'beta']);
  });
});
