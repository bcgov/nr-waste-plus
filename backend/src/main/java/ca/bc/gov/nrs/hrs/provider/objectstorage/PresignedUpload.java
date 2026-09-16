package ca.bc.gov.nrs.hrs.provider.objectstorage;

import java.time.Instant;

/** Result of signing a short-lived presigned PUT URL. */
public record PresignedUpload(String uploadUrl, Instant expiresAt) {}