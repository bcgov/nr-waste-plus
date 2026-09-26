package ca.bc.gov.nrs.hrs.provider.objectstorage;

/**
 * Thrown when a conditional storage operation fails (such as source ETag mismatch on copy).
 */
public class ObjectStoragePreconditionFailedException extends RuntimeException {

  public ObjectStoragePreconditionFailedException(String objectKey, Throwable cause) {
    super("Precondition failed for object in storage: " + objectKey, cause);
  }
}
