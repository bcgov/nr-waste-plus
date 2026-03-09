import { useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Syncs a filter object with URL search parameters bidirectionally.
 *
 * This hook manages bidirectional synchronization between a filter state object and URL search parameters.
 * On component mount, it hydrates the filter state from the URL search params. As filters change,
 * they are automatically serialized into URL params, enabling:
 * - Persistent filter state across page reloads
 * - Shareable URLs with active filters pre-populated
 * - Browser back/forward navigation support
 * - Scalable filter management without prop drilling
 *
 * @template T - The filter state object type
 * @param filters - The current filter state object (must be from useState)
 * @param setFilters - React state setter function to update filters
 * @param options - Configuration options
 * @param options.exclude - Array of filter keys to exclude from URL syncing (e.g., temporary/local-only filters)
 * @param options.includeEmpty - Whether to include empty/falsy values in URL params (default: false)
 *
 * @example
 * ```tsx
 * const [filters, setFilters] = useState<FilterDto>({
 *   search: '',
 *   status: [],
 *   district: [],
 * });
 *
 * // Sync filters with URL, excluding the temporary search field
 * useSyncFiltersToSearchParams(filters, setFilters, {
 *   exclude: ['tempSearchValue'],
 *   includeEmpty: false,
 * });
 *
 * return (
 *   <FilterComponent filters={filters} onChange={setFilters} />
 * );
 * ```
 *
 * Serialization rules:
 * - Arrays are serialized as comma-separated values
 * - Objects are serialized as JSON
 * - Strings, numbers, and booleans are serialized as-is
 * - Empty values are removed from URL unless includeEmpty is true
 *
 * Deserialization rules:
 * - Values starting with '[' or '{' are parsed as JSON
 * - 'true'/'false' strings are converted to booleans
 * - Comma-separated values are split into arrays
 * - Other values remain as strings
 */
const useSyncFiltersToSearchParams = <T extends Record<string, unknown>>(
  filters: T,
  setFilters: React.Dispatch<React.SetStateAction<T>>,
  options?: {
    exclude?: (keyof T)[];
    includeEmpty?: boolean;
  },
): void => {
  const [searchParams, setSearchParams] = useSearchParams();
  const excludeSet = useMemo(() => new Set(options?.exclude ?? []), [options?.exclude]);
  const includeEmpty = options?.includeEmpty ?? false;
  const hasHydratedRef = useRef(false);
  /**
   * Deserialize URL parameter values to appropriate types
   */
  const deserializeValue = (value: string): unknown => {
    // Try JSON parsing first
    if (value.startsWith('[') || value.startsWith('{')) {
      try {
        return JSON.parse(value);
      } catch {
        // Fall through if JSON parsing fails
      }
    }

    // Boolean strings
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Comma-separated arrays (but not strings that happen to contain commas)
    if (value.includes(',') && !value.includes('.')) {
      // Simple heuristic: comma-separated arrays, but avoid splitting decimals
      return value.split(',');
    }

    // Default: return as string
    return value;
  };

  /**
   * Serialize filter values to URL string format
   */
  const serializeValue = (value: unknown): string => {
    if (Array.isArray(value)) {
      return value.join(',');
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value);
  };

  /**
   * Hydrate filter state from URL on mount
   */
  useEffect(() => {
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;

    const hydratedFilters: Partial<T> = {};
    let hasChanges = false;

    searchParams.forEach((value, key) => {
      if (excludeSet.has(key as keyof T)) return;

      hasChanges = true;
      hydratedFilters[key as keyof T] = deserializeValue(value) as T[keyof T];
    });

    if (hasChanges) {
      // Merge hydrated values with existing defaults
      setFilters((prev) => ({ ...prev, ...hydratedFilters }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Sync filter changes to URL
   */
  useEffect(() => {
    if (!hasHydratedRef.current) return;

    const params = new URLSearchParams();

    (Object.keys(filters) as (keyof T)[]).forEach((key) => {
      if (excludeSet.has(key)) return;

      const value = filters[key];

      // Skip empty values unless includeEmpty is true
      if (
        !includeEmpty &&
        (value === undefined ||
          value === null ||
          value === '' ||
          value === false ||
          (Array.isArray(value) && value.length === 0))
      ) {
        return;
      }

      const serialized = serializeValue(value);
      params.set(String(key), serialized);
    });

    setSearchParams(params, { replace: true });
  }, [filters, excludeSet, includeEmpty, setSearchParams]);
};

export default useSyncFiltersToSearchParams;
