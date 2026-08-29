package ca.bc.gov.nrs.hrs.entity.block;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Version;
import java.lang.reflect.Method;
import java.util.Arrays;
import org.junit.jupiter.api.Test;

/** Contract tests for the submission persistence model's structural rules. */
class SubmissionPersistenceMappingTest {
  private static final Class<?>[] ENTITIES = {
      ReportingUnitEntity.class,
      BlockEntity.class,
      DistrictAverageBlockEntity.class,
      BlockMarkEntity.class,
      BlockAreaSegmentEntity.class,
      BlockAttachmentEntity.class,
      BlockSubmitterEntity.class,
      BlockSponsorEntity.class,
      BlockRequirementEntity.class,
      BlockCommentEntity.class,
      BlockCalculationSnapshotEntity.class,
      StatusEventEntity.class
  };

  @Test
  void submissionTypesAreEntitiesWithoutEnumPersistence() {
    for (Class<?> entity : ENTITIES) {
      assertThat(entity.isAnnotationPresent(Entity.class)).isTrue();
      assertThat(entity.getDeclaredMethods()).noneMatch(this::isEnumMapping);
    }
  }

  @Test
  void onlyAggregateRootsHaveOptimisticLocking() {
    assertThat(versionCount(ReportingUnitEntity.class)).isEqualTo(1);
    assertThat(versionCount(BlockEntity.class)).isEqualTo(1);
    assertThat(versionCount(DistrictAverageBlockEntity.class)).isZero();
    assertThat(versionCount(BlockMarkEntity.class)).isZero();
    assertThat(versionCount(BlockCalculationSnapshotEntity.class)).isZero();
  }

  @Test
  void calculationSnapshotsExposeNoMutators() {
    assertThat(BlockCalculationSnapshotEntity.class.getDeclaredMethods())
        .noneMatch(method -> method.getName().startsWith("set"));
  }

  private boolean isEnumMapping(Method method) {
    return method.isAnnotationPresent(Enumerated.class);
  }

  private int versionCount(Class<?> type) {
    return (int) Arrays.stream(type.getDeclaredFields())
        .filter(field -> field.isAnnotationPresent(Version.class))
        .count();
  }
}
