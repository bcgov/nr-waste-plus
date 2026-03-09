import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import useSyncFiltersToSearchParams from './index';

let mockSearchParams = new URLSearchParams();
const mockSetSearchParams = vi.fn();

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
}));

type Filters = {
  search?: string;
  status?: string[];
  district?: string[];
  active?: boolean;
  config?: Record<string, unknown>;
  count?: number;
  temp?: string;
};

describe('useSyncFiltersToSearchParams', () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    mockSetSearchParams.mockClear();
  });

  // --- Hydration from URL ---

  it('hydrates string filter from URL on mount', () => {
    mockSearchParams = new URLSearchParams({ search: 'hello' });

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: '' });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.search).toBe('hello');
  });

  it('hydrates comma-separated values as arrays from URL on mount', () => {
    mockSearchParams = new URLSearchParams({ status: 'open,closed' });

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ status: [] });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.status).toEqual(['open', 'closed']);
  });

  it('hydrates boolean true from URL on mount', () => {
    mockSearchParams = new URLSearchParams({ active: 'true' });

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ active: false });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.active).toBe(true);
  });

  it('hydrates boolean false from URL on mount', () => {
    mockSearchParams = new URLSearchParams({ active: 'false' });

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ active: true });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.active).toBe(false);
  });

  it('hydrates JSON array from URL on mount', () => {
    mockSearchParams = new URLSearchParams({ district: '["d1","d2"]' });

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ district: [] });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.district).toEqual(['d1', 'd2']);
  });

  it('hydrates JSON object from URL on mount', () => {
    mockSearchParams = new URLSearchParams({ config: '{"key":"value"}' });

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ config: {} });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(result.current.config).toEqual({ key: 'value' });
  });

  it('does not call setFilters when URL has no search params', () => {
    mockSearchParams = new URLSearchParams();
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
    mockSearchParams = new URLSearchParams({ config: '{invalid-json' });

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
    const { result, rerender } = renderHook(
      ({ filters }: { filters: Filters }) => {
        const [state, setState] = useState<Filters>(filters);
        useSyncFiltersToSearchParams(state, setState);
        return { state, setState };
      },
      { initialProps: { filters: { search: 'test' } } },
    );

    // After initial render, setSearchParams should be called
    expect(mockSetSearchParams).toHaveBeenCalled();
    const lastCall = mockSetSearchParams.mock.calls.at(-1);
    const params = lastCall?.[0] as URLSearchParams;
    expect(params.get('search')).toBe('test');
  });

  it('syncs array filter as comma-separated values to URL', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ status: ['open', 'closed'] });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(mockSetSearchParams).toHaveBeenCalled();
    const lastCall = mockSetSearchParams.mock.calls.at(-1);
    const params = lastCall?.[0] as URLSearchParams;
    expect(params.get('status')).toBe('open,closed');
  });

  it('syncs object filter as JSON to URL', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ config: { key: 'value' } });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(mockSetSearchParams).toHaveBeenCalled();
    const lastCall = mockSetSearchParams.mock.calls.at(-1);
    const params = lastCall?.[0] as URLSearchParams;
    expect(params.get('config')).toBe('{"key":"value"}');
  });

  it('syncs boolean filter to URL', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ active: true });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(mockSetSearchParams).toHaveBeenCalled();
    const lastCall = mockSetSearchParams.mock.calls.at(-1);
    const params = lastCall?.[0] as URLSearchParams;
    expect(params.get('active')).toBe('true');
  });

  it('syncs number filter to URL', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ count: 42 });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    expect(mockSetSearchParams).toHaveBeenCalled();
    const lastCall = mockSetSearchParams.mock.calls.at(-1);
    const params = lastCall?.[0] as URLSearchParams;
    expect(params.get('count')).toBe('42');
  });

  it('uses replace: true when setting search params', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: 'test' });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    const lastCall = mockSetSearchParams.mock.calls.at(-1);
    expect(lastCall?.[1]).toEqual({ replace: true });
  });

  // --- Empty values ---

  it('omits empty string from URL by default', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: '', active: true });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    const lastCall = mockSetSearchParams.mock.calls.at(-1);
    const params = lastCall?.[0] as URLSearchParams;
    expect(params.has('search')).toBe(false);
    expect(params.get('active')).toBe('true');
  });

  it('omits empty array from URL by default', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ status: [], search: 'hello' });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    const lastCall = mockSetSearchParams.mock.calls.at(-1);
    const params = lastCall?.[0] as URLSearchParams;
    expect(params.has('status')).toBe(false);
    expect(params.get('search')).toBe('hello');
  });

  it('omits false from URL by default', () => {
    renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ active: false, search: 'hi' });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    const lastCall = mockSetSearchParams.mock.calls.at(-1);
    const params = lastCall?.[0] as URLSearchParams;
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

    const lastCall = mockSetSearchParams.mock.calls.at(-1);
    const params = lastCall?.[0] as URLSearchParams;
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

    const lastCall = mockSetSearchParams.mock.calls.at(-1);
    const params = lastCall?.[0] as URLSearchParams;
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

    const lastCall = mockSetSearchParams.mock.calls.at(-1);
    const params = lastCall?.[0] as URLSearchParams;
    expect(params.get('search')).toBe('hello');
    expect(params.has('temp')).toBe(false);
  });

  it('excludes specified keys from hydration', () => {
    mockSearchParams = new URLSearchParams({ search: 'hello', temp: 'from-url' });

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
    mockSearchParams = new URLSearchParams({ search: 'initial' });
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

    mockSetSearchParams.mockClear();

    act(() => {
      result.current.setFilters({ search: 'second' });
    });

    expect(mockSetSearchParams).toHaveBeenCalled();
    const lastCall = mockSetSearchParams.mock.calls.at(-1);
    const params = lastCall?.[0] as URLSearchParams;
    expect(params.get('search')).toBe('second');
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

    const lastCall = mockSetSearchParams.mock.calls.at(-1);
    const params = lastCall?.[0] as URLSearchParams;
    expect(params.get('search')).toBe('query');
    expect(params.get('status')).toBe('open');
    expect(params.get('active')).toBe('true');
    expect(params.get('district')).toBe('d1,d2');
  });

  it('hydrates multiple filters from URL simultaneously', () => {
    mockSearchParams = new URLSearchParams({
      search: 'query',
      status: 'open,closed',
      active: 'true',
    });

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
    mockSearchParams = new URLSearchParams({ search: 'from-url' });

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
    mockSearchParams = new URLSearchParams({ search: '1,234.56' });

    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ search: '' });
      useSyncFiltersToSearchParams(filters, setFilters);
      return filters;
    });

    // Contains a dot, so the heuristic should keep it as a string
    expect(result.current.search).toBe('1,234.56');
  });
});
