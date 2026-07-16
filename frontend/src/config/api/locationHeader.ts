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
  // Strip any query string or hash so the ID is read from the path only,
  // then drop any trailing slash. Trailing-slash removal lets the matcher
  // anchor to the exact end of the path without an optional `\/?` quantifier,
  // which avoids super-linear backtracking (Sonar typescript:S8786).
  const path = location.replace(/[?#].*$/, '').replace(/\/+$/, '');
  // Anchor to the end of the path: match the final numeric segment, so
  // `/api/2024/reporting-units/777` -> 777 and `/foo/777?v=1` -> 777
  // (not the intermediate `2024`). The greedy `\d+` is the only quantifier
  // and is bounded by `$`, so the match runs in linear time.
  const match = /\/(\d+)$/.exec(path);
  if (!match) {
    throw new Error(`Invalid Location header: "${location}"`);
  }
  return Number.parseInt(match[1], 10);
}
