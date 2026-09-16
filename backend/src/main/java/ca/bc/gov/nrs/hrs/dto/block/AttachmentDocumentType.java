package ca.bc.gov.nrs.hrs.dto.block;

import java.util.Optional;

/** Evidence document categories accepted by the attachment intent flow. */
public enum AttachmentDocumentType {
  FINAL_MAP,
  POST_HARVEST_CERTIFICATE,
  RATIONALE,
  ENDORSEMENT_LETTER,
  CALCULATOR_SPREADSHEET,
  HBS_BILLING_REPORT,
  REDUCTION_FACTOR_SUPPORT,
  OTHER;

  /**
   * Resolves a raw {@code documentType} value to the matching enum constant.
   *
   * @param value the raw value supplied by the client
   * @return the matching constant, or empty when the value is not allowlisted
   */
  public static Optional<AttachmentDocumentType> from(String value) {
    if (value == null) {
      return Optional.empty();
    }
    try {
      return Optional.of(valueOf(value.trim()));
    } catch (IllegalArgumentException e) {
      return Optional.empty();
    }
  }
}