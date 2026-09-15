package ca.bc.gov.nrs.hrs.provider.objectstorage;

/** Metadata observed for an object already present in storage. */
public record StoredObjectSummary(long sizeBytes, String checksum) {}