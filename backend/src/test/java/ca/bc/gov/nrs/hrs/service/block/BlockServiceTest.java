package ca.bc.gov.nrs.hrs.service.block;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.dto.block.BlockMarkDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchExpandedDto;
import ca.bc.gov.nrs.hrs.dto.search.SearchExpandedSecondaryDto;
import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockType;
import ca.bc.gov.nrs.hrs.dto.block.WasteAssessmentAreaMarkDto;
import ca.bc.gov.nrs.hrs.dto.block.WasteAssessmentAreaSummaryDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockAreaSegmentEntity;
import java.math.BigDecimal;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockMarkEntity;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.entity.block.StatusEventEntity;
import ca.bc.gov.nrs.hrs.exception.BlockNotFoundException;
import ca.bc.gov.nrs.hrs.exception.DuplicateBlockException;
import ca.bc.gov.nrs.hrs.exception.ForbiddenException;
import ca.bc.gov.nrs.hrs.exception.NotFoundGenericException;
import ca.bc.gov.nrs.hrs.exception.ReportingUnitNotFoundException;
import ca.bc.gov.nrs.hrs.exception.ReportingUnitStateConflictException;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwtSecurityContextFactory;
import ca.bc.gov.nrs.hrs.repository.block.BlockAreaSegmentRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.repository.block.StatusEventRepository;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
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
import org.springframework.web.server.ResponseStatusException;
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
  private StatusEventRepository statusEventRepository;

  @Mock
  private ca.bc.gov.nrs.hrs.provider.legacy.LegacyApiProvider legacyApiProvider;

  @Mock
  private ca.bc.gov.nrs.hrs.mapper.block.BlockMapper blockMapper;

  @Mock
  private ca.bc.gov.nrs.hrs.repository.block.BlockMarkRepository blockMarkRepository;

  @Mock
  private ca.bc.gov.nrs.hrs.mapper.block.BlockMarkMapper blockMarkMapper;

  @Mock
  private BlockAreaSegmentRepository blockAreaSegmentRepository;

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
  @DisplayName("create throws ForbiddenException when BCeID user only has VIEWER role for target client")
  void create_whenBceidUserOnlyHasViewerRoleForTargetClient_throwsForbiddenException() {
    Jwt viewerOnlyBceidJwt =
        WithMockJwtSecurityContextFactory.createJwt(
            "viewer-user",
            List.of("WASTE_PLUS_SUBMITTER_99999999", "WASTE_PLUS_VIEWER_" + CLIENT_NUMBER),
            "bceidbusiness",
            "Viewer User",
            "viewer@example.com");

    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));

    assertThatThrownBy(
            () -> blockService.create(viewerOnlyBceidJwt, RU_ID, BlockType.DISTRICT_AVERAGE))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("User lacks submitter role for client " + CLIENT_NUMBER);

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
  @DisplayName("create successfully creates block when expectedReportingUnitState matches SUBMISSION")
  void create_whenExpectedReportingUnitStateMatches_createsBlock() {
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));

    BlockEntity saved = new BlockEntity();
    saved.setId(BLOCK_ID);
    when(blockRepository.saveAndFlush(any(BlockEntity.class))).thenReturn(saved);

    BlockEntity result =
        blockService.create(idirJwt, RU_ID, BlockType.DISTRICT_AVERAGE, "SUBMISSION");

    assertThat(result).isSameAs(saved);
  }

  @Test
  @DisplayName("create throws ReportingUnitStateConflictException when expected state does not match")
  void create_whenExpectedReportingUnitStateMismatch_throwsReportingUnitStateConflictException() {
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));

    assertThatThrownBy(
            () -> blockService.create(idirJwt, RU_ID, BlockType.DISTRICT_AVERAGE, "APPROVED"))
        .isInstanceOf(ReportingUnitStateConflictException.class)
        .hasMessageContaining("Reporting unit state conflict: expected 'APPROVED' but was 'SUBMISSION'");

    verify(blockRepository, never()).saveAndFlush(any());
  }

  @Test
  @DisplayName("create successfully creates block when expectedReportingUnitState matches persisted status event")
  void create_whenReportingUnitHasPersistedStatusEvent_matchesExpectedState() {
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));

    StatusEventEntity statusEvent = new StatusEventEntity();
    statusEvent.setReportingUnitId(RU_ID);
    statusEvent.setStatus("HOLD");
    when(statusEventRepository.findFirstByReportingUnitIdOrderByCreatedAtDescIdDesc(RU_ID))
        .thenReturn(Optional.of(statusEvent));

    BlockEntity saved = new BlockEntity();
    saved.setId(BLOCK_ID);
    when(blockRepository.saveAndFlush(any(BlockEntity.class))).thenReturn(saved);

    BlockEntity result =
        blockService.create(idirJwt, RU_ID, BlockType.DISTRICT_AVERAGE, "HOLD");

    assertThat(result).isSameAs(saved);
  }

  @Test
  @DisplayName("create throws conflict when reporting unit has persisted HOLD status but expected SUBMISSION")
  void create_whenReportingUnitHasPersistedStatusEvent_conflictsWithDefaultSubmissionState() {
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));

    StatusEventEntity statusEvent = new StatusEventEntity();
    statusEvent.setReportingUnitId(RU_ID);
    statusEvent.setStatus("HOLD");
    when(statusEventRepository.findFirstByReportingUnitIdOrderByCreatedAtDescIdDesc(RU_ID))
        .thenReturn(Optional.of(statusEvent));

    assertThatThrownBy(
            () -> blockService.create(idirJwt, RU_ID, BlockType.DISTRICT_AVERAGE, "SUBMISSION"))
        .isInstanceOf(ReportingUnitStateConflictException.class)
        .hasMessageContaining("Reporting unit state conflict: expected 'SUBMISSION' but was 'HOLD'");

    verify(blockRepository, never()).saveAndFlush(any());
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

  @Test
  @DisplayName("getBlockDetails throws NotFoundGenericException when block not found in postgres even for cross-client caller")
  void getBlockDetails_whenBlockNotFoundInPostgres_throwsNotFoundGenericException() {
    Jwt crossClientBceidJwt =
        WithMockJwtSecurityContextFactory.createJwt(
            "other-user",
            List.of("WASTE_PLUS_VIEWER_99999999"),
            "bceidbusiness",
            "Other User",
            "other@example.com");

    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));
    when(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .thenReturn(Optional.empty());

    assertThatThrownBy(() -> blockService.getBlockDetails(RU_ID, BLOCK_ID, crossClientBceidJwt))
        .isInstanceOf(NotFoundGenericException.class);
  }

  @Test
  @DisplayName("getBlockDetails throws ReportingUnitNotFoundException 404 when block found in postgres but caller lacks client scope")
  void getBlockDetails_whenBlockFoundInPostgresButUnauthorized_throws404() {
    Jwt crossClientBceidJwt =
        WithMockJwtSecurityContextFactory.createJwt(
            "other-user",
            List.of("WASTE_PLUS_VIEWER_99999999"),
            "bceidbusiness",
            "Other User",
            "other@example.com");

    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));

    BlockEntity block = new BlockEntity();
    block.setId(BLOCK_ID);
    block.setReportingUnitId(RU_ID);
    when(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .thenReturn(Optional.of(block));

    assertThatThrownBy(() -> blockService.getBlockDetails(RU_ID, BLOCK_ID, crossClientBceidJwt))
        .isInstanceOf(ReportingUnitNotFoundException.class)
        .matches(ex -> ((ResponseStatusException) ex).getStatusCode().value() == 404);
  }


  @Test
  @DisplayName("getBlockDetails returns postgres block with stored plcDate unchanged")
  void getBlockDetails_whenPostgresBlockHasPlcDate_returnsStoredPlcDate() {
    blockService.setClock(Clock.fixed(Instant.parse("2026-11-17T12:00:00Z"), ZoneOffset.UTC));
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));

    BlockEntity block = new BlockEntity();
    block.setId(BLOCK_ID);
    block.setReportingUnitId(RU_ID);
    block.setPlcDate(LocalDate.of(2026, 3, 15));
    when(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .thenReturn(Optional.of(block));

    var mapped =
        new ca.bc.gov.nrs.hrs.dto.block.BlockResponseDto(
            BLOCK_ID,
            RU_ID,
            "DISTRICT_AVERAGE",
            "DRAFT",
            true,
            LocalDate.of(2026, 3, 15),
            0L,
            0L,
            false,
            null,
            null);
    when(blockMapper.toResponseDto(block)).thenReturn(mapped);
    when(blockMarkRepository.findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(BLOCK_ID, "SECONDARY"))
        .thenReturn(List.of());
    when(blockMarkRepository.findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(BLOCK_ID, "ROAD_PERMIT"))
        .thenReturn(List.of());

    var result = blockService.getBlockDetails(RU_ID, BLOCK_ID, idirJwt);

    assertThat(result.plcDate()).isEqualTo(LocalDate.of(2026, 3, 15));
    assertThat(result.isLegacy()).isFalse();
    assertThat(result.secondaryTimberMarks()).isEmpty();
    assertThat(result.roadPermitTimberMarks()).isEmpty();
    assertThat(result.districtAverageVolumesSummary()).isNotNull();
    assertThat(result.districtAverageVolumesSummary().rows()).isEmpty();
    assertThat(result.districtAverageVolumesSummary().totals().totalBillableVolumeM3())
        .isEqualByComparingTo("0");
    assertThat(result.districtAverageVolumesSummary().totals().totalCutControlVolumeM3())
        .isEqualByComparingTo("0");
  }

  @Test
  @DisplayName("getBlockDetails returns postgres block with default plcDate when stored value is missing")
  void getBlockDetails_whenPostgresBlockMissingPlcDate_returnsDefaultPlcDate() {
    blockService.setClock(Clock.fixed(Instant.parse("2026-11-17T12:00:00Z"), ZoneOffset.UTC));
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));

    BlockEntity block = new BlockEntity();
    block.setId(BLOCK_ID);
    block.setReportingUnitId(RU_ID);
    when(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .thenReturn(Optional.of(block));

    var mapped =
        new ca.bc.gov.nrs.hrs.dto.block.BlockResponseDto(
            BLOCK_ID,
            RU_ID,
            "DISTRICT_AVERAGE",
            "DRAFT",
            true,
            null,
            0L,
            0L,
            false,
            null,
            null);
    when(blockMapper.toResponseDto(block)).thenReturn(mapped);
    when(blockMarkRepository.findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(BLOCK_ID, "SECONDARY"))
        .thenReturn(List.of());
    when(blockMarkRepository.findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(BLOCK_ID, "ROAD_PERMIT"))
        .thenReturn(List.of());

    var result = blockService.getBlockDetails(RU_ID, BLOCK_ID, idirJwt);

    assertThat(result.plcDate()).isEqualTo(LocalDate.of(2026, 11, 16));
    assertThat(result.isLegacy()).isFalse();
    assertThat(result.secondaryTimberMarks()).isEmpty();
    assertThat(result.roadPermitTimberMarks()).isEmpty();
    assertThat(result.districtAverageVolumesSummary()).isNotNull();
    assertThat(result.districtAverageVolumesSummary().rows()).isEmpty();
    assertThat(result.districtAverageVolumesSummary().totals().totalBillableVolumeM3())
        .isEqualByComparingTo("0");
    assertThat(result.districtAverageVolumesSummary().totals().totalCutControlVolumeM3())
        .isEqualByComparingTo("0");
  }

  @Test
  @DisplayName("getBlockDetails returns legacy block with default plcDate when no stored value exists")
  void getBlockDetails_whenLegacyBlockMissingPlcDate_returnsDefaultPlcDate() {
    blockService.setClock(Clock.fixed(Instant.parse("2026-11-17T12:00:00Z"), ZoneOffset.UTC));
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID)).thenReturn(Optional.empty());

    var legacyRu =
        new ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitLegacyDetailsDto(
            CLIENT_NUMBER,
            "00",
            new ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto("AVG", "Average"),
            new ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto("DND", "Nadina"));
    when(legacyApiProvider.getReportingUnitDetails(RU_ID)).thenReturn(legacyRu);

    var legacyRow =
        new ca.bc.gov.nrs.hrs.dto.block.BlockListItemDto(
            BLOCK_ID,
            "FILE",
            "CP",
            "CUT",
            "TM",
            null,
            null,
            "sub",
            new ca.bc.gov.nrs.hrs.dto.block.BlockListItemDto.Status("DFT", "Draft"),
            null,
            null);
    when(legacyApiProvider.getReportingUnitBlocksStrict(RU_ID)).thenReturn(List.of(legacyRow));
    when(legacyApiProvider.getSearchExpanded(RU_ID, BLOCK_ID))
        .thenReturn(
            new ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchExpandedDto(
                BLOCK_ID, null, null, null, false, false, null, List.of(), 0.0, 0.0, null, null, null, 0L, 0L));

    var result = blockService.getBlockDetails(RU_ID, BLOCK_ID, idirJwt);

    assertThat(result.plcDate()).isEqualTo(LocalDate.of(2026, 11, 16));
    assertThat(result.isLegacy()).isTrue();
    assertThat(result.secondaryTimberMarks()).isEmpty();
    assertThat(result.roadPermitTimberMarks()).isEmpty();
    assertThat(result.districtAverageVolumesSummary()).isNotNull();
    assertThat(result.districtAverageVolumesSummary().rows()).isEmpty();
    assertThat(result.districtAverageVolumesSummary().totals().totalBillableVolumeM3())
        .isEqualByComparingTo("0");
    assertThat(result.districtAverageVolumesSummary().totals().totalCutControlVolumeM3())
        .isEqualByComparingTo("0");
  }



  @Test
  @DisplayName("getBlockDetails returns postgres block with loaded secondary and road permit timber marks")
  void getBlockDetails_whenPostgresBlockHasMarks_returnsLoadedMarks() {
    blockService.setClock(Clock.fixed(Instant.parse("2026-11-17T12:00:00Z"), ZoneOffset.UTC));
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));

    BlockEntity block = new BlockEntity();
    block.setId(BLOCK_ID);
    block.setReportingUnitId(RU_ID);
    block.setPlcDate(LocalDate.of(2026, 3, 15));
    when(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .thenReturn(Optional.of(block));

    var mapped =
        new ca.bc.gov.nrs.hrs.dto.block.BlockResponseDto(
            BLOCK_ID, RU_ID, "DISTRICT_AVERAGE", "DRAFT", true,
            LocalDate.of(2026, 3, 15), 0L, 0L, false, null, null);
    when(blockMapper.toResponseDto(block)).thenReturn(mapped);

    BlockMarkEntity secEntity = new BlockMarkEntity();
    secEntity.setId(11L); secEntity.setBlockId(BLOCK_ID); secEntity.setMarkType("SECONDARY");
    secEntity.setSequenceNo(1); secEntity.setMark("SEC1");
    BlockMarkEntity roadEntity = new BlockMarkEntity();
    roadEntity.setId(12L); roadEntity.setBlockId(BLOCK_ID); roadEntity.setMarkType("ROAD_PERMIT");
    roadEntity.setSequenceNo(1); roadEntity.setMark("R123");

    BlockMarkDto secDto = new BlockMarkDto(11L, BLOCK_ID, "SECONDARY", 1, "SEC1", null, null, null, null, null);
    BlockMarkDto roadDto = new BlockMarkDto(12L, BLOCK_ID, "ROAD_PERMIT", 1, "R123", null, null, null, null, null);
    when(blockMarkRepository.findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(BLOCK_ID, "SECONDARY"))
        .thenReturn(List.of(secEntity));
    when(blockMarkRepository.findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(BLOCK_ID, "ROAD_PERMIT"))
        .thenReturn(List.of(roadEntity));
    when(blockMarkMapper.toDto(secEntity)).thenReturn(secDto);
    when(blockMarkMapper.toDto(roadEntity)).thenReturn(roadDto);

    var result = blockService.getBlockDetails(RU_ID, BLOCK_ID, idirJwt);

    assertThat(result.secondaryTimberMarks()).containsExactly(secDto);
    assertThat(result.roadPermitTimberMarks()).containsExactly(roadDto);
    assertThat(result.districtAverageVolumesSummary()).isNotNull();
    assertThat(result.districtAverageVolumesSummary().rows()).isEmpty();
    assertThat(result.districtAverageVolumesSummary().totals().totalBillableVolumeM3())
        .isEqualByComparingTo("0");
    assertThat(result.districtAverageVolumesSummary().totals().totalCutControlVolumeM3())
        .isEqualByComparingTo("0");
  }

  @Test
  @DisplayName("getBlockDetails maps legacy expanded secondary and road permit marks (R-prefixed, deduped, sequenced)")
  void getBlockDetails_whenLegacyExpandedHasMarks_mapsRichTimberMarks() {
    blockService.setClock(Clock.fixed(Instant.parse("2026-11-17T12:00:00Z"), ZoneOffset.UTC));
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID)).thenReturn(Optional.empty());

    var legacyRu =
        new ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitLegacyDetailsDto(
            CLIENT_NUMBER, "00",
            new CodeDescriptionDto("AVG", "Average"),
            new CodeDescriptionDto("DND", "Nadina"));
    when(legacyApiProvider.getReportingUnitDetails(RU_ID)).thenReturn(legacyRu);

    var legacyRow =
        new ca.bc.gov.nrs.hrs.dto.block.BlockListItemDto(
            BLOCK_ID, "FILE", "CP", "CUT", "RPRIMARY",
            null, null, "sub",
            new ca.bc.gov.nrs.hrs.dto.block.BlockListItemDto.Status("DFT", "Draft"),
            null, null);
    when(legacyApiProvider.getReportingUnitBlocksStrict(RU_ID)).thenReturn(List.of(legacyRow));

    var expanded = new ReportingUnitSearchExpandedDto(
        BLOCK_ID, "FILE", "CP", "RPRIMARY", false, true, null,
        java.util.Arrays.asList(
            new SearchExpandedSecondaryDto("SEC2", new CodeDescriptionDto("APP", "Approved"), 1.0),
            new SearchExpandedSecondaryDto("RSEC", new CodeDescriptionDto("DFT", "Draft"), 2.0),
            new SearchExpandedSecondaryDto("", null, null),
            null),
        0.0, 0.0, null, null, null, 0L, 0L);
    when(legacyApiProvider.getSearchExpanded(RU_ID, BLOCK_ID)).thenReturn(expanded);
    when(legacyApiProvider.getDistrictAverageVolumes(RU_ID, BLOCK_ID)).thenReturn(List.of());

    var result = blockService.getBlockDetails(RU_ID, BLOCK_ID, idirJwt);

    assertThat(result.secondaryTimberMarks()).hasSize(1);
    assertThat(result.secondaryTimberMarks().get(0).mark()).isEqualTo("SEC2");
    assertThat(result.secondaryTimberMarks().get(0).markType()).isEqualTo("SECONDARY");
    assertThat(result.secondaryTimberMarks().get(0).sequenceNo()).isEqualTo(1);
    assertThat(result.roadPermitTimberMarks())
        .extracting(BlockMarkDto::mark)
        .containsExactly("RPRIMARY", "RSEC");
    assertThat(result.roadPermitTimberMarks()).allMatch(m -> "ROAD_PERMIT".equals(m.markType()));
    assertThat(result.roadPermitTimberMarks())
        .extracting(BlockMarkDto::sequenceNo)
        .containsExactly(1, 2);
    assertThat(result.wasteAssessmentAreaSummary()).isNotNull();
    assertThat(result.wasteAssessmentAreaSummary().primary())
        .isEqualTo(new WasteAssessmentAreaMarkDto("RPRIMARY", BigDecimal.valueOf(0.0)));
    assertThat(result.wasteAssessmentAreaSummary().secondary())
        .containsExactly(new WasteAssessmentAreaMarkDto("SEC2", BigDecimal.valueOf(1.0)));
    assertThat(result.wasteAssessmentAreaSummary().totalNetWasteAreaHa())
        .isEqualByComparingTo("1.0");
    assertThat(result.districtAverageVolumesSummary()).isNotNull();
    assertThat(result.districtAverageVolumesSummary().rows()).isEmpty();
    assertThat(result.districtAverageVolumesSummary().totals().totalBillableVolumeM3())
        .isEqualByComparingTo("0");
    assertThat(result.districtAverageVolumesSummary().totals().totalCutControlVolumeM3())
        .isEqualByComparingTo("0");
  }


  @Test
  @DisplayName("getBlockDetails returns postgres waste assessment area summary with per-mark attributed net areas")
  void getBlockDetails_whenPostgresBlockHasMarksAndSegments_returnsWasteAssessmentAreaSummary() {
    blockService.setClock(Clock.fixed(Instant.parse("2026-11-17T12:00:00Z"), ZoneOffset.UTC));
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));

    BlockEntity block = new BlockEntity();
    block.setId(BLOCK_ID);
    block.setReportingUnitId(RU_ID);
    block.setPlcDate(LocalDate.of(2026, 3, 15));
    when(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .thenReturn(Optional.of(block));

    var mapped =
        new ca.bc.gov.nrs.hrs.dto.block.BlockResponseDto(
            BLOCK_ID,
            RU_ID,
            "DISTRICT_AVERAGE",
            "DRAFT",
            true,
            LocalDate.of(2026, 3, 15),
            0L,
            0L,
            false,
            null,
            null);
    when(blockMapper.toResponseDto(block)).thenReturn(mapped);

    BlockMarkEntity primary = new BlockMarkEntity();
    primary.setId(1L);
    primary.setBlockId(BLOCK_ID);
    primary.setMarkType("PRIMARY");
    primary.setSequenceNo(0);
    primary.setMark("M1");
    primary.setTimberMark(" TM-PRIMARY ");

    BlockMarkEntity secondary = new BlockMarkEntity();
    secondary.setId(2L);
    secondary.setBlockId(BLOCK_ID);
    secondary.setMarkType("SECONDARY");
    secondary.setSequenceNo(1);
    secondary.setMark("SEC-MARK");
    secondary.setTimberMark(null);

    BlockMarkEntity secondaryNoArea = new BlockMarkEntity();
    secondaryNoArea.setId(3L);
    secondaryNoArea.setBlockId(BLOCK_ID);
    secondaryNoArea.setMarkType("SECONDARY");
    secondaryNoArea.setSequenceNo(2);
    secondaryNoArea.setMark("SEC-NO-AREA");

    when(blockMarkRepository.findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(
            BLOCK_ID, "PRIMARY"))
        .thenReturn(List.of(primary));
    when(blockMarkRepository.findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(
            BLOCK_ID, "SECONDARY"))
        .thenReturn(List.of(secondary, secondaryNoArea));
    when(blockMarkRepository.findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(
            BLOCK_ID, "ROAD_PERMIT"))
        .thenReturn(List.of());

    BlockAreaSegmentEntity segPrimaryA = new BlockAreaSegmentEntity();
    segPrimaryA.setBlockMarkId(1L);
    segPrimaryA.setNetWasteAreaHa(new BigDecimal("1.25"));
    BlockAreaSegmentEntity segPrimaryB = new BlockAreaSegmentEntity();
    segPrimaryB.setBlockMarkId(1L);
    segPrimaryB.setNetWasteAreaHa(new BigDecimal("0.75"));
    BlockAreaSegmentEntity segSecondaryNull = new BlockAreaSegmentEntity();
    segSecondaryNull.setBlockMarkId(2L);
    segSecondaryNull.setNetWasteAreaHa(null);
    BlockAreaSegmentEntity segUnlinked = new BlockAreaSegmentEntity();
    segUnlinked.setBlockMarkId(null);
    segUnlinked.setNetWasteAreaHa(new BigDecimal("99.99"));
    when(blockAreaSegmentRepository.findByBlockIdAndDeletedFalse(BLOCK_ID))
        .thenReturn(List.of(segPrimaryA, segPrimaryB, segSecondaryNull, segUnlinked));

    var result = blockService.getBlockDetails(RU_ID, BLOCK_ID, idirJwt);

    WasteAssessmentAreaSummaryDto summary = result.wasteAssessmentAreaSummary();
    assertThat(summary).isNotNull();
    assertThat(summary.primary())
        .isEqualTo(new WasteAssessmentAreaMarkDto("TM-PRIMARY", new BigDecimal("2.00")));
    assertThat(summary.secondary())
        .containsExactly(
            new WasteAssessmentAreaMarkDto("SEC-MARK", null),
            new WasteAssessmentAreaMarkDto("SEC-NO-AREA", null));
    assertThat(summary.totalNetWasteAreaHa()).isEqualByComparingTo("2.00");
    assertThat(result.districtAverageVolumesSummary()).isNotNull();
    assertThat(result.districtAverageVolumesSummary().rows()).isEmpty();
    assertThat(result.districtAverageVolumesSummary().totals().totalBillableVolumeM3())
        .isEqualByComparingTo("0");
    assertThat(result.districtAverageVolumesSummary().totals().totalCutControlVolumeM3())
        .isEqualByComparingTo("0");
  }

  @Test
  @DisplayName("getBlockDetails returns postgres summary with null primary and zero total when no marks exist")
  void getBlockDetails_whenPostgresBlockHasNoMarks_returnsEmptyWasteAssessmentAreaSummary() {
    blockService.setClock(Clock.fixed(Instant.parse("2026-11-17T12:00:00Z"), ZoneOffset.UTC));
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
        .thenReturn(Optional.of(reportingUnit));

    BlockEntity block = new BlockEntity();
    block.setId(BLOCK_ID);
    block.setReportingUnitId(RU_ID);
    when(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
        .thenReturn(Optional.of(block));

    var mapped =
        new ca.bc.gov.nrs.hrs.dto.block.BlockResponseDto(
            BLOCK_ID, RU_ID, "DISTRICT_AVERAGE", "DRAFT", true, null, 0L, 0L, false, null, null);
    when(blockMapper.toResponseDto(block)).thenReturn(mapped);
    when(blockMarkRepository.findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(
            BLOCK_ID, "SECONDARY"))
        .thenReturn(List.of());
    when(blockMarkRepository.findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(
            BLOCK_ID, "ROAD_PERMIT"))
        .thenReturn(List.of());
    when(blockMarkRepository.findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(
            BLOCK_ID, "PRIMARY"))
        .thenReturn(List.of());
    when(blockAreaSegmentRepository.findByBlockIdAndDeletedFalse(BLOCK_ID)).thenReturn(List.of());

    var result = blockService.getBlockDetails(RU_ID, BLOCK_ID, idirJwt);

    assertThat(result.wasteAssessmentAreaSummary()).isNotNull();
    assertThat(result.wasteAssessmentAreaSummary().primary()).isNull();
    assertThat(result.wasteAssessmentAreaSummary().secondary()).isEmpty();
    assertThat(result.wasteAssessmentAreaSummary().totalNetWasteAreaHa())
        .isEqualByComparingTo("0");
    assertThat(result.districtAverageVolumesSummary()).isNotNull();
    assertThat(result.districtAverageVolumesSummary().rows()).isEmpty();
    assertThat(result.districtAverageVolumesSummary().totals().totalBillableVolumeM3())
        .isEqualByComparingTo("0");
    assertThat(result.districtAverageVolumesSummary().totals().totalCutControlVolumeM3())
        .isEqualByComparingTo("0");
  }

  @Test
  @DisplayName("getBlockDetails returns legacy waste assessment area summary derived from expanded search")
  void getBlockDetails_whenLegacyExpandedHasAreas_returnsWasteAssessmentAreaSummary() {
    blockService.setClock(Clock.fixed(Instant.parse("2026-11-17T12:00:00Z"), ZoneOffset.UTC));
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID)).thenReturn(Optional.empty());

    var legacyRu =
        new ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitLegacyDetailsDto(
            CLIENT_NUMBER,
            "00",
            new CodeDescriptionDto("AVG", "Average"),
            new CodeDescriptionDto("DND", "Nadina"));
    when(legacyApiProvider.getReportingUnitDetails(RU_ID)).thenReturn(legacyRu);

    var legacyRow =
        new ca.bc.gov.nrs.hrs.dto.block.BlockListItemDto(
            BLOCK_ID,
            "FILE",
            "CP",
            "CUT",
            "TM-PRI",
            null,
            null,
            "sub",
            new ca.bc.gov.nrs.hrs.dto.block.BlockListItemDto.Status("DFT", "Draft"),
            null,
            null);
    when(legacyApiProvider.getReportingUnitBlocksStrict(RU_ID)).thenReturn(List.of(legacyRow));

    var expanded =
        new ReportingUnitSearchExpandedDto(
            BLOCK_ID,
            "FILE",
            "CP",
            "TM-PRI",
            false,
            true,
            null,
            java.util.Arrays.asList(
                new SearchExpandedSecondaryDto(
                    "SEC2", new CodeDescriptionDto("APP", "Approved"), 1.5),
                new SearchExpandedSecondaryDto(
                    "RSEC", new CodeDescriptionDto("DFT", "Draft"), 2.0),
                new SearchExpandedSecondaryDto(
                    "SEC3", new CodeDescriptionDto("DFT", "Draft"), null),
                new SearchExpandedSecondaryDto("", null, null),
                null),
            3.0,
            0.0,
            null,
            null,
            null,
            0L,
            0L);
    when(legacyApiProvider.getSearchExpanded(RU_ID, BLOCK_ID)).thenReturn(expanded);
    when(legacyApiProvider.getDistrictAverageVolumes(RU_ID, BLOCK_ID)).thenReturn(List.of());

    var result = blockService.getBlockDetails(RU_ID, BLOCK_ID, idirJwt);

    WasteAssessmentAreaSummaryDto summary = result.wasteAssessmentAreaSummary();
    assertThat(summary).isNotNull();
    assertThat(summary.primary())
        .isEqualTo(new WasteAssessmentAreaMarkDto("TM-PRI", BigDecimal.valueOf(3.0)));
    assertThat(summary.secondary())
        .containsExactly(
            new WasteAssessmentAreaMarkDto("SEC2", BigDecimal.valueOf(1.5)),
            new WasteAssessmentAreaMarkDto("SEC3", null));
    assertThat(summary.totalNetWasteAreaHa()).isEqualByComparingTo("4.5");
    assertThat(result.districtAverageVolumesSummary()).isNotNull();
    assertThat(result.districtAverageVolumesSummary().rows()).isEmpty();
    assertThat(result.districtAverageVolumesSummary().totals().totalBillableVolumeM3())
        .isEqualByComparingTo("0");
    assertThat(result.districtAverageVolumesSummary().totals().totalCutControlVolumeM3())
        .isEqualByComparingTo("0");
  }

  @Test
  @DisplayName("getBlockDetails returns legacy summary with zero total when expanded areas are null")
  void getBlockDetails_whenLegacyExpandedHasNullAreas_returnsSummaryWithZeroTotal() {
    blockService.setClock(Clock.fixed(Instant.parse("2026-11-17T12:00:00Z"), ZoneOffset.UTC));
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID)).thenReturn(Optional.empty());

    var legacyRu =
        new ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitLegacyDetailsDto(
            CLIENT_NUMBER,
            "00",
            new CodeDescriptionDto("AVG", "Average"),
            new CodeDescriptionDto("DND", "Nadina"));
    when(legacyApiProvider.getReportingUnitDetails(RU_ID)).thenReturn(legacyRu);

    var legacyRow =
        new ca.bc.gov.nrs.hrs.dto.block.BlockListItemDto(
            BLOCK_ID,
            "FILE",
            "CP",
            "CUT",
            "TM-PRI",
            null,
            null,
            "sub",
            new ca.bc.gov.nrs.hrs.dto.block.BlockListItemDto.Status("DFT", "Draft"),
            null,
            null);
    when(legacyApiProvider.getReportingUnitBlocksStrict(RU_ID)).thenReturn(List.of(legacyRow));
    when(legacyApiProvider.getSearchExpanded(RU_ID, BLOCK_ID))
        .thenReturn(
            new ReportingUnitSearchExpandedDto(
                BLOCK_ID,
                "FILE",
                "CP",
                "TM-PRI",
                false,
                false,
                null,
                List.of(new SearchExpandedSecondaryDto("SEC2", null, null)),
                null,
                null,
                null,
                null,
                null,
                0L,
                0L));
    when(legacyApiProvider.getDistrictAverageVolumes(RU_ID, BLOCK_ID)).thenReturn(List.of());

    var result = blockService.getBlockDetails(RU_ID, BLOCK_ID, idirJwt);

    assertThat(result.wasteAssessmentAreaSummary().primary())
        .isEqualTo(new WasteAssessmentAreaMarkDto("TM-PRI", null));
    assertThat(result.wasteAssessmentAreaSummary().secondary())
        .containsExactly(new WasteAssessmentAreaMarkDto("SEC2", null));
    assertThat(result.wasteAssessmentAreaSummary().totalNetWasteAreaHa())
        .isEqualByComparingTo("0");
    assertThat(result.districtAverageVolumesSummary()).isNotNull();
    assertThat(result.districtAverageVolumesSummary().rows()).isEmpty();
    assertThat(result.districtAverageVolumesSummary().totals().totalBillableVolumeM3())
        .isEqualByComparingTo("0");
    assertThat(result.districtAverageVolumesSummary().totals().totalCutControlVolumeM3())
        .isEqualByComparingTo("0");
  }



  @Test
  @DisplayName("getBlockDetails returns legacy district average volumes summary from stratum rows")
  void getBlockDetails_whenLegacyDistrictAverageVolumesExist_returnsMappedSummary() {
    blockService.setClock(Clock.fixed(Instant.parse("2026-11-17T12:00:00Z"), ZoneOffset.UTC));
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID)).thenReturn(Optional.empty());

    var legacyRu =
        new ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitLegacyDetailsDto(
            CLIENT_NUMBER,
            "00",
            new CodeDescriptionDto("AVG", "Average"),
            new CodeDescriptionDto("DND", "Nadina"));
    when(legacyApiProvider.getReportingUnitDetails(RU_ID)).thenReturn(legacyRu);

    var legacyRow =
        new ca.bc.gov.nrs.hrs.dto.block.BlockListItemDto(
            BLOCK_ID,
            "FILE",
            "CP",
            "CUT",
            "TM-PRI",
            null,
            null,
            "sub",
            new ca.bc.gov.nrs.hrs.dto.block.BlockListItemDto.Status("DFT", "Draft"),
            null,
            null);
    when(legacyApiProvider.getReportingUnitBlocksStrict(RU_ID)).thenReturn(List.of(legacyRow));
    when(legacyApiProvider.getSearchExpanded(RU_ID, BLOCK_ID))
        .thenReturn(
            new ReportingUnitSearchExpandedDto(
                BLOCK_ID, "FILE", "CP", "TM-PRI", false, false, null, List.of(),
                null, null, null, null, null, 0L, 0L));
    when(legacyApiProvider.getDistrictAverageVolumes(RU_ID, BLOCK_ID))
        .thenReturn(
            java.util.Arrays.asList(
                new ca.bc.gov.nrs.hrs.dto.search.DistrictAverageVolumeLegacyDto(
                    "Dispersed",
                    "Roadside",
                    "R",
                    "Rubber-tired Skidder",
                    "Ocular Estimate",
                    "Not Stratified",
                    new BigDecimal("29.4"),
                    new BigDecimal("12.0")),
                new ca.bc.gov.nrs.hrs.dto.search.DistrictAverageVolumeLegacyDto(
                    "Accumulated",
                    "Roadside",
                    "H",
                    null,
                    "Ocular Estimate",
                    "Not Stratified",
                    null,
                    null),
                null));

    var result = blockService.getBlockDetails(RU_ID, BLOCK_ID, idirJwt);

    assertThat(result.districtAverageVolumesSummary()).isNotNull();
    assertThat(result.districtAverageVolumesSummary().rows()).hasSize(2);
    assertThat(result.districtAverageVolumesSummary().rows().get(0).populationType())
        .isEqualTo("Dispersed");
    assertThat(result.districtAverageVolumesSummary().rows().get(0).harvestMethodCode())
        .isEqualTo("Rubber-tired Skidder");
    assertThat(result.districtAverageVolumesSummary().rows().get(0).netWasteAreaHa())
        .isEqualByComparingTo("29.4");
    assertThat(result.districtAverageVolumesSummary().rows().get(0).totalBillableVolumeM3())
        .isNull();
    assertThat(result.districtAverageVolumesSummary().rows().get(0).totalCutControlVolumeM3())
        .isNull();
    assertThat(result.districtAverageVolumesSummary().rows().get(1).harvestMethodCode())
        .isEqualTo("H");
    assertThat(result.districtAverageVolumesSummary().rows().get(1).netWasteAreaHa()).isNull();
    assertThat(result.districtAverageVolumesSummary().totals().totalBillableVolumeM3())
        .isEqualByComparingTo("0");
    assertThat(result.districtAverageVolumesSummary().totals().totalCutControlVolumeM3())
        .isEqualByComparingTo("0");
  }

}
