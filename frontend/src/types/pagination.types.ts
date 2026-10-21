import { z } from 'zod';

export type SortDirectionType = 'ASC' | 'DESC' | 'NONE';

export type NestedKeyOf<T> = {
  [K in keyof T & (string | number)]: T[K] extends object
    ? `${K}` | `${K}.${NestedKeyOf<T[K]>}`
    : `${K}`;
}[keyof T & (string | number)];

export type ValueByPath<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? ValueByPath<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

export type PageableRequest<T> = {
  page: number;
  size: number;
  sort?: Array<`${NestedKeyOf<T>},${SortDirectionType}`>;
};

/**
 * Page summary block as serialized by Spring Data's `PagedModel`
 * (`pageSerializationMode = VIA_DTO`).
 */
export const pageTypeSchema = z.object({
  size: z.int(),
  number: z.int(),
  totalElements: z.int(),
  totalPages: z.int(),
});

export type PageType = z.infer<typeof pageTypeSchema>;

/**
 * Wire envelope for paged endpoints: `{ content, page }`. Row identity is a
 * table-layer concern — rows must carry a stable `id` (see
 * `IdentifiableContent` in `@/types/tableResource.types`) before reaching
 * the table.
 */
export const pageableResponseSchema = <T extends z.ZodType>(contentSchema: T) =>
  z.object({
    content: z.array(contentSchema),
    page: pageTypeSchema,
  });
