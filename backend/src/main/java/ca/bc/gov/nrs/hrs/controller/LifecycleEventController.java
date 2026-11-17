package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.dto.block.LifecycleEventRequestDto;
import ca.bc.gov.nrs.hrs.dto.block.LifecycleEventResponseDto;
import ca.bc.gov.nrs.hrs.service.lifecycle.LifecycleEventService;
import ca.bc.gov.nrs.hrs.util.ConditionalRequestSupport;
import io.micrometer.observation.annotation.Observed;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * REST controller exposing lifecycle-event endpoints for reporting units and blocks.
 */
@RestController
@RequestMapping("/api/reporting-units")
@RequiredArgsConstructor
@Slf4j
@Observed
public class LifecycleEventController {

  private final LifecycleEventService lifecycleEventService;

  /**
   * Applies a lifecycle event transition to a submission block.
   *
   * @param servletRequest HTTP request carrying the required {@code If-Match} header
   * @param jwt caller JWT principal
   * @param idempotencyKey unique idempotency token required for replay protection
   * @param reportingUnitId target reporting unit identifier
   * @param blockId target block identifier
   * @param request event payload specifying the transition
   * @return 200 OK with the lifecycle event response and strong ETag header
   */
  @PostMapping({
    "/{reportingUnitId}/{blockId}/lifecycle-events",
    "/{reportingUnitId}/blocks/{blockId}/lifecycle-events"
  })
  public ResponseEntity<LifecycleEventResponseDto> submitBlockLifecycleEvent(
      HttpServletRequest servletRequest,
      @AuthenticationPrincipal Jwt jwt,
      @RequestHeader(name = "Idempotency-Key", required = true) String idempotencyKey,
      @PathVariable Long reportingUnitId,
      @PathVariable Long blockId,
      @Valid @RequestBody LifecycleEventRequestDto request) {

    if (idempotencyKey == null || idempotencyKey.isBlank()) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Idempotency-Key header is required and cannot be blank");
    }

    String normalizedEvent =
        request.event() != null ? request.event().trim().toUpperCase(Locale.ROOT) : "";
    log.info(
        "Received block lifecycle event '{}' for block {} under RU {}",
        normalizedEvent,
        blockId,
        reportingUnitId);

    LifecycleEventResponseDto response =
        lifecycleEventService.recordBlockLifecycleEvent(
            servletRequest, jwt, reportingUnitId, blockId, request);

    var responseBuilder = ResponseEntity.ok();
    if (response.version() != null) {
      responseBuilder.header(
          HttpHeaders.ETAG, ConditionalRequestSupport.eTagOf(response.version()));
    }

    return responseBuilder.body(response);
  }

  /**
   * Applies a lifecycle event transition to a reporting unit.
   *
   * @param servletRequest HTTP request carrying the required {@code If-Match} header
   * @param jwt caller JWT principal
   * @param idempotencyKey unique idempotency token required for replay protection
   * @param reportingUnitId target reporting unit identifier
   * @param request event payload specifying the transition
   * @return 200 OK with the lifecycle event response and strong ETag header
   */
  @PostMapping("/{reportingUnitId}/lifecycle-events")
  public ResponseEntity<LifecycleEventResponseDto> submitReportingUnitLifecycleEvent(
      HttpServletRequest servletRequest,
      @AuthenticationPrincipal Jwt jwt,
      @RequestHeader(name = "Idempotency-Key", required = true) String idempotencyKey,
      @PathVariable Long reportingUnitId,
      @Valid @RequestBody LifecycleEventRequestDto request) {

    if (idempotencyKey == null || idempotencyKey.isBlank()) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Idempotency-Key header is required and cannot be blank");
    }

    String normalizedEvent =
        request.event() != null ? request.event().trim().toUpperCase(Locale.ROOT) : "";
    log.info(
        "Received reporting unit lifecycle event '{}' for RU {}",
        normalizedEvent,
        reportingUnitId);

    LifecycleEventResponseDto response =
        lifecycleEventService.recordReportingUnitLifecycleEvent(
            servletRequest, jwt, reportingUnitId, request);

    var responseBuilder = ResponseEntity.ok();
    if (response.version() != null) {
      responseBuilder.header(
          HttpHeaders.ETAG, ConditionalRequestSupport.eTagOf(response.version()));
    }

    return responseBuilder.body(response);
  }
}
