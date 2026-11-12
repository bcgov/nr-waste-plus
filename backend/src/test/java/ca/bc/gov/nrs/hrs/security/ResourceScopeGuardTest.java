package ca.bc.gov.nrs.hrs.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitLegacyDetailsDto;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.exception.ReportingUnitNotFoundException;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwtSecurityContextFactory;
import ca.bc.gov.nrs.hrs.provider.legacy.LegacyApiProvider;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import io.micrometer.tracing.Span;
import io.micrometer.tracing.TraceContext;
import io.micrometer.tracing.Tracer;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | ResourceScopeGuard Matrix")
class ResourceScopeGuardTest {

  @Mock private ReportingUnitRepository reportingUnitRepository;
  @Mock private LegacyApiProvider legacyApiProvider;
  @Mock private Tracer tracer;
  @Mock private Span currentSpan;
  @Mock private TraceContext traceContext;

  private ResourceScopeGuard guard;

  private static final Long RU_ID = 100L;
  private static final String CLIENT_IN_SCOPE = "00012345";
  private static final String CLIENT_OUT_OF_SCOPE = "00099999";
  private static final String DISTRICT_IN_SCOPE = "DKM";
  private static final String DISTRICT_OUT_OF_SCOPE = "DND";

  @BeforeEach
  void setUp() {
    guard = new ResourceScopeGuard(reportingUnitRepository, legacyApiProvider, tracer);
  }

  private void mockPostgresReportingUnit(String clientNumber, String districtCode) {
    ReportingUnitEntity entity = new ReportingUnitEntity();
    entity.setId(RU_ID);
    entity.setClientNumber(clientNumber);
    entity.setGeographicCode(districtCode);
    entity.setDeleted(false);
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID)).thenReturn(Optional.of(entity));
  }

  private void mockLegacyReportingUnit(String clientNumber, String districtCode) {
    when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID)).thenReturn(Optional.empty());
    ReportingUnitLegacyDetailsDto legacyDto =
        new ReportingUnitLegacyDetailsDto(
            clientNumber,
            "00",
            null,
            districtCode != null ? new CodeDescriptionDto(districtCode, districtCode + " Name") : null);
    when(legacyApiProvider.getReportingUnitDetails(RU_ID)).thenReturn(legacyDto);
  }

  // ── IDIR ADMIN ─────────────────────────────────────────────────────────────

  @Nested
  @DisplayName("IDIR ADMIN")
  class IdirAdmin {

    @Test
    @DisplayName("in-scope: matches district -> 200 OK")
    void inScope_returns200() {
      Jwt jwt =
          WithMockJwtSecurityContextFactory.createJwt(
              "admin_user", List.of("WASTE_PLUS_ADMIN"), "idir", "Admin, User", "admin@idir.ca");

      assertThatCode(() -> guard.verify(jwt, RU_ID, "GET")).doesNotThrowAnyException();
      assertThatCode(() -> guard.verify(jwt, RU_ID, "POST")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("out-of-scope: other district -> 200 OK (unrestricted)")
    void outOfScope_returns200() {
      Jwt jwt =
          WithMockJwtSecurityContextFactory.createJwt(
              "admin_user", List.of("WASTE_PLUS_ADMIN"), "idir", "Admin, User", "admin@idir.ca");

      assertThatCode(() -> guard.verify(jwt, RU_ID, "GET")).doesNotThrowAnyException();
      assertThatCode(() -> guard.verify(jwt, RU_ID, "POST")).doesNotThrowAnyException();
    }
  }

  // ── IDIR AREA ──────────────────────────────────────────────────────────────

  @Nested
  @DisplayName("IDIR AREA")
  class IdirArea {

    @Test
    @DisplayName("in-scope -> 200 OK")
    void inScope_returns200() {
      Jwt jwt =
          WithMockJwtSecurityContextFactory.createJwt(
              "area_user", List.of("WASTE_PLUS_AREA"), "idir", "Area, User", "area@idir.ca");

      assertThatCode(() -> guard.verify(jwt, RU_ID, "GET")).doesNotThrowAnyException();
      assertThatCode(() -> guard.verify(jwt, RU_ID, "POST")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("out-of-scope -> 200 OK (unrestricted)")
    void outOfScope_returns200() {
      Jwt jwt =
          WithMockJwtSecurityContextFactory.createJwt(
              "area_user", List.of("WASTE_PLUS_AREA"), "idir", "Area, User", "area@idir.ca");

      assertThatCode(() -> guard.verify(jwt, RU_ID, "GET")).doesNotThrowAnyException();
      assertThatCode(() -> guard.verify(jwt, RU_ID, "POST")).doesNotThrowAnyException();
    }
  }

  // ── IDIR DISTRICT ──────────────────────────────────────────────────────────

  @Nested
  @DisplayName("IDIR DISTRICT")
  class IdirDistrict {

    @Test
    @DisplayName("in-scope: matches assigned district -> 200 OK")
    void inScope_returns200() {
      mockPostgresReportingUnit(CLIENT_IN_SCOPE, DISTRICT_IN_SCOPE);
      Jwt jwt =
          WithMockJwtSecurityContextFactory.createJwt(
              "district_user",
              List.of("WASTE_PLUS_DISTRICT_" + DISTRICT_IN_SCOPE),
              "idir",
              "District, User",
              "district@idir.ca");

      assertThatCode(() -> guard.verify(jwt, RU_ID, "GET")).doesNotThrowAnyException();
      assertThatCode(() -> guard.verify(jwt, RU_ID, "POST")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("out-of-scope: other district -> 404 Not Found")
    void outOfScope_returns404() {
      mockPostgresReportingUnit(CLIENT_IN_SCOPE, DISTRICT_OUT_OF_SCOPE);
      Jwt jwt =
          WithMockJwtSecurityContextFactory.createJwt(
              "district_user",
              List.of("WASTE_PLUS_DISTRICT_" + DISTRICT_IN_SCOPE),
              "idir",
              "District, User",
              "district@idir.ca");

      assertThatThrownBy(() -> guard.verify(jwt, RU_ID, "GET"))
          .isInstanceOf(ReportingUnitNotFoundException.class);
      assertThatThrownBy(() -> guard.verify(jwt, RU_ID, "POST"))
          .isInstanceOf(ReportingUnitNotFoundException.class);
    }
  }

  // ── BCeID SUBMITTER ────────────────────────────────────────────────────────

  @Nested
  @DisplayName("BCeID SUBMITTER")
  class BceidSubmitter {

    @Test
    @DisplayName("in-scope: client matches -> 200 OK")
    void inScope_returns200() {
      mockPostgresReportingUnit(CLIENT_IN_SCOPE, DISTRICT_IN_SCOPE);
      Jwt jwt =
          WithMockJwtSecurityContextFactory.createJwt(
              "sub_user",
              List.of("WASTE_PLUS_SUBMITTER_" + CLIENT_IN_SCOPE),
              "bceidbusiness",
              "Submitter, User",
              "sub@bceid.ca");

      assertThatCode(() -> guard.verify(jwt, RU_ID, "GET")).doesNotThrowAnyException();
      assertThatCode(() -> guard.verify(jwt, RU_ID, "POST")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("out-of-scope: other client -> 404 Not Found")
    void outOfScope_returns404() {
      mockPostgresReportingUnit(CLIENT_OUT_OF_SCOPE, DISTRICT_IN_SCOPE);
      Jwt jwt =
          WithMockJwtSecurityContextFactory.createJwt(
              "sub_user",
              List.of("WASTE_PLUS_SUBMITTER_" + CLIENT_IN_SCOPE),
              "bceidbusiness",
              "Submitter, User",
              "sub@bceid.ca");

      assertThatThrownBy(() -> guard.verify(jwt, RU_ID, "GET"))
          .isInstanceOf(ReportingUnitNotFoundException.class);
      assertThatThrownBy(() -> guard.verify(jwt, RU_ID, "POST"))
          .isInstanceOf(ReportingUnitNotFoundException.class);
    }
  }

  // ── BCeID VIEWER ───────────────────────────────────────────────────────────

  @Nested
  @DisplayName("BCeID VIEWER")
  class BceidViewer {

    @Test
    @DisplayName("in-scope read (GET) -> 200 OK")
    void inScope_read_returns200() {
      mockPostgresReportingUnit(CLIENT_IN_SCOPE, DISTRICT_IN_SCOPE);
      Jwt jwt =
          WithMockJwtSecurityContextFactory.createJwt(
              "viewer_user",
              List.of("WASTE_PLUS_VIEWER_" + CLIENT_IN_SCOPE),
              "bceidbusiness",
              "Viewer, User",
              "viewer@bceid.ca");

      assertThatCode(() -> guard.verify(jwt, RU_ID, "GET")).doesNotThrowAnyException();
    }

    @ParameterizedTest
    @ValueSource(strings = {"POST", "PUT", "PATCH", "DELETE"})
    @DisplayName("in-scope write -> 403 Forbidden")
    void inScope_write_returns403(String method) {
      mockPostgresReportingUnit(CLIENT_IN_SCOPE, DISTRICT_IN_SCOPE);
      Jwt jwt =
          WithMockJwtSecurityContextFactory.createJwt(
              "viewer_user",
              List.of("WASTE_PLUS_VIEWER_" + CLIENT_IN_SCOPE),
              "bceidbusiness",
              "Viewer, User",
              "viewer@bceid.ca");

      assertThatThrownBy(() -> guard.verify(jwt, RU_ID, method))
          .isInstanceOf(ResponseStatusException.class)
          .satisfies(
              ex ->
                  assertThat(((ResponseStatusException) ex).getStatusCode())
                      .isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    @DisplayName("out-of-scope read (GET) -> 404 Not Found")
    void outOfScope_read_returns404() {
      mockPostgresReportingUnit(CLIENT_OUT_OF_SCOPE, DISTRICT_IN_SCOPE);
      Jwt jwt =
          WithMockJwtSecurityContextFactory.createJwt(
              "viewer_user",
              List.of("WASTE_PLUS_VIEWER_" + CLIENT_IN_SCOPE),
              "bceidbusiness",
              "Viewer, User",
              "viewer@bceid.ca");

      assertThatThrownBy(() -> guard.verify(jwt, RU_ID, "GET"))
          .isInstanceOf(ReportingUnitNotFoundException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"POST", "PUT", "PATCH", "DELETE"})
    @DisplayName("out-of-scope write -> 404 Not Found (no existence disclosure)")
    void outOfScope_write_returns404(String method) {
      mockPostgresReportingUnit(CLIENT_OUT_OF_SCOPE, DISTRICT_IN_SCOPE);
      Jwt jwt =
          WithMockJwtSecurityContextFactory.createJwt(
              "viewer_user",
              List.of("WASTE_PLUS_VIEWER_" + CLIENT_IN_SCOPE),
              "bceidbusiness",
              "Viewer, User",
              "viewer@bceid.ca");

      // Crucial test: out-of-scope write MUST return 404 Not Found, never 403 Forbidden!
      assertThatThrownBy(() -> guard.verify(jwt, RU_ID, method))
          .isInstanceOf(ReportingUnitNotFoundException.class);
    }
  }

  // ── IDIR VIEWER ────────────────────────────────────────────────────────────

  @Nested
  @DisplayName("IDIR VIEWER")
  class IdirViewer {

    @Test
    @DisplayName("in-scope read (GET) -> 200 OK")
    void inScope_read_returns200() {
      mockPostgresReportingUnit(CLIENT_IN_SCOPE, DISTRICT_IN_SCOPE);
      Jwt jwt =
          WithMockJwtSecurityContextFactory.createJwt(
              "idir_viewer",
              List.of("WASTE_PLUS_VIEWER_" + DISTRICT_IN_SCOPE),
              "idir",
              "Viewer, Idir",
              "viewer@idir.ca");

      assertThatCode(() -> guard.verify(jwt, RU_ID, "GET")).doesNotThrowAnyException();
    }

    @ParameterizedTest
    @ValueSource(strings = {"POST", "PUT", "PATCH", "DELETE"})
    @DisplayName("in-scope write -> 403 Forbidden")
    void inScope_write_returns403(String method) {
      mockPostgresReportingUnit(CLIENT_IN_SCOPE, DISTRICT_IN_SCOPE);
      Jwt jwt =
          WithMockJwtSecurityContextFactory.createJwt(
              "idir_viewer",
              List.of("WASTE_PLUS_VIEWER_" + DISTRICT_IN_SCOPE),
              "idir",
              "Viewer, Idir",
              "viewer@idir.ca");

      assertThatThrownBy(() -> guard.verify(jwt, RU_ID, method))
          .isInstanceOf(ResponseStatusException.class)
          .satisfies(
              ex ->
                  assertThat(((ResponseStatusException) ex).getStatusCode())
                      .isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    @DisplayName("out-of-scope read (GET) -> 404 Not Found")
    void outOfScope_read_returns404() {
      mockPostgresReportingUnit(CLIENT_IN_SCOPE, DISTRICT_OUT_OF_SCOPE);
      Jwt jwt =
          WithMockJwtSecurityContextFactory.createJwt(
              "idir_viewer",
              List.of("WASTE_PLUS_VIEWER_" + DISTRICT_IN_SCOPE),
              "idir",
              "Viewer, Idir",
              "viewer@idir.ca");

      assertThatThrownBy(() -> guard.verify(jwt, RU_ID, "GET"))
          .isInstanceOf(ReportingUnitNotFoundException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"POST", "PUT", "PATCH", "DELETE"})
    @DisplayName("out-of-scope write -> 404 Not Found (no existence disclosure)")
    void outOfScope_write_returns404(String method) {
      mockPostgresReportingUnit(CLIENT_IN_SCOPE, DISTRICT_OUT_OF_SCOPE);
      Jwt jwt =
          WithMockJwtSecurityContextFactory.createJwt(
              "idir_viewer",
              List.of("WASTE_PLUS_VIEWER_" + DISTRICT_IN_SCOPE),
              "idir",
              "Viewer, Idir",
              "viewer@idir.ca");

      // Crucial test: out-of-scope write MUST return 404 Not Found, never 403 Forbidden!
      assertThatThrownBy(() -> guard.verify(jwt, RU_ID, method))
          .isInstanceOf(ReportingUnitNotFoundException.class);
    }
  }

  // ── Legacy Fallback & District Claim Parsing ────────────────────────────────

  @Nested
  @DisplayName("Legacy fallback and district claims")
  class LegacyAndDistrictClaims {

    @Test
    @DisplayName("should fallback to legacy provider when Postgres entity not found")
    void fallsBackToLegacyProvider() {
      mockLegacyReportingUnit(CLIENT_IN_SCOPE, DISTRICT_IN_SCOPE);
      Jwt jwt =
          WithMockJwtSecurityContextFactory.createJwt(
              "sub_user",
              List.of("WASTE_PLUS_SUBMITTER_" + CLIENT_IN_SCOPE),
              "bceidbusiness",
              "Submitter, User",
              "sub@bceid.ca");

      assertThatCode(() -> guard.verify(jwt, RU_ID, "GET")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("should extract district from custom claims")
    void extractsDistrictFromCustomClaims() {
      mockPostgresReportingUnit(CLIENT_IN_SCOPE, "DCC");
      Jwt baseJwt =
          WithMockJwtSecurityContextFactory.createJwt(
              "district_user",
              List.of("WASTE_PLUS_DISTRICT"),
              "idir",
              "District, User",
              "district@idir.ca");
      // Add custom claim
      Jwt customClaimJwt =
          Jwt.withTokenValue(baseJwt.getTokenValue())
              .headers(h -> h.putAll(baseJwt.getHeaders()))
              .claims(c -> {
                c.putAll(baseJwt.getClaims());
                c.put("custom:idp_district", "DCC");
              })
              .build();

      Set<String> districts = guard.extractAssignedDistricts(customClaimJwt);
      assertThat(districts).contains("DCC");

      assertThatCode(() -> guard.verify(customClaimJwt, RU_ID, "GET")).doesNotThrowAnyException();
    }
  }
}
