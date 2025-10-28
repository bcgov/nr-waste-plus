package ca.bc.gov.nrs.hrs.exception;

/**
 * Exception thrown when a requested Forest Client cannot be found.
 *
 * <p>When thrown from a controller, this results in an HTTP 404 (Not Found)
 * response due to the superclass behaviour. The original short description
 * has been preserved and expanded for clarity.
 * </p>
 */
public class ForestClientNotFoundException extends NotFoundGenericException {

  /**
   * Instantiates a new Forest client not found exception with a generic
   * entity name. This will create a 404 status with a message indicating
   * that the ForestClient record(s) were not found.
   */
  public ForestClientNotFoundException() {
    super("ForestClient");
  }

  /**
   * Instantiates a new Forest client not found exception for a specific
   * client number. The resulting message will include the provided
   * client number to make the error more descriptive.
   *
   * @param clientNumber the client number that was not found
   */
  public ForestClientNotFoundException(String clientNumber) {
    super("Forest Client", clientNumber);
  }
}
