package ca.bc.gov.nrs.hrs.provider.objectstorage;

import java.time.Duration;

/**
 * Provider abstraction over private S3-compatible object storage.
 *
 * <p>Upload bytes never traverse the backend: the server only mints short-lived presigned URLs and
 * inspects object metadata afterwards. Implementations must work against both AWS S3 and MinIO.
 */
public interface ObjectStorageProvider {

  /**
   * Produces a presigned PUT URL for the given object.
   *
   * @param objectKey the opaque object key (server-generated)
   * @param contentType the MIME type signed into the request
   * @param signatureDuration how long the returned URL stays valid
   * @return the presigned URL and its expiry
   */
  PresignedUpload presignPut(String objectKey, String contentType, Duration signatureDuration);

  /**
   * Performs a HEAD request to retrieve the stored object's metadata.
   *
   * @param objectKey the object key to inspect
   * @return the stored object's size and checksum
   * @throws ObjectStorageObjectNotFoundException if no object exists at the key
   */
  StoredObjectSummary headObject(String objectKey);
}