package ca.bc.gov.nrs.hrs.dto.block;

/** Persistence-focused submitter representation. */
public record BlockSubmitterDto(Long id, Long blockId, String submitterId, String submitterName,
    String firstName, String lastName, String designation, String licenceNo, String email,
    String phone) {}
