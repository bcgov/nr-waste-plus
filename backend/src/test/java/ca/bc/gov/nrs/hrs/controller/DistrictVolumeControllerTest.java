package ca.bc.gov.nrs.hrs.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post; // Added missing import
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header; // Added missing import
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeCreateDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeDetailDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeListItemDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.InteriorDataDto;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import ca.bc.gov.nrs.hrs.service.DistrictVolumeService;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Month;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
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
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.SerializationFeature;
import tools.jackson.databind.json.JsonMapper;

@ExtendWith(MockitoExtension.class)
class DistrictVolumeControllerTest {

  private MockMvc mockMvc;
  private JsonMapper objectMapper;
  
  private static final Instant FIXED_DATE =
      Instant.parse("2024-01-01T00:00:00Z");

  @Mock
  private DistrictVolumeService districtVolumeService;

  @InjectMocks
  private DistrictVolumeController districtVolumeController;

  private static final OffsetDateTime MOCK_UPLOAD_TIME =
      OffsetDateTime.of(
          2026,
          Month.JUNE.getValue(),
          11,
          14,
          0,
          0,
          0,
          ZoneOffset.UTC);

  @BeforeEach
  void setUp() {
    JsonMapper mapper =
        JsonMapper.builder()
            .findAndAddModules()
            .configure(
                SerializationFeature.FAIL_ON_EMPTY_BEANS,
                false)
            .build();

    this.objectMapper = mapper;

    this.mockMvc =
        MockMvcBuilders.standaloneSetup(districtVolumeController)
            .setCustomArgumentResolvers(
                new PageableHandlerMethodArgumentResolver())
            .setMessageConverters(
                new JacksonJsonHttpMessageConverter(mapper))
            .build();
  }

  @Test
  @DisplayName(
      "GET / — Should return 200 OK with paginated list items "
          + "when no filter parameter is provided")
  void getDistrictVolumes_returnsPaginatedData() throws Exception {

    DistrictVolumeListItemDto listItem =
        new DistrictVolumeListItemDto(
            1L,
            "INTERIOR",
            LocalDate.of(2026, Month.JANUARY, 1),
            null,
            "TEST_USER",
            MOCK_UPLOAD_TIME.toInstant());

    PageRequest pageRequest = PageRequest.of(0, 10);

    PageImpl<DistrictVolumeListItemDto> page =
        new PageImpl<>(List.of(listItem), pageRequest, 1);

    when(districtVolumeService.getDistrictVolumes(
            eq(Optional.empty()),
            any(Pageable.class)))
        .thenReturn(page);

    mockMvc.perform(
            get("/api/configuration/district-average-volumes")
                .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].id").value(1L))
        .andExpect(jsonPath("$.content[0].area").value("INTERIOR"))
        .andExpect(
            jsonPath("$.content[0].uploadedBy")
                .value("TEST_USER"));
  }

  @Test
  @DisplayName(
      "GET / — Should return 200 OK with filtered list items "
          + "when a valid area parameter is provided")
  void getDistrictVolumes_returnsFilteredData_whenAreaIsValid()
      throws Exception {

    DistrictVolumeListItemDto listItem =
        new DistrictVolumeListItemDto(
            1L,
            "INTERIOR",
            LocalDate.of(2026, Month.JANUARY, 1),
            null,
            "TEST_USER",
            MOCK_UPLOAD_TIME.toInstant());

    PageRequest pageRequest = PageRequest.of(0, 10);

    PageImpl<DistrictVolumeListItemDto> page =
        new PageImpl<>(List.of(listItem), pageRequest, 1);

    when(districtVolumeService.getDistrictVolumes(
            eq(Optional.of("INTERIOR")),
            any(Pageable.class)))
        .thenReturn(page);

    mockMvc.perform(
            get("/api/configuration/district-average-volumes")
                .param("area", "INTERIOR")
                .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.content[0].area")
                .value("INTERIOR"));
  }

  @Test
  @DisplayName(
      "GET / — Should return 400 Bad Request when area parameter is invalid")
  void getDistrictVolumes_returns400_whenAreaIsInvalid()
      throws Exception {

    mockMvc.perform(
            get("/api/configuration/district-average-volumes")
                .param("area", "INVALID_AREA")
                .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName(
      "GET / — Should return 401 Unauthorized when request lacks authentication")
  void getDistrictVolumes_returns401_whenUnauthorized()
      throws Exception {

    when(districtVolumeService.getDistrictVolumes(any(), any()))
        .thenThrow(
            new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Unauthorized Access"));

    mockMvc.perform(
            get("/api/configuration/district-average-volumes")
                .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName(
      "GET /{id} — Should return 200 OK when configuration exists")
  void getDistrictVolumeById_returnsDetails() throws Exception {

    InteriorDataDto interiorData =
        new InteriorDataDto(
            Collections.emptyList(),
            Collections.emptyMap());

    DistrictVolumeDetailDto detailDto =
        new DistrictVolumeDetailDto(
            1L,
            "INTERIOR",
            LocalDate.of(2026, Month.JANUARY, 1),
            null,
            "TEST_USER",
            MOCK_UPLOAD_TIME.toInstant(),
            new BigDecimal("1.150"),
            null,
            interiorData);

    when(districtVolumeService.getDistrictVolumeById(1L))
        .thenReturn(detailDto);

    mockMvc.perform(
            get("/api/configuration/district-average-volumes/1")
                .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(1L))
        .andExpect(jsonPath("$.area").value("INTERIOR"))
        .andExpect(
            jsonPath("$.tableLevelFactor")
                .value(1.150))
        .andExpect(
            jsonPath("$.uploadedBy")
                .value("TEST_USER"));
  }

  @Test
  @DisplayName(
      "GET /{id} — Should return 404 Not Found when ID does not exist")
  void getDistrictVolumeById_returns404_whenNotFound()
      throws Exception {

    when(districtVolumeService.getDistrictVolumeById(99L))
        .thenThrow(
            new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "District volume record not found"));

    mockMvc.perform(
            get("/api/configuration/district-average-volumes/99")
                .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName(
      "POST / — Should return 201 Created with Location header "
          + "when payload is valid")
  @WithMockJwt(
      value = "jakethedog"
  )
  void createDistrictVolume_returns201AndLocationHeader()
      throws Exception {

    InteriorDataDto interiorData =
        new InteriorDataDto(
            Collections.emptyList(),
            Collections.emptyMap());

    DistrictVolumeCreateDto createDto =
        new DistrictVolumeCreateDto(
            "INTERIOR",
            LocalDate.of(9999, Month.JANUARY, 1),
            new BigDecimal("1.250"),
            null,
            interiorData);

    DistrictVolumeDetailDto savedDetailDto =
        new DistrictVolumeDetailDto(
            42L,
            "INTERIOR",
            LocalDate.of(9999, Month.JANUARY, 1),
            null,
            "TEST_USER",
            FIXED_DATE,
            new BigDecimal("1.250"),
            null,
            interiorData);

    when(districtVolumeService.createDistrictVolume(
            eq("jakethedog"),
            any(DistrictVolumeCreateDto.class)))
        .thenReturn(savedDetailDto);

    mockMvc.perform(
            post("/api/configuration/district-average-volumes")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createDto)))
        .andExpect(status().isCreated())
        .andExpect(
            header().string(
                "Location",
                "/api/configuration/district-average-volumes/42"));
  }

  @Test
  @DisplayName(
      "POST / — Should return 400 Bad Request when validation constraints are violated")
  void createDistrictVolume_returns400_whenRequiredFieldsAreNull()
      throws Exception {

    DistrictVolumeCreateDto invalidDto =
        new DistrictVolumeCreateDto(
            null,
            null,
            null,
            null,
            null);

    mockMvc.perform(
            post("/api/configuration/district-average-volumes")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidDto)))
        .andExpect(status().isBadRequest());
  }
}
