package ca.bc.gov.nrs.hrs.repository;

import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.TableData;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

public class DistrictVolumeRepositoryTest 
    extends AbstractTestContainerIntegrationTest {

  @Autowired
  private DistrictVolumeRepository repository;

  @Test
  void findTopByAreaOrderByStartDateDesc_returnsNewestForArea() {

    // Ensure auditing picks up a principal so NOT NULL audit columns are populated
    JwtAuthenticationToken token = new JwtAuthenticationToken(
        this.jwt,
        AuthorityUtils.createAuthorityList()
    );
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
}
