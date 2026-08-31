package ca.bc.gov.nrs.hrs.dto.block;

/** Persistence-focused sponsor representation. */
public record BlockSponsorDto(Long id, Long blockId, String sponsorId, String sponsorName,
    String firstName, String lastName, String designation, String licenceNo, String email,
    String phone) {}
