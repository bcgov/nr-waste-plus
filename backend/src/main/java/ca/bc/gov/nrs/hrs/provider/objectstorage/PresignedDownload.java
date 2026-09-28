package ca.bc.gov.nrs.hrs.provider.objectstorage;

import java.time.Instant;

/** Result of signing a short-lived presigned GET URL for downloading an object. */
public record PresignedDownload(String downloadUrl, Instant expiresAt) {}

