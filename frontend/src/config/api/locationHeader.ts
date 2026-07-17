/**
 * Extracts the numeric resource ID from a `Location` response header.
 *
 * The backend returns HTTP 201 (Created) with a `Location` header pointing at
 * the newly created resource, e.g. `/reporting-units/42` or
 * `http://host/api/reporting-units/777?v=1`. The parser reads the **final**
 * numeric segment of the path (after stripping any query string or hash), so
 * `/reporting-units/42` -> 42, `/foo/777?v=1` -> 777, and
 * `/api/2024/reporting-units/777` -> 777 (the trailing segment wins).
 *
 * @param location - the raw `Location` header value
 * @returns the numeric resource ID parsed from the final path segment
 * @throws {Error} when no final numeric segment can be found
 * @example
 * parseResourceIdFromLocation('/reporting-units/42')        // 42
 * parseResourceIdFromLocation('/foo/777?v=1')               // 777
 * parseResourceIdFromLocation('/api/2024/reporting-units/777') // 777
 */
export function parseResourceIdFromLocation(location: string): number {
  // Read only the path: cut at the first `?` (query) or `#` (fragment).
  // Plain string indexing avoids the greedy `/[?#].*$/` pattern that triggers
  // super-linear backtracking (Sonar typescript:S8786).
  const hashIdx = location.indexOf('#');
  const queryIdx = location.indexOf('?');
  const cut = Math.min(
    hashIdx >= 0 ? hashIdx : location.length,
    queryIdx >= 0 ? queryIdx : location.length,
  );
  let path = location.slice(0, cut);
  // Drop any trailing slashes so the final segment is the resource ID.
  while (path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  // The resource ID is the final path segment; it must be all digits.
  // `^\d+$` is anchored at both ends with a single group, so it cannot
  // backtrack (linear time).
  const lastSegment = path.slice(path.lastIndexOf('/') + 1);
  if (lastSegment === '' || !/^\d+$/.test(lastSegment)) {
    throw new Error(`Invalid Location header: "${location}"`);
  }
  return Number.parseInt(lastSegment, 10);
}
