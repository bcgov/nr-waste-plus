package ca.bc.gov.nrs.hrs.service.block;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.dto.block.BlockType;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.exception.BlockNotFoundException;
import ca.bc.gov.nrs.hrs.exception.DuplicateBlockException;
import ca.bc.gov.nrs.hrs.exception.ReportingUnitNotFoundException;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwtSecurityContextFactory;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Block Service")
class BlockServiceTest {

  private static final Long RU_ID = 10L;
  private static final Long BLOCK_ID = 100L;
  private static final String CLIENT_NUMBER = "00012797";

  @Mock
  private BlockRepository blockRepository;

  @Mock
  private ReportingUnitRepository reportingUnitRepository;

  @Mock
  private ca.bc.gov.nrs.hrs.provider.legacy.LegacyApiProvider legacyApiProvider;

  @Mock
  private ca.bc.gov.nrs.hrs.mapper.block.BlockMapper blockMapper;

  @InjectMocks
  private BlockService blockService;

  private ReportingUnitEntity reportingUnit;
  private Jwt bceidJwt;
  private Jwt idirJwt;

  @BeforeEach
  void setUp() {
    reportingUnit = new ReportingUnitEntity();
    reportingUnit.setId(RU_ID);
    reportingUnit.setClientNumber(CLIENT_NUMBER);

    bceidJwt =
        WithMockJwtSecurityContextFactory.createJwt(
            "bceid-user",
            List.of("WASTE_PLUS_SUBMITTER_" + CLIENT_NUMBER),
            "bceidbusiness",
            "BCeID User",
            "bceid@example.com");

    idirJwt =
        WithMockJwtSecurityContextFactory.createJwt(
            "idir-user",
            List.of("WASTE_PLUS_ADMIN"),
            "idir",
            "IDIR User",
            "idir@example.com");
  }

  @Test
  @DisplayName("create throws ReportingUnitNotFoundException when reporting unit does not exist")
  void create_whenReportingUnitNotFound_throwsException() {
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> blockService.create(idirJwt, RU_ID, BlockType.DISTRICT_AVERAGE))
        .isInstanceOf(ReportingUnitNotFoundException.class);

    verify(blockRepository, never()).saveAndFlush(any());
  }

  @Test
  @DisplayName("create throws ReportingUnitNotFoundException for unauthorized BCeID user")
  void create_whenBceidUserUnauthorized_throwsException() {
    Jwt unauthorizedBceidJwt =
        WithMockJwtSecurityContextFactory.createJwt(
            "other-user",
            List.of("WASTE_PLUS_SUBMITTER_99999999"),
            "bceidbusiness",
            "Other User",
            "other@example.com");

    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));

    assertThatThrownBy(
            () -> blockService.create(unauthorizedBceidJwt, RU_ID, BlockType.DISTRICT_AVERAGE))
        .isInstanceOf(ReportingUnitNotFoundException.class);

    verify(blockRepository, never()).saveAndFlush(any());
  }

  @Test
  @DisplayName("create successfully creates and persists block for authorized BCeID user")
  void create_whenAuthorizedBceidUser_createsBlock() {
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));

    BlockEntity saved = new BlockEntity();
    saved.setId(BLOCK_ID);
    saved.setReportingUnitId(RU_ID);
    saved.setBlockType("DISTRICT_AVERAGE");
    saved.setDraft(true);

    when(blockRepository.saveAndFlush(any(BlockEntity.class))).thenReturn(saved);

    BlockEntity result = blockService.create(bceidJwt, RU_ID, BlockType.DISTRICT_AVERAGE);

    assertThat(result).isNotNull();
    assertThat(result.getId()).isEqualTo(BLOCK_ID);
    assertThat(result.getReportingUnitId()).isEqualTo(RU_ID);
    assertThat(result.getBlockType()).isEqualTo("DISTRICT_AVERAGE");
    assertThat(result.isDraft()).isTrue();

    ArgumentCaptor<BlockEntity> captor = ArgumentCaptor.forClass(BlockEntity.class);
    verify(blockRepository).saveAndFlush(captor.capture());
    BlockEntity persisted = captor.getValue();
    assertThat(persisted.getReportingUnitId()).isEqualTo(RU_ID);
    assertThat(persisted.getBlockType()).isEqualTo("DISTRICT_AVERAGE");
    assertThat(persisted.isDraft()).isTrue();
    assertThat(persisted.getRevision()).isNull();
  }

  @Test
  @DisplayName("create successfully creates block when jwt is null")
  void create_whenJwtIsNull_createsBlock() {
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));

    BlockEntity saved = new BlockEntity();
    saved.setId(BLOCK_ID);
    when(blockRepository.saveAndFlush(any(BlockEntity.class))).thenReturn(saved);

    BlockEntity result = blockService.create(null, RU_ID, BlockType.DISTRICT_AVERAGE);

    assertThat(result).isSameAs(saved);
  }

  @Test
  @DisplayName("create throws DuplicateBlockException on constraint violation via Hibernate CVE")
  void create_whenDuplicateDaConstraintViolatedViaHibernate_throwsDuplicateBlockException() {
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));

    ConstraintViolationException cve =
        new ConstraintViolationException("duplicate key", null, "uq_block_one_da_per_ru");
    DataIntegrityViolationException dive =
        new DataIntegrityViolationException("Constraint violation", cve);

    when(blockRepository.saveAndFlush(any(BlockEntity.class))).thenThrow(dive);

    assertThatThrownBy(() -> blockService.create(idirJwt, RU_ID, BlockType.DISTRICT_AVERAGE))
        .isInstanceOf(DuplicateBlockException.class);
  }

  @Test
  @DisplayName("create throws DuplicateBlockException on constraint violation via SQLException")
  void create_whenDuplicateDaConstraintViolatedViaSqlException_throwsDuplicateBlockException() {
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));

    SQLException sqlEx =
        new SQLException(
            "duplicate key value violates unique index uq_block_one_da_per_ru", "23505");
    DataIntegrityViolationException dive =
        new DataIntegrityViolationException("Constraint violation", sqlEx);

    when(blockRepository.saveAndFlush(any(BlockEntity.class))).thenThrow(dive);

    assertThatThrownBy(() -> blockService.create(idirJwt, RU_ID, BlockType.DISTRICT_AVERAGE))
        .isInstanceOf(DuplicateBlockException.class);
  }

  @Test
  @DisplayName("create rethrows non-DA DataIntegrityViolationException")
  void create_whenOtherDataIntegrityViolation_rethrows() {
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));

    DataIntegrityViolationException dive =
        new DataIntegrityViolationException("foreign key violation");

    when(blockRepository.saveAndFlush(any(BlockEntity.class))).thenThrow(dive);

    assertThatThrownBy(() -> blockService.create(idirJwt, RU_ID, BlockType.DISTRICT_AVERAGE))
        .isInstanceOf(DataIntegrityViolationException.class)
        .isNotInstanceOf(DuplicateBlockException.class);
  }

  @Test
  @DisplayName("getOwned throws BlockNotFoundException when reporting unit does not exist")
  void getOwned_whenReportingUnitNotFound_throwsBlockNotFoundException() {
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> blockService.getOwned(idirJwt, RU_ID, BLOCK_ID))
        .isInstanceOf(BlockNotFoundException.class);
  }

  @Test
  @DisplayName("getOwned throws ReportingUnitNotFoundException for unauthorized BCeID user")
  void getOwned_whenBceidUserUnauthorized_throwsReportingUnitNotFoundException() {
    Jwt unauthorizedBceidJwt =
        WithMockJwtSecurityContextFactory.createJwt(
            "other-user",
            List.of("WASTE_PLUS_SUBMITTER_99999999"),
            "bceidbusiness",
            "Other User",
            "other@example.com");

    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));

    assertThatThrownBy(() -> blockService.getOwned(unauthorizedBceidJwt, RU_ID, BLOCK_ID))
        .isInstanceOf(ReportingUnitNotFoundException.class);
  }

  @Test
  @DisplayName("getOwned throws BlockNotFoundException when block does not exist")
  void getOwned_whenBlockNotFound_throwsBlockNotFoundException() {
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));
    when(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .thenReturn(Optional.empty());

    assertThatThrownBy(() -> blockService.getOwned(idirJwt, RU_ID, BLOCK_ID))
        .isInstanceOf(BlockNotFoundException.class);
  }

  @Test
  @DisplayName("getOwned returns block when it belongs to reporting unit")
  void getOwned_whenBlockFound_returnsBlock() {
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));

    BlockEntity block = new BlockEntity();
    block.setId(BLOCK_ID);
    block.setReportingUnitId(RU_ID);

    when(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .thenReturn(Optional.of(block));

    BlockEntity result = blockService.getOwned(idirJwt, RU_ID, BLOCK_ID);

    assertThat(result).isSameAs(block);
  }

  @Test
  @DisplayName("findAllByReportingUnitId throws ReportingUnitNotFoundException when RU not found")
  void findAllByReportingUnitId_whenRuNotFound_throwsException() {
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> blockService.findAllByReportingUnitId(idirJwt, RU_ID))
        .isInstanceOf(ReportingUnitNotFoundException.class);
  }

  @Test
  @DisplayName(
      "findAllByReportingUnitId throws ReportingUnitNotFoundException for unauthorized BCeID")
  void findAllByReportingUnitId_whenBceidUnauthorized_throwsException() {
    Jwt unauthorizedBceidJwt =
        WithMockJwtSecurityContextFactory.createJwt(
            "other-user",
            List.of("WASTE_PLUS_SUBMITTER_99999999"),
            "bceidbusiness",
            "Other User",
            "other@example.com");

    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));

    assertThatThrownBy(
            () -> blockService.findAllByReportingUnitId(unauthorizedBceidJwt, RU_ID))
        .isInstanceOf(ReportingUnitNotFoundException.class);
  }

  @Test
  @DisplayName("findAllByReportingUnitId returns list of blocks ordered by id")
  void findAllByReportingUnitId_whenFound_returnsBlocks() {
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));

    BlockEntity b1 = new BlockEntity();
    b1.setId(1L);
    BlockEntity b2 = new BlockEntity();
    b2.setId(2L);

    when(blockRepository.findAllByReportingUnitIdAndDeletedFalseOrderByIdAsc(RU_ID))
        .thenReturn(List.of(b1, b2));

    List<BlockEntity> result = blockService.findAllByReportingUnitId(idirJwt, RU_ID);

    assertThat(result).containsExactly(b1, b2);
  }
}

