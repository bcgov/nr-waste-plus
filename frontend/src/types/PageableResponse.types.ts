/**
 * Stable `@/types` surface for the shared pageable-table types.
 *
 * The canonical definitions live in `@/api/pagination.types` and in
 * `@/components/Form/TableResource/types`; this module re-exports them so
 * feature code can depend on one stable path while the canonical homes keep
 * evolving with the services refactor.
 */

export type { NestedKeyOf } from '@/api/pagination.types';
export type { PageableResponse } from '@/components/Form/TableResource/types';
