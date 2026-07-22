package ca.bc.gov.nrs.hrs.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeCreateDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeDetailDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeListItemDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.InteriorDataDto;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwtSecurityContextFactory;
import ca.bc.gov.nrs.hrs.service.SpeciesCompositionService;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Month;
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
import org.springframework.core.MethodParameter;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.SerializationFeature;
import tools.jackson.databind.json.JsonMapper;

@ExtendWith(MockitoExtension.class)
class SpeciesCompositionControllerTest {

  private MockMvc mockMvc;
  private JsonMapper objectMapper;

  private static final Instant FIXED_DATE =
      Instant.parse("2024-01-01T00:00:00Z");

  @Mock
  private SpeciesCompositionService speciesCompositionService;

  @InjectMocks
  private SpeciesCompositionController speciesCompositionController;

  private static final LocalDateTime MOCK_UPLOAD_TIME =
      LocalDateTime.of(
          2026,
          Month.JUNE,
          11,
          14,
          0,
          0);

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
        MockMvcBuilders.standaloneSetup(speciesCompositionController)
            .setCustomArgumentResolvers(
                new PageableHandlerMethodArgumentResolver(),
                new HandlerMethodArgumentResolver() {
                  @Override
                  public boolean supportsParameter(MethodParameter parameter) {
                    return parameter.hasParameterAnnotation(
                        AuthenticationPrincipal.class);
                  }

                  @Override
                  public Object resolveArgument(
                      MethodParameter parameter,
                      ModelAndViewContainer mavContainer,
                      NativeWebRequest webRequest,
                      WebDataBinderFactory binderFactory) {
                    Authentication auth =
                        SecurityContextHolder.getContext().getAuthentication();
                    if (auth != null) {
                      return auth.getPrincipal();
                    }
                    // Fallback for standalone setup without SecurityContext
                    return WithMockJwtSecurityContextFactory.createJwt(
                        "jakethedog",
                        Collections.emptyList(),
                        "idir",
                        "Jake",
                        "jake@test.ca");
                  }
                })
            .setMessageConverters(
                new JacksonJsonHttpMessageConverter(mapper))
            .build();
  }

  @Test
  @DisplayName(
      "GET / — Should return 200 OK with paginated list items "
          + "when no filter parameter is provided")
  void getSpeciesCompositions_returnsPaginatedData() throws Exception {

    DistrictVolumeListItemDto listItem =
        new DistrictVolumeListItemDto(
            1L,
            "INTERIOR",
            LocalDate.of(2026, Month.JANUARY, 1),
            null,
            "TEST_USER",
            MOCK_UPLOAD_TIME.atOffset(ZoneOffset.UTC).toInstant());

    PageRequest pageRequest = PageRequest.of(0, 10);

    PageImpl<DistrictVolumeListItemDto> page =
        new PageImpl<>(List.of(listItem), pageRequest, 1);

    when(speciesCompositionService.getSpeciesCompositions(
            eq(Optional.empty()),
            any(Pageable.class)))
        .thenReturn(page);

    mockMvc.perform(
            get("/api/configuration/species-compositions")
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
  void getSpeciesCompositions_returnsFilteredData_whenAreaIsValid()
      throws Exception {

    DistrictVolumeListItemDto listItem =
        new DistrictVolumeListItemDto(
            1L,
            "INTERIOR",
            LocalDate.of(2026, Month.JANUARY, 1),
            null,
            "TEST_USER",
            MOCK_UPLOAD_TIME.atOffset(ZoneOffset.UTC).toInstant());

    PageRequest pageRequest = PageRequest.of(0, 10);

    PageImpl<DistrictVolumeListItemDto> page =
        new PageImpl<>(List.of(listItem), pageRequest, 1);

    when(speciesCompositionService.getSpeciesCompositions(
            eq(Optional.of("INTERIOR")),
            any(Pageable.class)))
        .thenReturn(page);

    mockMvc.perform(
            get("/api/configuration/species-compositions")
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
  void getSpeciesCompositions_returns400_whenAreaIsInvalid()
      throws Exception {

    mockMvc.perform(
            get("/api/configuration/species-compositions")
                .param("area", "INVALID_AREA")
                .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName(
      "GET / — Should return 401 Unauthorized when request lacks authentication")
  void getSpeciesCompositions_returns401_whenUnauthorized()
      throws Exception {

    when(speciesCompositionService.getSpeciesCompositions(any(), any()))
        .thenThrow(
            new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Unauthorized Access"));

    mockMvc.perform(
            get("/api/configuration/species-compositions")
                .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName(
      "GET /{id} — Should return 200 OK when configuration exists")
  void getSpeciesCompositionById_returnsDetails() throws Exception {

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
            MOCK_UPLOAD_TIME.atOffset(ZoneOffset.UTC).toInstant(),
            new BigDecimal("1.150"),
            null,
            interiorData);

    when(speciesCompositionService.getSpeciesCompositionById(1L))
        .thenReturn(detailDto);

    mockMvc.perform(
            get("/api/configuration/species-compositions/1")
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
  void getSpeciesCompositionById_returns404_whenNotFound()
      throws Exception {

    when(speciesCompositionService.getSpeciesCompositionById(99L))
        .thenThrow(
            new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Species composition record not found"));

    mockMvc.perform(
            get("/api/configuration/species-compositions/99")
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
  void createSpeciesComposition_returns201AndLocationHeader()
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

    when(speciesCompositionService.createSpeciesComposition(
            eq("IDIR\\jakethedog"),
            any(DistrictVolumeCreateDto.class)))
        .thenReturn(savedDetailDto);

    mockMvc.perform(
            post("/api/configuration/species-compositions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createDto)))
        .andExpect(status().isCreated())
        .andExpect(
            header().string(
                "Location",
                "/api/configuration/species-compositions/42"));
  }

  @Test
  @DisplayName(
      "POST / — Should return 400 Bad Request when validation constraints are violated")
  @WithMockJwt(
      value = "jakethedog"
  )
  void createSpeciesComposition_returns400_whenRequiredFieldsAreNull()
      throws Exception {

    DistrictVolumeCreateDto invalidDto =
        new DistrictVolumeCreateDto(
            null,
            null,
            null,
            null,
            null);

    mockMvc.perform(
            post("/api/configuration/species-compositions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidDto)))
        .andExpect(status().isBadRequest());
  }
}