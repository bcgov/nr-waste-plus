package ca.bc.gov.nrs.hrs.provider.objectstorage;

/** Thrown when a head/verification request targets an object that does not exist. */
public class ObjectStorageObjectNotFoundException extends RuntimeException {

  public ObjectStorageObjectNotFoundException(String objectKey, Throwable cause) {
    super("Object not found in storage: " + objectKey, cause);
  }
}