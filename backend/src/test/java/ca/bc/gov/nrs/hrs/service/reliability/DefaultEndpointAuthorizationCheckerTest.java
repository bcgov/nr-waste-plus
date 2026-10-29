package ca.bc.gov.nrs.hrs.service.reliability;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.exception.ForbiddenException;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwtSecurityContextFactory;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
@DisplayName("Default endpoint authorization checker")
class DefaultEndpointAuthorizationCheckerTest {

  @Mock
  private ReportingUnitRepository reportingUnitRepository;

  private DefaultEndpointAuthorizationChecker checker;

  @BeforeEach
  void setUp() {
    checker = new DefaultEndpointAuthorizationChecker(reportingUnitRepository);
  }

  @Test
  @DisplayName("allows replay when BCeID user has matching client role for reporting unit")
  void shouldAllowReplayWhenBceidUserHasMatchingRole() {
    ReportingUnitEntity ru = new ReportingUnitEntity();
    ru.setId(100L);
    ru.setClientNumber("00012797");
    when(reportingUnitRepository.findByIdAndDeletedFalse(100L)).thenReturn(Optional.of(ru));

    Jwt jwt = WithMockJwtSecurityContextFactory.createJwt(
        "bceid-user",
        List.of("WASTE_PLUS_SUBMITTER_00012797"),
        "bceidbusiness",
        "BCeID User",
        "bceid@example.com");
    Authentication auth = new UsernamePasswordAuthenticationToken(jwt, "n/a", List.of());

    MockHttpServletRequest request =
        new MockHttpServletRequest(
            "POST", "/api/reporting-units/100/blocks/1/attachments/2/finalize");

    assertThatCode(() -> checker.checkAuthorization(request, auth)).doesNotThrowAnyException();
  }

  @Test
  @DisplayName("rejects replay with 403 Forbidden when BCeID user lacks matching client role")
  void shouldRejectReplayWhenBceidUserLacksMatchingRole() {
    ReportingUnitEntity ru = new ReportingUnitEntity();
    ru.setId(100L);
    ru.setClientNumber("00012797");
    when(reportingUnitRepository.findByIdAndDeletedFalse(100L)).thenReturn(Optional.of(ru));

    Jwt jwt = WithMockJwtSecurityContextFactory.createJwt(
        "bceid-user",
        List.of("WASTE_PLUS_SUBMITTER_99999999"),
        "bceidbusiness",
        "BCeID User",
        "bceid@example.com");
    Authentication auth = new UsernamePasswordAuthenticationToken(jwt, "n/a", List.of());

    MockHttpServletRequest request =
        new MockHttpServletRequest(
            "POST", "/api/reporting-units/100/blocks/1/attachments/2/finalize");

    assertThatThrownBy(() -> checker.checkAuthorization(request, auth))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("User is not authorized to access reporting unit: 100");
  }

  @Test
  @DisplayName("rejects replay with 403 Forbidden when reporting unit not found")
  void shouldRejectReplayWhenReportingUnitNotFound() {
    when(reportingUnitRepository.findByIdAndDeletedFalse(100L)).thenReturn(Optional.empty());

    Jwt jwt = WithMockJwtSecurityContextFactory.createJwt(
        "bceid-user",
        List.of("WASTE_PLUS_SUBMITTER_00012797"),
        "bceidbusiness",
        "BCeID User",
        "bceid@example.com");
    Authentication auth = new UsernamePasswordAuthenticationToken(jwt, "n/a", List.of());

    MockHttpServletRequest request =
        new MockHttpServletRequest(
            "POST", "/api/reporting-units/100/blocks/1/attachments/2/finalize");

    assertThatThrownBy(() -> checker.checkAuthorization(request, auth))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("User is not authorized to access reporting unit: 100");
  }

  @Test
  @DisplayName("allows replay for IDIR user without client role check")
  void shouldAllowReplayForIdirUser() {
    Jwt jwt = WithMockJwtSecurityContextFactory.createJwt(
        "idir-user",
        List.of(),
        "idir",
        "IDIR User",
        "idir@example.com");
    Authentication auth = new UsernamePasswordAuthenticationToken(jwt, "n/a", List.of());

    MockHttpServletRequest request =
        new MockHttpServletRequest(
            "POST", "/api/reporting-units/100/blocks/1/attachments/2/finalize");

    assertThatCode(() -> checker.checkAuthorization(request, auth)).doesNotThrowAnyException();
    verifyNoInteractions(reportingUnitRepository);
  }

  @Test
  @DisplayName("allows replay for non-reporting-unit endpoint")
  void shouldAllowReplayForNonReportingUnitPath() {
    MockHttpServletRequest request =
        new MockHttpServletRequest("POST", "/api/configuration/district-average-volumes");

    assertThatCode(() -> checker.checkAuthorization(request, null)).doesNotThrowAnyException();
    verifyNoInteractions(reportingUnitRepository);
  }

  @Test
  @DisplayName("rejects replay with 403 Forbidden when reporting unit id is not a valid Long")
  void shouldRejectReplayWhenReportingUnitIdCannotBeParsed() {
    MockHttpServletRequest request =
        new MockHttpServletRequest(
            "POST", "/api/reporting-units/999999999999999999999999999999/finalize");

    assertThatThrownBy(() -> checker.checkAuthorization(request, null))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining(
            "Invalid reporting unit identifier: 999999999999999999999999999999");
    verifyNoInteractions(reportingUnitRepository);
  }
}

