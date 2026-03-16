import type {
  CodeDescriptionDto,
  ForestClientAutocompleteResultDto,
  NestedKeyOf,
  SortDirectionType,
  ValueByPath,
} from './types';

/**
 * Removes empty, null, and undefined values from an object recursively.
 *
 * @typeParam T The object type.
 * @param obj The object to clean.
 * @returns A copy containing only meaningful values.
 */
export const removeEmpty = <T extends object>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, v]) => {
        if (Array.isArray(v)) {
          // Remove invalid values from array
          const filtered = v.filter((item) => item !== null && item !== undefined && item !== '');
          return filtered.length > 0;
        }
        if (typeof v === 'object' && v !== null) {
          return Object.keys(v).length > 0;
        }
        return Boolean(v);
      })
      .map(([k, v]) => {
        if (Array.isArray(v)) {
          // Remove invalid values from array
          return [k, v.filter((item) => item !== null && item !== undefined && item !== '')];
        }
        if (typeof v === 'object' && v !== null) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return [k, removeEmpty(v) as any];
        }
        return [k, v];
      }),
  ) as Partial<T>;
};

/**
 * Generates a random hexadecimal string of the requested length.
 *
 * @param length The number of hexadecimal characters to generate.
 * @returns A hexadecimal identifier segment.
 */
const generateHex = (length: number): string => {
  const chars = 'abcdef0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

/**
 * Creates B3 tracing headers for outbound backend requests.
 *
 * @returns Trace and span identifiers for distributed tracing.
 */
export const getB3Headers = () => {
  return {
    'X-B3-TraceId': generateHex(32),
    'X-B3-SpanId': generateHex(16),
  };
};

/**
 * Reads a nested value from an object using a dot-separated property path.
 *
 * @typeParam T The source object type.
 * @typeParam P The nested key path type.
 * @param obj The object to read from.
 * @param path The dot-separated property path.
 * @returns The value found at the requested path.
 */
export const getValueByPath = <T, P extends NestedKeyOf<T>>(obj: T, path: P): ValueByPath<T, P> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return path.split('.').reduce((acc, key) => acc?.[key], obj as any) as ValueByPath<T, P>;
};

/**
 * Converts a sort object into the string array expected by the backend API.
 *
 * @typeParam T The source model being sorted.
 * @param sort A map of field names to sort directions.
 * @returns An array of `field,direction` values excluding `NONE` entries.
 */
export const generateSortArray = <T>(
  sort: Record<NestedKeyOf<T>, SortDirectionType>,
): Array<`${NestedKeyOf<T>},${SortDirectionType}`> =>
  Object.entries(sort)
    .filter(([, direction]) => direction !== 'NONE')
    .map(([key, direction]) => `${key},${direction}` as `${NestedKeyOf<T>},${SortDirectionType}`);

/**
 * Converts a forest-client autocomplete result into a generic code-description pair.
 *
 * @param data The forest client autocomplete result.
 * @returns A code-description object suitable for shared UI inputs.
 */
export const forestClientAutocompleteResult2CodeDescription = (
  data: ForestClientAutocompleteResultDto,
): CodeDescriptionDto => {
  const { id, name, acronym } = data;
  const acronymSection = acronym ? ` (${acronym})` : '';
  const description = `${id} ${name}${acronymSection}`;
  return {
    code: id ?? '',
    description,
  };
};

/**
 * Checks whether a runtime key exists on an object while preserving key inference.
 *
 * @typeParam T The object type.
 * @param key The key to test.
 * @param object The object to inspect.
 * @returns True when the key exists on the object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isKeyof = <T extends object>(key: any, object: T): key is keyof T => key in object;
