import { z } from 'zod';

export const pageTypeSchema = z.object({
  size: z.number(),
  number: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
});

export function pageableResponseSchema<T extends z.ZodType>(contentSchema: T) {
  return z.object({
    content: z.array(contentSchema),
    page: pageTypeSchema,
  });
}
