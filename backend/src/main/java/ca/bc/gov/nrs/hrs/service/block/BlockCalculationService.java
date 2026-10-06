package ca.bc.gov.nrs.hrs.service.block;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.base.Role;
import ca.bc.gov.nrs.hrs.dto.block.BlockCalculationDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockCalculationWarning;
import ca.bc.gov.nrs.hrs.entity.block.BlockCalculationSnapshotEntity;
import ca.bc.gov.nrs.hrs.repository.block.BlockCalculationSnapshotRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Thin read service for block calculation snapshots. */
@Service
@RequiredArgsConstructor
public class BlockCalculationService {

  private final BlockCalculationSnapshotRepository repository;
  private final BlockRepository blockRepository;
  private final ReportingUnitRepository reportingUnitRepository;

  /**
   * Returns the latest snapshot after validating its reporting-unit parent and client scope.
   *
   * @param reportingUnitId the expected parent reporting-unit identifier
   * @param blockId the block identifier
   * @param jwt the authenticated caller's token
   * @return the latest snapshot, if one exists
   */
  public Optional<BlockCalculationDto> findLatest(Long reportingUnitId, Long blockId, Jwt jwt) {
    String clientNumber =
        reportingUnitRepository
            .findByIdAndDeletedFalse(reportingUnitId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND))
            .getClientNumber();
    if (IdentityProvider.BUSINESS_BCEID.equals(JwtPrincipalUtil.getIdentityProvider(jwt))
        && !hasClientRole(jwt, clientNumber)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }

    blockRepository
        .findByIdAndReportingUnitIdAndDeletedFalse(blockId, reportingUnitId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

    return repository.findTopByBlockIdOrderByCalculatedAtDesc(blockId).map(this::toDto);
  }

  private boolean hasClientRole(Jwt jwt, String clientNumber) {
    return JwtPrincipalUtil.hasAbstractRole(jwt, Role.VIEWER, clientNumber)
        || JwtPrincipalUtil.hasAbstractRole(jwt, Role.SUBMITTER, clientNumber);
  }

  private BlockCalculationDto toDto(BlockCalculationSnapshotEntity entity) {
    JsonNode outputsNode = entity.getOutputs();
    BigDecimal grandTotal = sumOutputValues(outputsNode);

    BlockCalculationDto.Outputs outputs =
        new BlockCalculationDto.Outputs(
            List.of(), // perMark — empty until mark-level resolution is available
            grandTotal);

    List<BlockCalculationWarning> warnings = new ArrayList<>();
    JsonNode warningsNode = entity.getWarnings();
    if (warningsNode != null && warningsNode.isArray()) {
      warningsNode.forEach(
          w -> {
            if (w.isTextual()) {
              warnings.add(new BlockCalculationWarning(w.asText(), null));
            } else if (w.isObject()) {
              String code = w.has("code") ? w.get("code").asText() : null;
              String message = w.has("message") ? w.get("message").asText() : null;
              warnings.add(new BlockCalculationWarning(code, message));
            }
          });
    }

    return new BlockCalculationDto(
        entity.getBlockId(),
        entity.getDistrictVolumeId(),
        entity.getCalculatedAt(),
        entity.getRoundingPolicy(),
        outputs,
        warnings);
  }

  private BigDecimal sumOutputValues(JsonNode outputsNode) {
    if (outputsNode == null || outputsNode.isNull()) {
      return BigDecimal.ZERO;
    }
    BigDecimal total = BigDecimal.ZERO;
    for (Map.Entry<String, JsonNode> entry : outputsNode.properties()) {
      JsonNode val = entry.getValue();
      if (val.isNumber()) {
        total = total.add(val.decimalValue());
      }
    }
    return total;
  }
}
