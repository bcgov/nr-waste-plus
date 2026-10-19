import { z } from 'zod';

/**
 * Upload audit fields shared by configuration list items and details.
 * `dateOfUpload` is a Java `Instant` serialized as a UTC timestamp with a
 * `Z` suffix, hence the default `z.iso.datetime()`.
 */
export const uploadAuditSchema = z.object({
  uploadedBy: z.string(),
  dateOfUpload: z.iso.datetime(),
});
