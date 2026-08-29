package ca.bc.gov.nrs.hrs.dto.block;

/** Block-requirement persistence projection. */
public record BlockRequirementDto(Long id, Long blockId, String requirementCode,
    Boolean answeredYes, String response, Long linkedAttachmentId) {}
