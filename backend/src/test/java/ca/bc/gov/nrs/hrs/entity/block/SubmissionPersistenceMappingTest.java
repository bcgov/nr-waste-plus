package ca.bc.gov.nrs.hrs.entity.block;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Version;
import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.ArrayList;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

/** Contract tests for the submission persistence model's structural rules. */
@DisplayName("Unit Test | Submission Persistence Mapping")
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

  @DisplayName("Submission Types Are Entities Without Enum Persistence")
  @Test
  void submissionTypesAreEntitiesWithoutEnumPersistence() {
    for (Class<?> entity : ENTITIES) {
      assertThat(entity.isAnnotationPresent(Entity.class)).isTrue();
      assertThat(allFields(entity)).noneMatch(this::isEnumMapping);
    }
  }

  @DisplayName("Only Aggregate Roots Have Optimistic Locking")
  @Test
  void onlyAggregateRootsHaveOptimisticLocking() {
    assertThat(versionCount(ReportingUnitEntity.class)).isEqualTo(1);
    assertThat(versionCount(BlockEntity.class)).isEqualTo(1);
    assertThat(versionCount(DistrictAverageBlockEntity.class)).isZero();
    assertThat(versionCount(BlockMarkEntity.class)).isZero();
    assertThat(versionCount(BlockCalculationSnapshotEntity.class)).isZero();
  }

  @DisplayName("Calculation Snapshots Expose No Mutators")
  @Test
  void calculationSnapshotsExposeNoMutators() {
    assertThat(BlockCalculationSnapshotEntity.class.getDeclaredMethods())
        .noneMatch(method -> method.getName().startsWith("set"));
  }

  private boolean isEnumMapping(Field field) {
    return field.isAnnotationPresent(Enumerated.class);
  }

  private Field[] allFields(Class<?> type) {
    var fields = new ArrayList<Field>();
    for (Class<?> current = type; current != null; current = current.getSuperclass()) {
      fields.addAll(Arrays.asList(current.getDeclaredFields()));
    }
    return fields.toArray(Field[]::new);
  }

  private int versionCount(Class<?> type) {
    return (int) Arrays.stream(type.getDeclaredFields())
        .filter(field -> field.isAnnotationPresent(Version.class))
        .count();
  }
}
