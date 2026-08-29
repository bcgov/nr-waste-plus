package ca.bc.gov.nrs.hrs.dto.block;

/** Block-mark persistence projection. */
public record BlockMarkDto(Long id, Long blockId, String markType, Integer sequenceNo, String mark,
    String validationStatus, String forestFileId, String timberMark, String cuttingPermitId,
    String cutBlockId) {}
