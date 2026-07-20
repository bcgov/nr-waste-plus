package ca.bc.gov.nrs.hrs.entity.districtaveragevolume;

import static org.assertj.core.api.Assertions.assertThat;
import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Integration test that verifies Hibernate/JPA mapping for DistrictVolumeEntity.
 */
@WithMockJwt
public class DistrictVolumeEntityMappingTest
    extends AbstractTestContainerIntegrationTest {

  @Autowired
  private ca.bc.gov.nrs.hrs.repository.DistrictVolumeRepository repository;

  @Test
  void persistAndRead_backMappedFields() {

    DistrictRow row = new DistrictRow(
        new CodeDescriptionDto("DCC", "Cariboo-Chilcotin Natural Resource District"),
        new BigDecimal("2.040").setScale(3),
        new BigDecimal("7.050").setScale(3),
        new BigDecimal("0.080").setScale(3),
        null,
        null,
        null,
        new BigDecimal("9.170").setScale(3)
    );

    Zone zone = new Zone("Dry belt", List.of(row));

    TableData tableData = new TableData(List.of(zone), null, null, Map.of());

    DistrictVolumeEntity entity = new DistrictVolumeEntity();
    entity.setArea(Area.INTERIOR);
    entity.setStartDate(LocalDate.of(2026, 1, 1));
    entity.setTableData(tableData);
    entity.setTableLevelFactor(new BigDecimal("1.234").setScale(3));
    entity.setHeliMultiplier(null);

    DistrictVolumeEntity saved = repository.saveAndFlush(entity);

    assertThat(saved.getId()).isNotNull();
    assertThat(saved.getArea()).isEqualTo(Area.INTERIOR);
    assertThat(saved.getTableLevelFactor()
        .compareTo(new BigDecimal("1.234"))).isEqualTo(0);
    assertThat(saved.getTableLevelFactor().scale()).isEqualTo(3);
    assertThat(saved.getCreatedAt()).isNotNull();
    assertThat(saved.getCreatedBy()).isNotNull();

    // Verify JSONB mapping round-trips
    DistrictVolumeEntity found =
        repository.findById(saved.getId()).orElseThrow();

    assertThat(found.getTableData()).isNotNull();
    assertThat(found.getTableData().zones()).hasSize(1);

    Zone foundZone = found.getTableData().zones().get(0);
    assertThat(foundZone.name()).isEqualTo("Dry belt");
    assertThat(foundZone.districts()).hasSize(1);

    DistrictRow foundRow = foundZone.districts().get(0);
    assertThat(foundRow.district().code()).isEqualTo("DCC");
    assertThat(foundRow.total())
        .isEqualByComparingTo(new BigDecimal("9.170"));

    // JSONB numeric values may not preserve trailing zeros; assert numeric equality only
    assertThat(foundRow.avoidableSawlog()).isEqualByComparingTo(new BigDecimal("2.040"));
    assertThat(foundRow.avoidableGrade4()).isEqualByComparingTo(new BigDecimal("7.050"));
    assertThat(foundRow.unavoidableGrade4()).isEqualByComparingTo(new BigDecimal("0.080"));
    assertThat(foundRow.total()).isEqualByComparingTo(new BigDecimal("9.170"));
  }
}