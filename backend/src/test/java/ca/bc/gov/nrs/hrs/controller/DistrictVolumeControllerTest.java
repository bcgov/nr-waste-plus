package ca.bc.gov.nrs.hrs.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeDetailDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.InteriorDataDto;
import ca.bc.gov.nrs.hrs.service.DistrictVolumeService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class DistrictVolumeControllerTest {

  private MockMvc mockMvc;

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
    this.mockMvc =
        MockMvcBuilders.standaloneSetup(districtVolumeController)
            .setCustomArgumentResolvers(
                new PageableHandlerMethodArgumentResolver())
            .build();
  }

  @Test
  @DisplayName("GET /{id} - Should return 200 OK with detail DTO")
  void getDistrictVolumes_returnsPaginatedData() throws Exception {

    // Arrange
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

    // Act & Assert
    mockMvc.perform(
            get("/api/configuration/district-average-volumes/1")
                .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(1L))
        .andExpect(jsonPath("$.area").value("INTERIOR"))
        .andExpect(jsonPath("$.tableLevelFactor").value(1.150))
        .andExpect(jsonPath("$.uploadedBy").value("TEST_USER"));
  }

  @Test
  @DisplayName("GET /{id} - Should return 200 OK when configuration exists")
  void getDistrictVolumeById_returnsDetails() throws Exception {

    // Arrange
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

    // Act & Assert
    mockMvc.perform(
            get("/api/configuration/district-average-volumes/1")
                .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(1L))
        .andExpect(jsonPath("$.area").value("INTERIOR"))
        .andExpect(jsonPath("$.tableLevelFactor").value(1.150))
        .andExpect(jsonPath("$.uploadedBy").value("TEST_USER"));
  }

  @Test
  @DisplayName(
      "GET /{id} - Should return 404 Not Found when ID does not exist")
  void getDistrictVolumeById_returns404_whenNotFound() throws Exception {

    // Arrange
    when(districtVolumeService.getDistrictVolumeById(99L))
        .thenThrow(
            new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "District volume record not found"));

    // Act & Assert
    mockMvc.perform(
            get("/api/configuration/district-average-volumes/99")
                .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound());
  }
}