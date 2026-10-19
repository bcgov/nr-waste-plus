import { z } from 'zod';

import { codeDescriptionSchema } from '@/types/search.types';

/**
 * A forest client as serialized by the backend `ForestClientDto` record.
 *
 * - `legalFirstName`/`legalMiddleName` are null for non-individual clients;
 *   the backend `name()` getter joins the non-null parts for individuals and
 *   falls back to `clientName` otherwise, so `name` is always serialized.
 * - `clientStatusCode`/`clientTypeCode` are Java enums serialized as
 *   `{code, description}` objects (`@JsonFormat(SHAPE_OBJECT)`).
 *
 * Parsed at the boundary in `useForestClientsByNumbersQuery`.
 */
export const forestClientSchema = z.object({
  clientNumber: z.string(),
  clientName: z.string(),
  legalFirstName: z.string().nullable(),
  legalMiddleName: z.string().nullable(),
  clientStatusCode: codeDescriptionSchema,
  clientTypeCode: codeDescriptionSchema,
  acronym: z.string(),
  name: z.string(),
});

/**
 * Autocomplete hit for forest-client search (`byNameAcronymNumber`). The
 * backend record serializes all three keys; legacy data leaves `acronym`
 * (and potentially `id`/`name`) null.
 *
 * Parsed at the boundary in `useClientLookupQuery`.
 */
export const forestClientAutocompleteResultSchema = z.object({
  id: z.string().nullable(),
  name: z.string().nullable(),
  acronym: z.string().nullable(),
});

/**
 * One row of the authenticated user's accessible-clients listing. `counts`
 * are backend `Long` semantically required; `lastUpdate` is a Java
 * `LocalDateTime` serialized without an offset but representing UTC, hence
 * `{ local: true }`.
 *
 * Parsed at the boundary in `useMyForestClientsQuery`.
 */
export const myForestClientSchema = z.object({
  client: codeDescriptionSchema,
  submissionsCount: z.int(),
  blocksCount: z.int(),
  lastUpdate: z.iso.datetime({ local: true }),
});

export type ForestClientDto = z.infer<typeof forestClientSchema>;
export type ForestClientAutocompleteResultDto = z.infer<
  typeof forestClientAutocompleteResultSchema
>;
export type MyForestClientDto = z.infer<typeof myForestClientSchema>;
