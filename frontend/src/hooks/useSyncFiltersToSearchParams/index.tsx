import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, useMemo } from 'react';

/**
 * Defines optional serialization and deserialization functions for a single filter value.
 *
 * @template TValue - The in-memory type of the filter value.
 */
type FilterSearchParamTransform<TValue> = {
  /** Converts the in-memory value to a URL-safe representation (e.g. code array → string). */
  toSearchParam?: (value: TValue) => unknown;
  /** Converts a raw URL param value back to the in-memory type. */
  fromSearchParam?: (value: unknown, currentValue?: TValue) => TValue;
};

/**
 * A per-key map of {@link FilterSearchParamTransform} entries.
 * Only the filter keys that need custom serialization need to be specified.
 *
 * @template T - The filter state object type.
 */
type FilterSearchParamTransformMap<T extends Record<string, unknown>> = Partial<{
  [K in keyof T]: FilterSearchParamTransform<T[K]>;
}>;

/**
 * Syncs a filter object with URL search parameters bidirectionally.
 *
 * This hook manages bidirectional synchronization between a filter state object and URL search parameters.
 * On component mount, it hydrates the filter state from the URL search params. As filters change,
 * they are automatically serialized into URL params, enabling:
 * - Persistent filter state across page reloads
 * - Shareable URLs with active filters pre-populated
 * - URL updates without creating additional history entries
 * - Scalable filter management without prop drilling
 *
 * @template T - The filter state object type
 * @param filters - The current filter state object (must be from useState)
 * @param setFilters - React state setter function to update filters
 * @param options - Configuration options
 * @param options.exclude - Array of filter keys to exclude from URL syncing (e.g., temporary/local-only filters)
 * @param options.includeEmpty - Whether to include empty/falsy values in URL params (default: false)
 * @param options.transforms - Per-filter transforms for mapping between in-memory values and URL-safe values
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
 *   transforms: {
 *     users: {
 *       toSearchParam: (value) => value.map((item) => item.code),
 *       fromSearchParam: (value) =>
 *         Array.isArray(value)
 *           ? value.map((code) => ({ code: String(code), description: String(code) }))
 *           : [],
 *     },
 *   },
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
 * - Values are deserialized using the current filter default type when available
 * - Values starting with '[' or '{' are parsed as JSON
 * - Boolean defaults parse 'true'/'false' to booleans
 * - Number defaults parse numeric strings to numbers
 * - Array defaults parse to arrays (JSON array or comma-separated values)
 * - Other values remain as strings
 *
 * Notes:
 * - Hydration runs only once on initial mount (does not re-hydrate on later URL changes)
 * - URL updates use setSearchParams(..., { replace: true })
 */
const useSyncFiltersToSearchParams = <T extends Record<string, unknown>>(
  filters: T,
  setFilters: React.Dispatch<React.SetStateAction<T>>,
  options?: {
    exclude?: (keyof T)[];
    includeEmpty?: boolean;
    transforms?: FilterSearchParamTransformMap<T>;
  },
): void => {
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const navigate = useNavigate();
  const searchParams = useMemo(() => new URLSearchParams(searchStr), [searchStr]);

  const excludeSet = useMemo(() => new Set(options?.exclude ?? []), [options?.exclude]);
  const includeEmpty = options?.includeEmpty ?? false;
  const transforms = options?.transforms;
  const hasHydratedRef = useRef(false);
  const managedKeysRef = useRef<Set<string>>(new Set());

  const searchParamsRef = useRef(searchParams);

  // Keep the ref in sync with the latest searchParams after every render so the
  // sync effect can read current URL params without listing searchParams as a
  // reactive dependency — which would cause the effect to fire whenever the user
  // navigates *away* from this route and the URL search string changes to the
  // destination's (empty) params.
  useEffect(() => {
    searchParamsRef.current = searchParams;
  });

  /**
   * Attempts to parse a string as JSON when it begins with `[` or `{`.
   * Returns `undefined` if parsing fails or the value is not JSON-like.
   */
  const tryParseJson = (value: string): unknown => {
    if (!value.startsWith('[') && !value.startsWith('{')) {
      return undefined;
    }

    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  };

  /** Converts `'true'`/`'false'` string literals to booleans; returns `expectedValue` for any other string. */
  const deserializeBoolean = (value: string, expectedValue: boolean): boolean => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return expectedValue;
  };

  /** Converts a numeric string to a `number`; returns the original string when `NaN` or blank. */
  const deserializeNumber = (value: string): number | string => {
    const parsed = Number(value);
    return !Number.isNaN(parsed) && value.trim() !== '' ? parsed : value;
  };

  /** Splits a comma-separated string into a string array; returns `[]` for an empty string. */
  const deserializeArray = (value: string): string[] => {
    return value === '' ? [] : value.split(',');
  };

  /**
   * Fallback deserialization: splits comma-separated (non-decimal) values into arrays;
   * returns the raw string otherwise.
   */
  const deserializeDefault = (value: string): string | string[] => {
    return value.includes(',') && !value.includes('.') ? value.split(',') : value;
  };

  /**
   * Deserialize URL parameter values to appropriate types
   */
  const deserializeValue = (value: string, expectedValue?: unknown): unknown => {
    const parsedJson = tryParseJson(value);
    if (parsedJson !== undefined) return parsedJson;

    if (typeof expectedValue === 'boolean') {
      return deserializeBoolean(value, expectedValue);
    }

    if (typeof expectedValue === 'number') {
      return deserializeNumber(value);
    }

    if (Array.isArray(expectedValue)) {
      return deserializeArray(value);
    }

    return deserializeDefault(value);
  };

  /**
   * Serialize filter values to URL string format
   */
  const serializeValue = (value: unknown): string => {
    if (value === true) return 'true';
    if (value === false) return 'false';
    if (Array.isArray(value)) {
      return value.join(',');
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value);
  };

  /**
   * Resolves the hydrated value for a single filter key by deserializing
   * the raw URL parameter and optionally applying a custom `fromSearchParam` transform.
   */
  const getHydratedFilterValue = <K extends keyof T>(
    key: K,
    rawValue: string,
    currentValue?: T[K],
  ): T[K] => {
    const parsedValue = deserializeValue(rawValue, currentValue);
    const transform = transforms?.[key];

    if (transform?.fromSearchParam) {
      return transform.fromSearchParam(parsedValue, currentValue);
    }

    return parsedValue as T[K];
  };

  /**
   * Hydrate filter state from URL on mount
   */
  useEffect(() => {
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;
    const allowUnknownKeysOnHydration = Object.keys(filters).length === 0;

    let hasHydrationParams = false;

    searchParams.forEach((_value, key) => {
      const isKnownFilterKey = Object.hasOwn(filters, key);
      const castKey = key as keyof T;
      if (!excludeSet.has(castKey) && (isKnownFilterKey || allowUnknownKeysOnHydration)) {
        hasHydrationParams = true;
      }
    });

    if (!hasHydrationParams) return;

    // Merge hydrated values with existing defaults and infer target types from existing filter values.
    setFilters((prev) => {
      const hydratedFilters: Partial<T> = {};

      searchParams.forEach((value, key) => {
        const castKey = key as keyof T;
        if (excludeSet.has(castKey)) return;
        if (!allowUnknownKeysOnHydration && !Object.hasOwn(prev, key)) {
          return;
        }

        hydratedFilters[castKey] = getHydratedFilterValue(castKey, value, prev[castKey]);
      });

      return { ...prev, ...hydratedFilters };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Sync filter changes to URL
   */
  useEffect(() => {
    if (!hasHydratedRef.current) return;

    // Read via ref so URL changes caused by cross-route navigation don't re-trigger
    // this effect and inject filter params into the destination route's URL.
    const params = new URLSearchParams(searchParamsRef.current);
    const previousParamsString = params.toString();

    // Keep track of keys this hook has managed so removed filters are also cleaned from URL.
    const managedKeys = new Set(managedKeysRef.current);
    (Object.keys(filters) as (keyof T)[]).forEach((key) => {
      if (!excludeSet.has(key)) {
        managedKeys.add(String(key));
      }
    });

    managedKeys.forEach((key) => {
      params.delete(key);
    });

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

      const transformedValue = transforms?.[key]?.toSearchParam
        ? transforms[key].toSearchParam(value)
        : value;

      // Booleans must go into URLSearchParams as the literal strings 'true'/'false'
      // (URLSearchParams only stores strings). They are patched back to boolean
      // primitives in the search object before the navigate() call below, so that
      // TanStack Router serializes them as `name=true` rather than `name=%22true%22`.
      if (typeof transformedValue === 'boolean') {
        params.set(String(key), transformedValue ? 'true' : 'false');
      } else {
        const serialized = serializeValue(transformedValue);
        params.set(String(key), serialized);
      }
    });

    managedKeysRef.current = managedKeys;

    if (params.toString() === previousParamsString) {
      return;
    }

    const booleanKeys = new Set<string>();

    (Object.keys(filters) as (keyof T)[]).forEach((key) => {
      if (excludeSet.has(key)) return;

      const transformedValue = transforms?.[key]?.toSearchParam
        ? transforms[key].toSearchParam(filters[key])
        : filters[key];

      if (typeof transformedValue === 'boolean') {
        booleanKeys.add(String(key));
      }
    });

    // Convert URLSearchParams back to a plain object for TanStack's navigate
    const search: Record<string, unknown> = Object.fromEntries(params);

    // Patch only known boolean keys back to primitives so string filters with the
    // literal values 'true' and 'false' are preserved as strings.
    booleanKeys.forEach((key) => {
      if (search[key] === 'true') search[key] = true;
      if (search[key] === 'false') search[key] = false;
    });

    void navigate({
      search: search,
      replace: true,
    } as never);
  }, [filters, excludeSet, includeEmpty, navigate, transforms]); // searchParams intentionally omitted — read via ref
};

export default useSyncFiltersToSearchParams;
