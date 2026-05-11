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
  const call = mockNavigate.mock.calls.at(-1)?.[0] as { search?: () => Record<string, string> };
  return new URLSearchParams(Object.entries(call?.search?.() ?? {}));
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

  it('hydrates string filter from URL on mount', () => {
    mockSearchStr = new URLSearchParams({ search: 'hello' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: '' });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.search).toBe('hello');
  });

  it('hydrates values from URL when initial filters are empty object', () => {
    mockSearchStr = new URLSearchParams({ search: 'hello' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({});
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.search).toBe('hello');
  });

  it('hydrates comma-separated values as arrays from URL on mount', () => {
    mockSearchStr = new URLSearchParams({ status: 'open,closed' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ status: [] });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.status).toEqual(['open', 'closed']);
  });

  it('hydrates boolean true from URL on mount', () => {
    mockSearchStr = new URLSearchParams({ active: 'true' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ active: false });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.active).toBe(true);
  });

  it('hydrates boolean false from URL on mount', () => {
    mockSearchStr = new URLSearchParams({ active: 'false' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ active: true });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.active).toBe(false);
  });

  it('hydrates JSON array from URL on mount', () => {
    mockSearchStr = new URLSearchParams({ district: '["d1","d2"]' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ district: [] });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.district).toEqual(['d1', 'd2']);
  });

  it('hydrates JSON object from URL on mount', () => {
    mockSearchStr = new URLSearchParams({ config: '{"key":"value"}' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ config: {} });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.config).toEqual({ key: 'value' });
  });

  it('hydrates transformed array values from URL on mount', () => {
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

  it('hydrates numeric string as number when default type is number', () => {
    mockSearchStr = new URLSearchParams({ count: '42' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ count: 0 });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.count).toBe(42);
    expect(typeof result.current.count).toBe('number');
  });

  it('keeps numeric-looking value as string when default type is string', () => {
    mockSearchStr = new URLSearchParams({ search: '42' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: '' });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.search).toBe('42');
    expect(typeof result.current.search).toBe('string');
  });

  it('does not call setFilters when URL has no search params', () => {
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

  it('falls back to string when JSON parsing fails for bracket-starting value', () => {
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

  it('syncs string filter to URL params', () => {
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

  it('syncs array filter as comma-separated values to URL', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ status: ['open', 'closed'] });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(mockNavigate).toHaveBeenCalled();
    const params = getLastNavParams();
    expect(params.get('status')).toBe('open,closed');
  });

  it('syncs object filter as JSON to URL', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ config: { key: 'value' } });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(mockNavigate).toHaveBeenCalled();
    const params = getLastNavParams();
    expect(params.get('config')).toBe('{"key":"value"}');
  });

  it('syncs transformed array filters as URL-safe values', () => {
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

  it('syncs boolean filter to URL', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ active: true });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(mockNavigate).toHaveBeenCalled();
    const params = getLastNavParams();
    expect(params.get('active')).toBe('true');
  });

  it('syncs number filter to URL', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ count: 42 });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(mockNavigate).toHaveBeenCalled();
    const params = getLastNavParams();
    expect(params.get('count')).toBe('42');
  });

  it('preserves unrelated existing query params when syncing filters', () => {
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

  it('does not call setSearchParams when computed params are unchanged', () => {
    mockSearchStr = new URLSearchParams({ search: 'same' }).toString();

    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: 'same' });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('uses replace: true when setting search params', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: 'test' });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(mockNavigate.mock.calls.at(-1)?.[0]).toMatchObject({ replace: true });
  });

  // --- Empty values ---

  it('omits empty string from URL by default', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: '', active: true });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    const params = getLastNavParams();
    expect(params.has('search')).toBe(false);
    expect(params.get('active')).toBe('true');
  });

  it('omits empty array from URL by default', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ status: [], search: 'hello' });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    const params = getLastNavParams();
    expect(params.has('status')).toBe(false);
    expect(params.get('search')).toBe('hello');
  });

  it('omits false from URL by default', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ active: false, search: 'hi' });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    const params = getLastNavParams();
    expect(params.has('active')).toBe(false);
  });

  it('omits undefined and null from URL by default', () => {
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

  it('includes empty values when includeEmpty is true', () => {
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

  it('excludes specified keys from URL sync', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: 'hello', temp: 'local' });
      useSyncFiltersToSearchParams(filters, setFilters, { exclude: ['temp'] });
      return filters;
    });

    const params = getLastNavParams();
    expect(params.get('search')).toBe('hello');
    expect(params.has('temp')).toBe(false);
  });

  it('excludes specified keys from hydration', () => {
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

  it('hydrates from URL only on initial mount', () => {
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

  it('updates URL when filters change', () => {
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

  it('removes URL param when filter key is removed from state', () => {
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

  it('syncs multiple filters to URL simultaneously', () => {
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

  it('hydrates multiple filters from URL simultaneously', () => {
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

  it('merges hydrated values with existing filter defaults', () => {
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

  it('does not split comma-separated values containing dots', () => {
    mockSearchStr = new URLSearchParams({ search: '1,234.56' }).toString();

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: '' });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    // Contains a dot, so the heuristic should keep it as a string
    expect(result.current.search).toBe('1,234.56');
  });
});
