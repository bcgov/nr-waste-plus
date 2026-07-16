/**
 * Extracts the numeric resource ID from a `Location` response header.
 *
 * The backend returns HTTP 201 (Created) with a `Location` header pointing at
 * the newly created resource, e.g. `/reporting-units/42` or
 * `http://host/api/reporting-units/777?v=1`. The default parser reads the
 * trailing numeric segment of the path, ignoring any query string, so both
 * `/foo/42` and `/foo/777?v=1` resolve to `42` and `777` respectively.
 *
 * @param location - the raw `Location` header value
 * @returns the numeric resource ID parsed from the trailing path segment
 * @throws {Error} when no trailing numeric segment can be found
 * @example
 * parseResourceIdFromLocation('/reporting-units/42')   // 42
 * parseResourceIdFromLocation('/foo/777?v=1')          // 777
 */
export function parseResourceIdFromLocation(location: string): number {
  const match = /\/(\d+)(?:[/?#]|$)/.exec(location);
  if (!match) {
    throw new Error(`Invalid Location header: "${location}"`);
  }
  return Number.parseInt(match[1], 10);
}

/**
 * Parses a `Location` header into a numeric resource ID.
 *
 * Wraps {@link parseResourceIdFromLocation} so callers can supply a custom
 * strategy (for resources whose ID is not the trailing numeric path segment)
 * while keeping the default behaviour for the common case.
 *
 * @template T - the resolved resource identifier type
 * @param location - the raw `Location` header value
 * @param idParser - optional custom parser; defaults to trailing-numeric ID
 * @returns the resource identifier produced by the parser
 * @throws {Error} when the parser (or default) cannot resolve an ID
 */
export function parseLocationResourceId<T = number>(
  location: string,
  idParser: (location: string) => T = parseResourceIdFromLocation as (location: string) => T,
): T {
  return idParser(location);
}
