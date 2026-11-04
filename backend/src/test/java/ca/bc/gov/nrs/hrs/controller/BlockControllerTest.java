package ca.bc.gov.nrs.hrs.controller;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.configuration.FeatureFlagsConfiguration;
import ca.bc.gov.nrs.hrs.dto.base.FeatureFlag;
import ca.bc.gov.nrs.hrs.dto.block.BlockCalculationDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockListItemDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockResponseDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockType;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.exception.DuplicateBlockException;
import ca.bc.gov.nrs.hrs.exception.ForbiddenException;
import ca.bc.gov.nrs.hrs.exception.GlobalExceptionHandler;
import ca.bc.gov.nrs.hrs.exception.NotFoundGenericException;
import ca.bc.gov.nrs.hrs.exception.ReportingUnitNotFoundException;
import ca.bc.gov.nrs.hrs.exception.ReportingUnitStateConflictException;
import ca.bc.gov.nrs.hrs.exception.ValidationProblemDetailsExceptionHandler;
import ca.bc.gov.nrs.hrs.mapper.block.BlockMapper;
import ca.bc.gov.nrs.hrs.service.ReportingUnitBlockService;
import ca.bc.gov.nrs.hrs.service.block.BlockCalculationService;
import ca.bc.gov.nrs.hrs.service.block.BlockService;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.SerializationFeature;
import tools.jackson.databind.json.JsonMapper;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Block Controller")
class BlockControllerTest {

  private static final Long RU_ID = 10L;
  private static final Long BLOCK_ID = 100L;

  private MockMvc mockMvc;

  @Mock
  private BlockService blockService;

  @Mock
  private ReportingUnitBlockService reportingUnitBlockService;

  @Mock
  private BlockCalculationService blockCalculationService;

  @Mock
  private FeatureFlagsConfiguration featureFlagsConfiguration;

  @Mock
  private BlockMapper blockMapper;

  @InjectMocks
  private BlockController blockController;

  @BeforeEach
  void setUp() {
    JsonMapper objectMapper =
        JsonMapper.builder()
            .findAndAddModules()
            .configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false)
            .build();

    this.mockMvc =
        MockMvcBuilders.standaloneSetup(blockController)
            .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
            .setControllerAdvice(
                new ValidationProblemDetailsExceptionHandler(), new GlobalExceptionHandler())
            .setMessageConverters(new JacksonJsonHttpMessageConverter(objectMapper))
            .build();
  }

  @Test
  @DisplayName("POST /blocks creates a block and returns 201 with Location, ETag headers and details")
  void create_returnsCreatedWithLocationAndDetails() throws Exception {
    BlockEntity entity = new BlockEntity();
    entity.setId(BLOCK_ID);
    entity.setReportingUnitId(RU_ID);
    entity.setBlockType("DISTRICT_AVERAGE");
    entity.setDraft(true);
    entity.setRevision(1L);

    BlockResponseDto responseDto =
        new BlockResponseDto(
            BLOCK_ID,
            RU_ID,
            "DISTRICT_AVERAGE",
            "DRAFT",
            true,
            null,
            1L,
            1L,
            false,
            Instant.parse("2026-08-24T12:00:00Z"),
            Instant.parse("2026-08-24T12:00:00Z"));

    when(blockService.create(nullable(Jwt.class), eq(RU_ID), eq(BlockType.DISTRICT_AVERAGE), isNull()))
        .thenReturn(entity);
    when(blockMapper.toResponseDto(entity)).thenReturn(responseDto);

    mockMvc
        .perform(
            post("/api/reporting-units/{reportingUnitId}/blocks", RU_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"blockType\":\"DISTRICT_AVERAGE\"}"))
        .andExpect(status().isCreated())
        .andExpect(
            header()
                .string(
                    "Location",
                    String.format("/api/reporting-units/%d/blocks/%d", RU_ID, BLOCK_ID)))
        .andExpect(header().string("ETag", "\"1\""))
        .andExpect(jsonPath("$.id").value(BLOCK_ID))
        .andExpect(jsonPath("$.reportingUnitId").value(RU_ID))
        .andExpect(jsonPath("$.blockType").value("DISTRICT_AVERAGE"))
        .andExpect(jsonPath("$.state").value("DRAFT"))
        .andExpect(jsonPath("$.draft").value(true))
        .andExpect(jsonPath("$.version").value(1));

    verify(blockService).create(nullable(Jwt.class), eq(RU_ID), eq(BlockType.DISTRICT_AVERAGE), isNull());
  }

  @Test
  @DisplayName("POST /blocks returns 400 when blockType is null")
  void create_whenBlockTypeNull_returns400() throws Exception {
    mockMvc
        .perform(
            post("/api/reporting-units/{reportingUnitId}/blocks", RU_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("POST /blocks returns 400 when blockType is invalid enum value")
  void create_whenBlockTypeInvalid_returns400() throws Exception {
    mockMvc
        .perform(
            post("/api/reporting-units/{reportingUnitId}/blocks", RU_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"blockType\":\"INVALID\"}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("POST /blocks returns 409 Conflict when duplicate DA block exists")
  void create_whenDuplicateDaBlock_returnsConflict() throws Exception {
    when(blockService.create(nullable(Jwt.class), eq(RU_ID), eq(BlockType.DISTRICT_AVERAGE), isNull()))
        .thenThrow(new DuplicateBlockException());

    mockMvc
        .perform(
            post("/api/reporting-units/{reportingUnitId}/blocks", RU_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"blockType\":\"DISTRICT_AVERAGE\"}"))
        .andExpect(status().isConflict());
  }

  @Test
  @DisplayName("POST /blocks returns 404 Not Found when reporting unit is missing")
  void create_whenReportingUnitNotFound_returnsNotFound() throws Exception {
    when(blockService.create(nullable(Jwt.class), eq(RU_ID), eq(BlockType.DISTRICT_AVERAGE), isNull()))
        .thenThrow(new ReportingUnitNotFoundException(RU_ID));

    mockMvc
        .perform(
            post("/api/reporting-units/{reportingUnitId}/blocks", RU_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"blockType\":\"DISTRICT_AVERAGE\"}"))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("POST /blocks returns 403 Forbidden when caller lacks submitter permissions")
  void create_whenForbidden_returns403() throws Exception {
    when(blockService.create(nullable(Jwt.class), eq(RU_ID), eq(BlockType.DISTRICT_AVERAGE), isNull()))
        .thenThrow(new ForbiddenException("User lacks submitter role for client 00012797"));

    mockMvc
        .perform(
            post("/api/reporting-units/{reportingUnitId}/blocks", RU_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"blockType\":\"DISTRICT_AVERAGE\"}"))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("POST /blocks returns 409 Conflict when expected reporting unit state does not match")
  void create_whenReportingUnitStateConflict_returnsConflict() throws Exception {
    when(blockService.create(
            nullable(Jwt.class), eq(RU_ID), eq(BlockType.DISTRICT_AVERAGE), eq("APPROVED")))
        .thenThrow(new ReportingUnitStateConflictException("APPROVED", "SUBMISSION"));

    mockMvc
        .perform(
            post("/api/reporting-units/{reportingUnitId}/blocks", RU_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"blockType\":\"DISTRICT_AVERAGE\",\"expectedReportingUnitState\":\"APPROVED\"}"))
        .andExpect(status().isConflict())
        .andExpect(
            jsonPath("$.detail")
                .value("Reporting unit state conflict: expected 'APPROVED' but was 'SUBMISSION'"));
  }

  @Test
  @DisplayName("GET /blocks returns 200 OK with page of blocks")
  void list_returnsOkWithBlockList() throws Exception {
    BlockListItemDto itemDto =
        new BlockListItemDto(
            BLOCK_ID,
            "LIC1",
            "CP1",
            "CB1",
            "TM1",
            null,
            null,
            "Sub",
            new BlockListItemDto.Status("DFT", "Draft"),
            null,
            "DISTRICT_AVERAGE");

    PageRequest pageRequest = PageRequest.of(0, 10);
    when(reportingUnitBlockService.getBlockList(eq(RU_ID), nullable(Jwt.class)))
        .thenReturn(new PageImpl<>(List.of(itemDto), pageRequest, 1));

    mockMvc
        .perform(
            get("/api/reporting-units/{reportingUnitId}/blocks", RU_ID)
                .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].id").value(BLOCK_ID))
        .andExpect(jsonPath("$.content[0].blockType").value("DISTRICT_AVERAGE"));
  }

  @Test
  @DisplayName("GET /blocks returns 404 when reporting unit is not found")
  void list_whenReportingUnitNotFound_returnsNotFound() throws Exception {
    when(reportingUnitBlockService.getBlockList(eq(RU_ID), nullable(Jwt.class)))
        .thenThrow(new NotFoundGenericException("reporting-unit", String.valueOf(RU_ID)));

    mockMvc
        .perform(get("/api/reporting-units/{reportingUnitId}/blocks", RU_ID))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("GET /{blockId} returns 200 OK with block details when flag is enabled")
  void getOwned_returnsOkWithBlockDetails() throws Exception {
    when(featureFlagsConfiguration.isEnabled(FeatureFlag.REPORTING_UNIT_BLOCK_DETAILS_ENABLED))
        .thenReturn(true);

    BlockResponseDto responseDto =
        new BlockResponseDto(
            BLOCK_ID,
            RU_ID,
            "DISTRICT_AVERAGE",
            "ACTIVE",
            false,
            LocalDate.of(2026, 3, 15),
            2L,
            2L,
            false,
            Instant.parse("2026-08-24T12:00:00Z"),
            Instant.parse("2026-08-24T12:00:00Z"));

    when(blockService.getBlockDetails(eq(RU_ID), eq(BLOCK_ID), nullable(Jwt.class)))
        .thenReturn(responseDto);

    mockMvc
        .perform(get("/api/reporting-units/{reportingUnitId}/{blockId}", RU_ID, BLOCK_ID))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(BLOCK_ID))
        .andExpect(jsonPath("$.reportingUnitId").value(RU_ID))
        .andExpect(jsonPath("$.blockType").value("DISTRICT_AVERAGE"))
        .andExpect(jsonPath("$.state").value("ACTIVE"))
        .andExpect(jsonPath("$.draft").value(false))
        .andExpect(jsonPath("$.plcDate").value("2026-03-15"))
        .andExpect(jsonPath("$.version").value(2))
        .andExpect(jsonPath("$.revision").value(2))
        .andExpect(jsonPath("$.isLegacy").value(false))
        .andExpect(jsonPath("$.createdAt").value("2026-08-24T12:00:00Z"))
        .andExpect(jsonPath("$.updatedAt").value("2026-08-24T12:00:00Z"));
  }

  @Test
  @DisplayName("GET /blocks/{blockId} returns 200 OK via nested blocks path alias")
  void getOwned_nestedPath_returnsOkWithBlockDetails() throws Exception {
    when(featureFlagsConfiguration.isEnabled(FeatureFlag.REPORTING_UNIT_BLOCK_DETAILS_ENABLED))
        .thenReturn(true);

    BlockResponseDto responseDto =
        new BlockResponseDto(
            BLOCK_ID,
            RU_ID,
            "DISTRICT_AVERAGE",
            "ACTIVE",
            false,
            LocalDate.of(2026, 3, 15),
            2L,
            2L,
            false,
            Instant.parse("2026-08-24T12:00:00Z"),
            Instant.parse("2026-08-24T12:00:00Z"));

    when(blockService.getBlockDetails(eq(RU_ID), eq(BLOCK_ID), nullable(Jwt.class)))
        .thenReturn(responseDto);

    mockMvc
        .perform(get("/api/reporting-units/{reportingUnitId}/blocks/{blockId}", RU_ID, BLOCK_ID))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(BLOCK_ID))
        .andExpect(jsonPath("$.reportingUnitId").value(RU_ID));
  }

  @Test
  @DisplayName("GET /{blockId} returns 404 when block is not found")
  void getOwned_whenBlockNotFound_returnsNotFound() throws Exception {
    when(featureFlagsConfiguration.isEnabled(FeatureFlag.REPORTING_UNIT_BLOCK_DETAILS_ENABLED))
        .thenReturn(true);

    when(blockService.getBlockDetails(eq(RU_ID), eq(BLOCK_ID), nullable(Jwt.class)))
        .thenThrow(new NotFoundGenericException("Block", String.valueOf(BLOCK_ID)));

    mockMvc
        .perform(get("/api/reporting-units/{reportingUnitId}/{blockId}", RU_ID, BLOCK_ID))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("GET /{blockId} returns 404 when flag is disabled")
  void getOwned_whenFlagDisabled_returnsNotFound() throws Exception {
    when(featureFlagsConfiguration.isEnabled(FeatureFlag.REPORTING_UNIT_BLOCK_DETAILS_ENABLED))
        .thenReturn(false);

    mockMvc
        .perform(get("/api/reporting-units/{reportingUnitId}/{blockId}", RU_ID, BLOCK_ID))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("GET /blocks/{blockId}/calculation returns 200 OK with calculation snapshot")
  void getLatest_returnsOkWithCalculationSnapshot() throws Exception {
    BlockCalculationDto dto =
        new BlockCalculationDto(
            BLOCK_ID,
            1L,
            Instant.parse("2026-08-24T12:00:00Z"),
            "NEAREST_TENTH",
            null,
            List.of());

    when(blockCalculationService.findLatest(eq(RU_ID), eq(BLOCK_ID), nullable(Jwt.class)))
        .thenReturn(Optional.of(dto));

    mockMvc
        .perform(
            get(
                "/api/reporting-units/{reportingUnitId}/blocks/{blockId}/calculation",
                RU_ID,
                BLOCK_ID))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.blockId").value(BLOCK_ID))
        .andExpect(jsonPath("$.districtVolumeId").value(1))
        .andExpect(jsonPath("$.roundingPolicy").value("NEAREST_TENTH"));
  }

  @Test
  @DisplayName("GET /{blockId}/calculation returns 200 OK via alternate path")
  void getLatest_alternatePath_returnsOkWithCalculationSnapshot() throws Exception {
    BlockCalculationDto dto =
        new BlockCalculationDto(
            BLOCK_ID,
            1L,
            Instant.parse("2026-08-24T12:00:00Z"),
            "NEAREST_TENTH",
            null,
            List.of());

    when(blockCalculationService.findLatest(eq(RU_ID), eq(BLOCK_ID), nullable(Jwt.class)))
        .thenReturn(Optional.of(dto));

    mockMvc
        .perform(get("/api/reporting-units/{reportingUnitId}/{blockId}/calculation", RU_ID, BLOCK_ID))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.blockId").value(BLOCK_ID))
        .andExpect(jsonPath("$.districtVolumeId").value(1))
        .andExpect(jsonPath("$.roundingPolicy").value("NEAREST_TENTH"));
  }

  @Test
  @DisplayName("GET /blocks/{blockId}/calculation returns 404 when no snapshot exists")
  void getLatest_whenNotFound_returnsNotFound() throws Exception {
    when(blockCalculationService.findLatest(eq(RU_ID), eq(BLOCK_ID), nullable(Jwt.class)))
        .thenReturn(Optional.empty());

    mockMvc
        .perform(
            get(
                "/api/reporting-units/{reportingUnitId}/blocks/{blockId}/calculation",
                RU_ID,
                BLOCK_ID))
        .andExpect(status().isNotFound());
  }
}
