package ca.bc.gov.nrs.hrs.service.block;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import ca.bc.gov.nrs.hrs.dto.block.BlockCalculationDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockCalculationSnapshotEntity;
import ca.bc.gov.nrs.hrs.repository.block.BlockCalculationSnapshotRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Block Calculation Service")
class BlockCalculationServiceTest {

  private static final ObjectMapper MAPPER = new ObjectMapper();

  @Mock private BlockCalculationSnapshotRepository repository;
  @InjectMocks private BlockCalculationService service;

  @Test
  @DisplayName("Returns empty when no snapshot exists")
  void returnsEmptyWhenNoSnapshot() {
    given(repository.findTopByBlockIdOrderByCalculatedAtDesc(999L))
        .willReturn(Optional.empty());

    Optional<BlockCalculationDto> result = service.findLatest(999L);

    assertThat(result).isEmpty();
  }

  @Test
  @DisplayName("Maps snapshot with null outputs to zero grand total")
  void mapsNullOutputsToZero() throws Exception {
    BlockCalculationSnapshotEntity entity = snapshot(
        MAPPER.readTree("{}"),         // outputs — null fields
        MAPPER.createArrayNode());     // warnings — empty

    given(repository.findTopByBlockIdOrderByCalculatedAtDesc(1L))
        .willReturn(Optional.of(entity));

    BlockCalculationDto dto = service.findLatest(1L).orElseThrow();

    assertThat(dto.outputs().grandTotalM3()).isEqualByComparingTo(BigDecimal.ZERO);
  }

  @Test
  @DisplayName("Maps textual warnings to typed warning records")
  void mapsTextualWarnings() throws Exception {
    JsonNode warnings = MAPPER.readTree("[\"rounding_applied\",\"data_missing\"]");
    BlockCalculationSnapshotEntity entity = snapshot(
        MAPPER.readTree("{\"da.x\":1}"), warnings);

    given(repository.findTopByBlockIdOrderByCalculatedAtDesc(1L))
        .willReturn(Optional.of(entity));

    BlockCalculationDto dto = service.findLatest(1L).orElseThrow();

    assertThat(dto.warnings()).hasSize(2);
    assertThat(dto.warnings().get(0).code()).isEqualTo("rounding_applied");
    assertThat(dto.warnings().get(0).message()).isNull();
    assertThat(dto.warnings().get(1).code()).isEqualTo("data_missing");
  }

  @Test
  @DisplayName("Maps object warnings to typed warning records with code and message")
  void mapsObjectWarnings() throws Exception {
    JsonNode warnings = MAPPER.readTree(
        "[{\"code\":\"FTA_UNAVAILABLE\",\"message\":\"FTA service timeout\"}]");
    BlockCalculationSnapshotEntity entity = snapshot(
        MAPPER.readTree("{\"da.x\":1}"), warnings);

    given(repository.findTopByBlockIdOrderByCalculatedAtDesc(1L))
        .willReturn(Optional.of(entity));

    BlockCalculationDto dto = service.findLatest(1L).orElseThrow();

    assertThat(dto.warnings()).hasSize(1);
    assertThat(dto.warnings().get(0).code()).isEqualTo("FTA_UNAVAILABLE");
    assertThat(dto.warnings().get(0).message()).isEqualTo("FTA service timeout");
  }

  @Test
  @DisplayName("Sums only numeric output values")
  void sumsNumericOutputs() throws Exception {
    JsonNode outputs = MAPPER.readTree(
        "{\"da.mature.volume\":10.5,\"da.total\":20.0,\"da.label\":\"text\"}");
    BlockCalculationSnapshotEntity entity = snapshot(outputs, MAPPER.createArrayNode());

    given(repository.findTopByBlockIdOrderByCalculatedAtDesc(1L))
        .willReturn(Optional.of(entity));

    BlockCalculationDto dto = service.findLatest(1L).orElseThrow();

    assertThat(dto.outputs().grandTotalM3()).isEqualByComparingTo(new BigDecimal("30.5"));
  }

  private BlockCalculationSnapshotEntity snapshot(JsonNode outputs, JsonNode warnings) {
    Instant now = Instant.parse("2025-07-01T00:00:00Z");
    return new BlockCalculationSnapshotEntity(
        1L, 42L, null, null,
        MAPPER.createObjectNode(), outputs,
        now, "HALF_UP", warnings,
        "test", "test", now, now);
  }
}
