/**
 * Barrel for shared frontend types.
 *
 * Re-exports the `*.types.ts` modules under `@/types` so consumers can
 * import shared types from a single stable path while type definitions are
 * consolidated out of `@/services` and other folders.
 *
 * Types moved into this folder are held to the Zod boundary rulebook: API,
 * URL and form wire shapes get a Zod 4 schema with the exported type derived
 * via `z.infer`; internal type utilities stay plain types.
 */
export type * from './pagination.types';
export type * from './PageableResponse.types';
export type * from './search.types';
export type * from './utils.types';
