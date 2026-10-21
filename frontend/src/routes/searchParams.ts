import { parseSearchWith, stringifySearchWith } from '@tanstack/react-router';
import { z } from 'zod';

/**
 * URL search-param codecs for the waste-search route (`/search`, #1238).
 *
 * The route owns its filter state through TanStack Router `validateSearch`: the URL
 * is the single source of truth and this schema is the only place that decides how
 * each parameter is typed, so no per-key transform map is needed anywhere else.
 *
 * Encoding contract (paired with the router-level `parseSearch`/`stringifySearch`
 * in `routeTree.tsx`):
 * - strings are written plainly (`mainSearchTerm=12345`, never quoted),
 * - arrays are comma-joined (`district=DCC,DSC`), legacy JSON arrays still parse,
 * - booleans are written as `true`/`false` and — unlike the previous manual sync —
 *   `false` is preserved (`legacy=false` must survive: absent means legacy source).
 * - unknown keys are stripped, malformed values degrade to `undefined` (dropped)
 *   rather than failing the route (lenient per the #1238 source-flag contract).
 */

/** Parses `'true'`/`'false'` into booleans; anything else degrades to `undefined`. */
const booleanParam = z
  .preprocess(
    (value) => (value === 'true' ? true : value === 'false' ? false : value),
    z.boolean().optional(),
  )
  .catch(undefined);

/** Parses a comma-joined string (or legacy JSON array) into a string array; garbage degrades to `undefined`. */
const arrayParam = z
  .preprocess((value) => {
    // The Router's qss decode converts numeric-looking single values (e.g.
    // `clientNumbers=90000003`) to numbers before the schema runs — recover them.
    if (typeof value === 'number' || typeof value === 'boolean') return [String(value)];
    if (typeof value === 'string') {
      // Legacy JSON-encoded arrays (from the Router's former default serializer)
      // must be JSON-decoded before the comma split would mangle them.
      if (value.startsWith('[')) {
        try {
          const parsed: unknown = JSON.parse(value);
          return Array.isArray(parsed) ? parsed.map((item) => String(item)) : value;
        } catch {
          return value;
        }
      }
      return value === '' ? [] : value.split(',');
    }
    if (Array.isArray(value)) return value.map((item) => String(item));
    return value;
  }, z.array(z.string()).optional())
  .catch(undefined);

/**
 * Passes strings through; coerces numbers back to strings (the Router's qss decode
 * converts numeric-looking values like `mainSearchTerm=12345` to numbers before the
 * schema runs); non-string garbage degrades to `undefined`.
 */
const stringParam = z
  .preprocess((value) => (typeof value === 'number' ? String(value) : value), z.string().optional())
  .catch(undefined);

/**
 * Validated search-param shape for `/search`. Mirrors
 * {@link ReportingUnitSearchParametersDto} (plus nothing else — the flag is a plain
 * boolean here and reaches the backend unchanged because the service keeps `false`
 * values for this key on the wire).
 */
export const wasteSearchSchema = z.object({
  mainSearchTerm: stringParam,
  district: arrayParam,
  sampling: arrayParam,
  status: arrayParam,
  requestByMe: booleanParam,
  multiMark: booleanParam,
  bookmarked: booleanParam,
  legacy: booleanParam,
  requestUserId: stringParam,
  updateDateStart: stringParam,
  updateDateEnd: stringParam,
  licenseeId: stringParam,
  cuttingPermitId: stringParam,
  timberMark: stringParam,
  clientLocationCode: stringParam,
  clientNumbers: arrayParam,
});

/** Validated `/search` URL state; absent keys are `undefined`. */
export type WasteSearchFilters = z.infer<typeof wasteSearchSchema>;

/** Validator for the `/search` route: never throws, drops malformed keys. */
export const validateWasteSearch = (search: unknown): WasteSearchFilters =>
  wasteSearchSchema.parse(search ?? {});

/**
 * Router-level search-param codec: plain, human-readable encoding shared by the
 * application router and every test router so both behave identically.
 *
 * - `parseSearch` JSON-decodes only values that need it (quoted strings, arrays,
 *   objects) so plain values like `mainSearchTerm=12345` stay strings instead of
 *   becoming numbers, and legacy JSON-encoded URLs keep working.
 * - `stringifySearch` writes strings unquoted (the Router's default JSON-based
 *   serializer is what double-quote-wraps string values like `mainSearchTerm`),
 *   joins arrays with commas, and keeps booleans as `true`/`false`.
 */
export const searchParamCodec = {
  parseSearch: parseSearchWith((value) => {
    if (value.startsWith('"') || value.startsWith('[') || value.startsWith('{')) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }),
  stringifySearch: stringifySearchWith((value) => {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      return value.join(',');
    }
    return JSON.stringify(value);
  }),
};
