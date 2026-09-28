package ca.bc.gov.nrs.hrs.provider.scanner;

/**
 * Thrown when the malware scanning service or platform scanner product is unavailable,
 * unconfigured, or unreachable.
 */
public class ScannerUnavailableException extends RuntimeException {

  public ScannerUnavailableException(String message) {
    super(message);
  }

  public ScannerUnavailableException(String message, Throwable cause) {
    super(message, cause);
  }
}

