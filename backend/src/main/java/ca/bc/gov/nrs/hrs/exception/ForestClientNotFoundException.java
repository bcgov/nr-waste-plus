package ca.bc.gov.nrs.hrs.exception;

/** This class represents a Forest Client not found, will throw 404 http error. */
public class ForestClientNotFoundException extends NotFoundGenericException {

  /**
   * Instantiates a new Forest client not found exception.
   */
  public ForestClientNotFoundException() {
    super("ForestClient");
  }

  public ForestClientNotFoundException(String clientNumber) {
    super("Forest Client", clientNumber);
  }
}
