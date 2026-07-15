package ca.bc.gov.nrs.hrs.repository;

import static org.assertj.core.api.Assertions.assertThat;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.ConfigType;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.TableData;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

public class DistrictVolumeRepositoryTest
    extends AbstractTestContainerIntegrationTest {

  @Autowired
  private DistrictVolumeRepository repository;

  @Test
  void findTopByAreaOrderByStartDateDesc_returnsNewestForArea() {

    // Ensure auditing picks up a principal so NOT NULL audit columns are populated
    JwtAuthenticationToken token = new JwtAuthenticationToken(
        this.jwt,
        AuthorityUtils.createAuthorityList());
    SecurityContextHolder.getContext().setAuthentication(token);

    DistrictVolumeEntity first = new DistrictVolumeEntity();
    first.setArea(Area.INTERIOR);
    first.setStartDate(LocalDate.now().plusDays(1));
    first.setTableData(new TableData(null, null, java.util.Map.of()));
    first.setTableLevelFactor(new BigDecimal("1.000").setScale(3));

    DistrictVolumeEntity second = new DistrictVolumeEntity();
    second.setArea(Area.INTERIOR);
    second.setStartDate(LocalDate.now().plusDays(2));
    second.setTableData(new TableData(null, null, java.util.Map.of()));
    second.setTableLevelFactor(new BigDecimal("2.000").setScale(3));

    repository.save(first);
    repository.save(second);

    var opt = repository.findTopByAreaOrderByStartDateDesc(Area.INTERIOR);

    assertThat(opt).isPresent();
    assertThat(opt.get().getStartDate()).isEqualTo(second.getStartDate());
  }

  @Test
  void findAllByConfigType_returnsOnlyMatchingConfigType() {

    JwtAuthenticationToken token = new JwtAuthenticationToken(
        this.jwt,
        AuthorityUtils.createAuthorityList());
    SecurityContextHolder.getContext().setAuthentication(token);

    DistrictVolumeEntity districtVolume = new DistrictVolumeEntity();
    districtVolume.setArea(Area.INTERIOR);
    districtVolume.setStartDate(LocalDate.now().plusDays(1));
    districtVolume.setTableData(new TableData(null, null, java.util.Map.of()));
    districtVolume.setTableLevelFactor(new BigDecimal("1.000").setScale(3));
    districtVolume.setConfigType(ConfigType.DISTRICT_VOLUME);

    DistrictVolumeEntity speciesComposition = new DistrictVolumeEntity();
    speciesComposition.setArea(Area.INTERIOR);
    speciesComposition.setStartDate(LocalDate.now().plusDays(2));
    speciesComposition.setTableData(new TableData(null, null, java.util.Map.of()));
    speciesComposition.setTableLevelFactor(new BigDecimal("2.000").setScale(3));
    speciesComposition.setConfigType(ConfigType.SPECIES_COMPOSITION);

    repository.save(districtVolume);
    repository.save(speciesComposition);

    var result = repository.findAllByConfigType(
        ConfigType.SPECIES_COMPOSITION,
        PageRequest.of(0, 10));

    assertThat(result.getContent())
        .hasSize(1)
        .allMatch(
            entity -> entity.getConfigType() == ConfigType.SPECIES_COMPOSITION);
  }

  @Test
  void findByIdAndConfigType_returnsEmpty_whenConfigTypeDoesNotMatch() {

    JwtAuthenticationToken token = new JwtAuthenticationToken(
        this.jwt,
        AuthorityUtils.createAuthorityList());
    SecurityContextHolder.getContext().setAuthentication(token);

    DistrictVolumeEntity districtVolume = new DistrictVolumeEntity();
    districtVolume.setArea(Area.INTERIOR);
    districtVolume.setStartDate(LocalDate.now().plusDays(1));
    districtVolume.setTableData(new TableData(null, null, java.util.Map.of()));
    districtVolume.setTableLevelFactor(new BigDecimal("1.000").setScale(3));
    districtVolume.setConfigType(ConfigType.DISTRICT_VOLUME);

    DistrictVolumeEntity saved = repository.save(districtVolume);

    assertThat(
        repository.findByIdAndConfigType(
            saved.getId(),
            ConfigType.DISTRICT_VOLUME))
        .isPresent();

    assertThat(
        repository.findByIdAndConfigType(
            saved.getId(),
            ConfigType.SPECIES_COMPOSITION))
        .isEmpty();
  }
}
