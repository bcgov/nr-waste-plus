package ca.bc.gov.nrs.hrs.entity.districtaveragevolume;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.repository.DistrictVolumeRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.support.TransactionTemplate;

public class DistrictVolumeOptimisticLockingTest extends AbstractTestContainerIntegrationTest {

  @Autowired
  private DistrictVolumeRepository repository;

  @Autowired
  private org.springframework.transaction.PlatformTransactionManager txManager;

  @Test
  void optimisticLocking_preventsStaleUpdate() {
    // Ensure auditing picks up a principal so created_by is populated (DB NOT NULL)
    JwtAuthenticationToken token = new JwtAuthenticationToken(
        this.jwt,
        AuthorityUtils.createAuthorityList()
    );
    SecurityContextHolder.getContext().setAuthentication(token);
    TransactionTemplate tt1 = new TransactionTemplate(txManager);
    TransactionTemplate tt2 = new TransactionTemplate(txManager);

    // create entity and get id
    Long id = tt1.execute(status -> {
      DistrictVolumeEntity e = new DistrictVolumeEntity();
      e.setArea(Area.INTERIOR);
      e.setStartDate(LocalDate.now().plusDays(1));
      e.setTableData(new TableData(null, null, java.util.Map.of()));
      e.setTableLevelFactor(new BigDecimal("1.000").setScale(3));
      return repository.save(e).getId();
    });

    // load a detached copy via a transaction (will be detached after txn ends)
    DistrictVolumeEntity detached = tt1.execute(status -> repository.findById(id).orElseThrow());

    // perform a commit that updates the entity (bump version)
    tt2.execute(status -> {
      DistrictVolumeEntity e = repository.findById(id).orElseThrow();
      e.setTableLevelFactor(new BigDecimal("2.000").setScale(3));
      repository.save(e);
      return null;
    });

      // sanity check: version should have incremented after the committed update
      Integer bumped = tt1.execute(status -> repository.findById(id).orElseThrow().getVersion());
      assertThat(bumped).isGreaterThan(0);

    // attempt to save the stale/detached entity (should fail optimistic lock)
    assertThatThrownBy(() -> tt1.execute(status -> repository.save(detached)))
        .isInstanceOf(ObjectOptimisticLockingFailureException.class);
  }
}
