package ca.bc.gov.nrs.hrs.controller;

import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.serviceUnavailable;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.SYSTEM_OUT;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockMarkEntity;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WiremockLogNotifier;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import ca.bc.gov.nrs.hrs.repository.UserBookmarkRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockMarkRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import com.github.tomakehurst.wiremock.client.WireMock;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.retry.RetryRegistry;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Integration tests for the PostgreSQL V0 reporting-unit list search (issue #1238, D3b) against
 * the Testcontainers database with the real Flyway schema: row shape (DEC-014), supported and
 * approximate filters with silent-ignore (DEC-015), sort allowlist and tie-breakers, count
 * parity, the DEC-008 client-scope matrix, and the legacy no-fallback guarantee.
 *
 * <p>Every test seeds its own isolated scenario (unique district code scopes the row set against
 * other test classes sharing the container) and cleans up in FK order.
 */
@AutoConfigureMockMvc(print = SYSTEM_OUT)
@WithMockJwt
@DisplayName("Integrated Test | Postgres Reporting Unit Search")
class PostgresReportingUnitSearchIntegrationTest extends AbstractTestContainerIntegrationTest {

  private static final Instant BASE_TIME = Instant.parse("2026-01-01T00:00:00Z");
  private static final String FIXED_CLIENT_A = "00010002";
  private static final String FIXED_CLIENT_B = "00010003";
  private static final String ACTOR = "TEST-ACTOR";

  @RegisterExtension
  static WireMockExtension legacyApiStub =
      WireMockExtension.newInstance()
          .options(
              wireMockConfig()
                  .port(10001)
                  .notifier(new WiremockLogNotifier())
                  .asynchronousResponseEnabled(true)
                  .stubRequestLoggingDisabled(false))
          .configureStaticDsl(true)
          .build();

  @RegisterExtension
  static WireMockExtension clientApiStub =
      WireMockExtension.newInstance()
          .options(
              wireMockConfig()
                  .port(10000)
                  .notifier(new WiremockLogNotifier())
                  .asynchronousResponseEnabled(true)
                  .stubRequestLoggingDisabled(false))
          .configureStaticDsl(true)
          .build();

  private static final AtomicLong DISTRICT_SEQ = new AtomicLong();
  private static final AtomicLong CLIENT_SEQ = new AtomicLong();
  /** Synthetic {@code hrs.geographic_code} ids; starts above the migration seed range. */
  private static final AtomicLong GEO_CODE_ID_SEQ = new AtomicLong(990_000);

  @Autowired
  private MockMvc mockMvc;
  @Autowired
  private CircuitBreakerRegistry circuitBreakerRegistry;
  @Autowired
  private RetryRegistry retryRegistry;
  @Autowired
  private UserBookmarkRepository bookmarkRepository;
  @Autowired
  private ReportingUnitRepository reportingUnitRepository;
  @Autowired
  private BlockRepository blockRepository;
  @Autowired
  private BlockMarkRepository blockMarkRepository;
  @Autowired
  private JdbcTemplate jdbcTemplate;

  private final List<ReportingUnitEntity> seededUnits = new ArrayList<>();
  private final List<BlockEntity> seededBlocks = new ArrayList<>();
  private final List<BlockMarkEntity> seededMarks = new ArrayList<>();

  /** Seeded scenario: RU A (client A) with one live block + PRIMARY mark, and RU B (client B) blockless. */
  private record Seed(
      Long ruA, Long ruB, Long blockA, String clientA, String clientB, String district,
      Instant ruATime, Instant ruBTime) {}

  @BeforeEach
  public void setUp() {
    bookmarkRepository.deleteAll();
    legacyApiStub.resetAll();
    clientApiStub.resetAll();
    CircuitBreaker breaker = circuitBreakerRegistry.circuitBreaker("breaker");
    breaker.reset();
    RetryConfig retry = retryRegistry.retry("apiRetry").getRetryConfig();
    retryRegistry.remove("apiRetry");
    retryRegistry.retry("apiRetry", retry);
  }

  @AfterEach
  public void cleanUp() {
    // Clean up FK children before their parents: block_mark -> block -> reporting_unit.
    blockMarkRepository.deleteAll(seededMarks);
    blockRepository.deleteAll(seededBlocks);
    reportingUnitRepository.deleteAll(seededUnits);
    seededMarks.clear();
    seededBlocks.clear();
    seededUnits.clear();
  }

  @Test
  @DisplayName("Postgres search returns the DEC-014 row shape with count parity and no legacy call")
  void searchReportingUnit_postgresBase_shouldReturnRowShape() throws Exception {
    Seed seed = seedScenario(uniqueClient(), uniqueClient());

    mockMvc
        .perform(get("/api/search/reporting-units")
            .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$.page.totalElements").value(2))
        // Block row (RU A): block/mark fields populated, WAA id = block id, fixed sampling,
        // placeholders.
        .andExpect(jsonPath("$.content[0].ruNumber").value(seed.ruA().intValue()))
        .andExpect(jsonPath("$.content[0].wasteAssessmentAreaId").value(seed.blockA().intValue()))
        .andExpect(jsonPath("$.content[0].cutBlockId").value("BLK-A"))
        .andExpect(jsonPath("$.content[0].client.code").value(seed.clientA()))
        .andExpect(jsonPath("$.content[0].client.description").value("TEST CLIENT A"))
        .andExpect(jsonPath("$.content[0].licenseNumber").value("tfl01"))
        .andExpect(jsonPath("$.content[0].cuttingPermit").value("12"))
        .andExpect(jsonPath("$.content[0].timberMark").value("ab12"))
        .andExpect(jsonPath("$.content[0].multiMark").value(false))
        .andExpect(jsonPath("$.content[0].secondaryEntry").value(false))
        .andExpect(jsonPath("$.content[0].sampling.code").value("AVG"))
        .andExpect(jsonPath("$.content[0].sampling.description").value("Average"))
        .andExpect(jsonPath("$.content[0].district.code").value(seed.district()))
        .andExpect(jsonPath("$.content[0].district.description")
            .value(seed.district()))
        // Block-scoped latest status_event is unread (no writer) — the DFT/Draft fallback fires
        // (same derivation as ReportingUnitBlockService.resolveStatus; waa_status_code join).
        .andExpect(jsonPath("$.content[0].status.code").value("DFT"))
        .andExpect(jsonPath("$.content[0].status.description").value("Draft"))
        .andExpect(jsonPath("$.content[0].bookmarked").value(false))
        .andExpect(jsonPath("$.content[0].id").value(
            org.hamcrest.Matchers.startsWith("RU-" + seed.ruA() + "-Block-" + seed.blockA() + "-")))
        // RU-only row (RU B): block/mark fields NULL, status code+description NULL (no block,
        // so no status derivation at all), still one row.
        .andExpect(jsonPath("$.content[1].ruNumber").value(seed.ruB().intValue()))
        .andExpect(jsonPath("$.content[1].wasteAssessmentAreaId").value(nullValue()))
        .andExpect(jsonPath("$.content[1].cutBlockId").value(nullValue()))
        .andExpect(jsonPath("$.content[1].licenseNumber").value(nullValue()))
        .andExpect(jsonPath("$.content[1].cuttingPermit").value(nullValue()))
        .andExpect(jsonPath("$.content[1].timberMark").value(nullValue()))
        .andExpect(jsonPath("$.content[1].status.code").value(nullValue()))
        .andExpect(jsonPath("$.content[1].status.description").value(nullValue()))
        .andExpect(jsonPath("$.content[1].sampling.code").value("AVG"))
        .andExpect(jsonPath("$.content[1].district.code").value(seed.district()))
        .andExpect(jsonPath("$.content[1].district.description").value(seed.district()))
        .andExpect(jsonPath("$.content[1].id").value(
            org.hamcrest.Matchers.startsWith("RU-" + seed.ruB() + "-Block-N/A-")))
        .andReturn();

    legacyApiStub.verify(0, WireMock.getRequestedFor(
        urlPathEqualTo("/api/search/reporting-units")));
  }

  @Test
  @DisplayName("Postgres secondaryEntry derives from a live SECONDARY mark, same as multiMark")
  void searchReportingUnit_postgresSecondaryEntry_shouldDeriveFromSecondaryMark()
      throws Exception {
    Seed seed = seedScenario(uniqueClient(), uniqueClient());
    seedSecondaryMark(seed.blockA(), true);

    // A soft-deleted SECONDARY mark is not live — both derived flags stay false.
    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(2))
        .andExpect(jsonPath("$.content[0].ruNumber").value(seed.ruA().intValue()))
        .andExpect(jsonPath("$.content[0].multiMark").value(false))
        .andExpect(jsonPath("$.content[0].secondaryEntry").value(false));

    seedSecondaryMark(seed.blockA(), false);

    // A live SECONDARY mark flips BOTH derived flags together (A-09 product decision: HRS
    // secondaryEntry = existence of a live SECONDARY mark, same derivation as multiMark).
    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(2))
        .andExpect(jsonPath("$.content[0].ruNumber").value(seed.ruA().intValue()))
        .andExpect(jsonPath("$.content[0].multiMark").value(true))
        .andExpect(jsonPath("$.content[0].secondaryEntry").value(true))
        // RU-only row: no block, so neither exists-derivation matches.
        .andExpect(jsonPath("$.content[1].ruNumber").value(seed.ruB().intValue()))
        .andExpect(jsonPath("$.content[1].multiMark").value(false))
        .andExpect(jsonPath("$.content[1].secondaryEntry").value(false));

    legacyApiStub.verify(0, WireMock.getRequestedFor(
        urlPathEqualTo("/api/search/reporting-units")));
  }

  @Test
  @DisplayName("Postgres enrichment: one bounded districts lookup per page, no other legacy call")
  void searchReportingUnit_postgresEnrichment_shouldStayWithinCallBudget() throws Exception {
    Seed seed = seedScenario(uniqueClient(), uniqueClient());

    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(2))
        .andReturn();

    // OQ-004 budget: districts (1 full-list call) + forest-client (2 distinct clients) = 3 total
    // legacy-side calls; the legacy SEARCH endpoint is never touched (no source fallback).
    assertThat(legacyApiStub.getAllServeEvents()).hasSize(1);
    assertThat(clientApiStub.getAllServeEvents()).hasSize(2);
    legacyApiStub.verify(0, WireMock.getRequestedFor(
        urlPathEqualTo("/api/search/reporting-units")));
  }

  @Test
  @DisplayName("Postgres enrichment: codes endpoint down keeps rows 200 with NULL descriptions")
  void searchReportingUnit_postgresCodesDown_shouldKeepRowsIntact() throws Exception {
    Seed seed = seedScenario(uniqueClient(), uniqueClient());
    legacyApiStub.resetAll();
    stubForestClient(seed.clientA());
    stubForestClient(seed.clientB());
    // Districts endpoint unavailable -> circuit-breaker fallback (default districts lack the
    // seeded code) -> descriptions stay NULL; enrichment never fails the request (DEC-009).
    legacyApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/codes/districts")).willReturn(serviceUnavailable()));

    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(2))
        .andExpect(jsonPath("$.content[0].district.code").value(seed.district()))
        .andExpect(jsonPath("$.content[0].district.description").value(nullValue()))
        .andExpect(jsonPath("$.content[1].district.description").value(nullValue()))
        .andReturn();

    legacyApiStub.verify(0, WireMock.getRequestedFor(
        urlPathEqualTo("/api/search/reporting-units")));
  }

  @Test
  @DisplayName("Postgres search applies supported filters exactly")
  void searchReportingUnit_postgresSupportedFilters_shouldFilterExactly() throws Exception {
    Seed seed = seedScenario(uniqueClient(), uniqueClient());

    // clientNumbers (supported): only RU A's client.
    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("clientNumbers", seed.clientA())
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].ruNumber").value(seed.ruA().intValue()));

    // reportingUnitIds (supported): the blockless RU matches as the RU-only row.
    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("reportingUnitIds", String.valueOf(seed.ruB()))
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].ruNumber").value(seed.ruB().intValue()));

    // Legacy -1 sentinel disables the filter.
    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("reportingUnitIds", "-1")
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(2));
  }

  @Test
  @DisplayName("Postgres search: reportingUnitIds miss yields an honest empty page")
  void searchReportingUnit_postgresNoMatch_shouldReturnEmptyPage() throws Exception {
    Seed seed = seedScenario(uniqueClient(), uniqueClient());

    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("reportingUnitIds", "999999999")
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$.content.length()").value(0))
        .andExpect(jsonPath("$.page.totalElements").value(0));
  }

  @Test
  @DisplayName("Postgres bookmarked search with no bookmarks returns an empty page")
  void searchReportingUnit_postgresNoBookmarks_shouldReturnEmptyPage() throws Exception {
    Seed seed = seedScenario(FIXED_CLIENT_A, FIXED_CLIENT_B);

    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("bookmarked", "true")
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content.length()").value(0))
        .andExpect(jsonPath("$.page.totalElements").value(0));
  }

  @Test
  @DisplayName("Postgres mainSearchTerm: digits match the RU id, leading zeros included")
  void searchReportingUnit_postgresMainSearchTerm_digits() throws Exception {
    Seed seed = seedScenario(uniqueClient(), uniqueClient());

    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("mainSearchTerm", String.valueOf(seed.ruA()))
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].ruNumber").value(seed.ruA().intValue()));

    // Leading-zero digit string matches the numeric id (legacy TO_NUMBER parity).
    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("mainSearchTerm", "0000" + seed.ruA())
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].ruNumber").value(seed.ruA().intValue()));
  }

  @Test
  @DisplayName("Postgres mainSearchTerm: non-digit term is silently ignored; overflow returns 400")
  void searchReportingUnit_postgresMainSearchTerm_ignoreAndOverflow() throws Exception {
    Seed seed = seedScenario(uniqueClient(), uniqueClient());

    // Non-digit term: no predicate, no error (DEC-015) — bound parameter keeps the CASE lazy.
    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("mainSearchTerm", "ZZZ")
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(2));

    // 20-digit numeric term: documented 400 robustness deviation (legacy ORA-01722 500).
    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("mainSearchTerm", "99999999999999999999")
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.status").value(400))
        .andExpect(jsonPath("$.detail").value("numeric search term out of range"));
  }

  @Test
  @DisplayName("Postgres mark filters: uppercase binding, RU-only rows drop out, raw permit compare")
  void searchReportingUnit_postgresMarkFilters_shouldApplyAtMarkLevel() throws Exception {
    Seed seed = seedScenario(uniqueClient(), uniqueClient());

    // licenseeId: stored 'tfl01', bound value uppercased -> matches (approximate, mark-level).
    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("licenseeId", "TFL01")
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].ruNumber").value(seed.ruA().intValue()));

    // timberMark: stored 'ab12', bound value uppercased -> matches.
    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("timberMark", "AB12")
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].ruNumber").value(seed.ruA().intValue()));

    // cuttingPermitId compares the RAW stored column (' 12 '), not the trimmed output ('12')
    // — legacy-mirroring nuance (GAP-004); the padded value therefore does not match.
    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("cuttingPermitId", "12")
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(0));
  }

  @Test
  @DisplayName("Postgres search silently ignores unsupported filters (DEC-015)")
  void searchReportingUnit_postgresSilentIgnore_shouldNotChangeResults() throws Exception {
    Seed seed = seedScenario(uniqueClient(), uniqueClient());

    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("sampling", "AVG")
            .queryParam("status", "DFT")
            .queryParam("multiMark", "true")
            .queryParam("requestUserId", "SOMEONE")
            .queryParam("requestByMe", "true")
            .queryParam("updateDateStart", "2020-01-01")
            .queryParam("updateDateEnd", "2030-12-31")
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(2))
        .andExpect(jsonPath("$.content[0].ruNumber").value(seed.ruA().intValue()))
        .andExpect(jsonPath("$.content[1].ruNumber").value(seed.ruB().intValue()));
  }

  @Test
  @DisplayName("Postgres sort: default DESC order with deterministic tie-breaker; count parity")
  void searchReportingUnit_postgresSort_shouldOrderDeterministically() throws Exception {
    Seed seed = seedScenario(uniqueClient(), uniqueClient());
    Long ruTie = seedBlocklessUnit(uniqueClient(), seed.district(), seed.ruBTime());

    // Default sort (lastUpdated DESC): RU A first, then the tied pair ordered by ru_number ASC.
    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(3))
        .andExpect(jsonPath("$.content[0].ruNumber").value(seed.ruA().intValue()))
        .andExpect(jsonPath("$.content[1].ruNumber").value(seed.ruB().intValue()))
        .andExpect(jsonPath("$.content[2].ruNumber").value(ruTie.intValue()));

    // Sampling is currently a stable AVG/Average value; the requested sort is accepted and the
    // deterministic RU/block tie-breakers define row order.
    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("sort", "sampling,asc")
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(3))
        .andExpect(jsonPath("$.content[0].sampling.code").value("AVG"))
        .andExpect(jsonPath("$.content[0].ruNumber").value(seed.ruA().intValue()))
        .andExpect(jsonPath("$.content[1].sampling.description").value("Average"))
        .andExpect(jsonPath("$.content[1].ruNumber").value(seed.ruB().intValue()))
        .andExpect(jsonPath("$.content[2].ruNumber").value(ruTie.intValue()));

    // Explicit ruNumber DESC reverses; the tie-breaker keys stay appended (total order stable).
    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("sort", "ruNumber,desc")
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(3))
        .andExpect(jsonPath("$.content[0].ruNumber").value(ruTie.intValue()))
        .andExpect(jsonPath("$.content[1].ruNumber").value(seed.ruB().intValue()))
        .andExpect(jsonPath("$.content[2].ruNumber").value(seed.ruA().intValue()));

    // timberMark ASC: NULLs (RU-only rows) order last under PostgreSQL's default.
    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("sort", "timberMark,asc")
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(3))
        .andExpect(jsonPath("$.content[0].ruNumber").value(seed.ruA().intValue()))
        .andExpect(jsonPath("$.content[1].ruNumber").value(seed.ruB().intValue()))
        .andExpect(jsonPath("$.content[2].ruNumber").value(ruTie.intValue()));
  }

  @Test
  @DisplayName("Postgres sort: unknown and degenerate keys are rejected with 428")
  void searchReportingUnit_postgresInvalidSort_shouldReject428() throws Exception {
    Seed seed = seedScenario(uniqueClient(), uniqueClient());

    for (String key : List.of("bogusField", "wasteAssessmentAreaId", "sampling", "sampling.code")) {
      mockMvc
          .perform(get("/api/search/reporting-units")
              .queryParam("legacy", "false")
              .queryParam("district", seed.district())
              .queryParam("sort", key + ",asc")
              .queryParam("page", "0")
              .queryParam("size", "10")
              .accept(MediaType.APPLICATION_JSON))
          .andExpect(status().is(428))
          .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
          .andExpect(jsonPath("$.status").value(428))
          .andExpect(jsonPath("$.detail", org.hamcrest.Matchers.containsString(key)));
    }
  }

  @Test
  @DisplayName("DEC-008 | IDIR unrestricted: absent and sentinel client filters see all rows")
  void searchReportingUnit_postgresDec008_idirUnrestricted() throws Exception {
    Seed seed = seedScenario(FIXED_CLIENT_A, FIXED_CLIENT_B);

    // Absent client filter: derived empty list re-normalizes to ['NOVALUE'] -> unrestricted.
    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(2))
        .andExpect(jsonPath("$.content[0].ruNumber").value(seed.ruA().intValue()))
        .andExpect(jsonPath("$.content[1].ruNumber").value(seed.ruB().intValue()));

    // Explicit single-sentinel list: same derivation path -> unrestricted.
    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("clientNumbers", "NOVALUE")
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(2));
  }

  @Test
  @DisplayName("DEC-008 | IDIR explicit client list scopes the rows; sentinel+list binds verbatim")
  void searchReportingUnit_postgresDec008_idirExplicitList() throws Exception {
    Seed seed = seedScenario(FIXED_CLIENT_A, FIXED_CLIENT_B);

    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("clientNumbers", FIXED_CLIENT_A)
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].ruNumber").value(seed.ruA().intValue()));

    // ['NOVALUE', client] binds verbatim: the SQL sentinel disjunct neutralizes the filter —
    // filter neutralization semantics, never an authorization grant.
    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("clientNumbers", "NOVALUE")
            .queryParam("clientNumbers", FIXED_CLIENT_B)
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(2));
  }

  @Test
  @DisplayName("DEC-008 | BCeID scope derives from roles: only role clients are visible")
  @WithMockJwt(idp = "bceidbusiness", cognitoGroups = {"Viewer_" + FIXED_CLIENT_A})
  void searchReportingUnit_postgresDec008_bceidDerivedScope() throws Exception {
    Seed seed = seedScenario(FIXED_CLIENT_A, FIXED_CLIENT_B);

    // Absent client filter + BCeID: derived from roles -> only the role client's rows.
    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].ruNumber").value(seed.ruA().intValue()));
  }

  @Test
  @DisplayName("DEC-008 | BCeID without client roles is denied, not given unrestricted rows")
  @WithMockJwt(idp = "bceidbusiness")
  void searchReportingUnit_postgresDec008_bceidWithoutRoles_shouldBeDenied() throws Exception {
    Seed seed = seedScenario(FIXED_CLIENT_A, FIXED_CLIENT_B);

    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("DEC-008 | BCeID cross-scope client filter stays rejected at the controller")
  @WithMockJwt(idp = "bceidbusiness", cognitoGroups = {"Viewer_" + FIXED_CLIENT_A})
  void searchReportingUnit_postgresDec008_bceidCrossScopeRejected() throws Exception {
    Seed seed = seedScenario(FIXED_CLIENT_A, FIXED_CLIENT_B);

    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("clientNumbers", FIXED_CLIENT_B)
            .queryParam("page", "0")
            .queryParam("size", "10")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("Paging: second page continues the deterministic order")
  void searchReportingUnit_postgresPaging_shouldPageStably() throws Exception {
    Seed seed = seedScenario(uniqueClient(), uniqueClient());
    seedBlocklessUnit(uniqueClient(), seed.district(), seed.ruBTime());

    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("sort", "ruNumber,asc")
            .queryParam("page", "0")
            .queryParam("size", "2")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.totalElements").value(3))
        .andExpect(jsonPath("$.content.length()").value(2));

    mockMvc
        .perform(get("/api/search/reporting-units")
            .queryParam("legacy", "false")
            .queryParam("district", seed.district())
            .queryParam("sort", "ruNumber,asc")
            .queryParam("page", "1")
            .queryParam("size", "2")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content.length()").value(1))
        .andExpect(jsonPath("$.content[0].ruNumber").value(
            org.hamcrest.Matchers.greaterThan(seed.ruB().intValue())));
  }

  private Seed seedScenario(String clientA, String clientB) {
    String district = uniqueDistrict();
    Instant ruATime = BASE_TIME.plusSeconds(200);
    Instant ruBTime = BASE_TIME.plusSeconds(100);

    ReportingUnitEntity ruA = seedUnit(clientA, district, ruATime);
    ReportingUnitEntity ruB = seedUnit(clientB, district, ruBTime);
    BlockEntity block = seedBlock(ruA.getId());
    seedPrimaryMark(block.getId());
    stubForestClient(clientA);
    stubForestClient(clientB);
    stubForestDistricts(district);
    return new Seed(ruA.getId(), ruB.getId(), block.getId(), clientA, clientB, district, ruATime,
        ruBTime);
  }

  private void stubForestDistricts(String district) {
    legacyApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/codes/districts"))
            .willReturn(
                okJson(
                    """
                    [
                      {"code": "%s", "description": "%s Natural Resource District"},
                      {"code": "DCC", "description": "Cariboo-Chilcotin"}
                    ]
                    """
                        .formatted(district, district))));
  }

  private ReportingUnitEntity seedUnit(String clientNumber, String district, Instant updatedAt) {
    // fk_reporting_unit_geographic_code (#1432) requires the district code to exist in
    // hrs.geographic_code; synthetic per-test districts must be seeded first.
    jdbcTemplate.update(
        """
        INSERT INTO hrs.geographic_code
            (id, code, description, geo_type, effective_date, expiry_date)
        VALUES (?, ?, ?, 'DISTRICT',
                TIMESTAMP '2003-04-01 00:00:00', TIMESTAMP '9999-12-31 00:00:00')
        ON CONFLICT (code) DO NOTHING
        """,
        GEO_CODE_ID_SEQ.incrementAndGet(),
        district,
        district + " Natural Resource District");
    ReportingUnitEntity unit = new ReportingUnitEntity();
    unit.setClientNumber(clientNumber);
    unit.setClientLocnCode("00");
    unit.setGeographicCode(district);
    unit.setCreatedBy(ACTOR);
    unit.setUpdatedBy(ACTOR);
    unit.setCreatedAt(BASE_TIME);
    unit.setUpdatedAt(updatedAt);
    ReportingUnitEntity saved = reportingUnitRepository.saveAndFlush(unit);
    seededUnits.add(saved);
    // JPA auditing (@LastModifiedDate) overwrites updated_at on persist; pin the value back
    // through JDBC so the default lastUpdated-DESC sort is deterministic.
    jdbcTemplate.update(
        "UPDATE hrs.reporting_unit SET updated_at = ? WHERE reporting_unit_id = ?",
        java.sql.Timestamp.from(updatedAt),
        saved.getId());
    return saved;
  }

  private BlockEntity seedBlock(Long reportingUnitId) {
    BlockEntity block = new BlockEntity();
    block.setReportingUnitId(reportingUnitId);
    block.setBlockType("DISTRICT_AVERAGE");
    block.setDraft(true);
    block.setCreatedBy(ACTOR);
    block.setUpdatedBy(ACTOR);
    block.setCreatedAt(BASE_TIME);
    block.setUpdatedAt(BASE_TIME);
    seededBlocks.add(blockRepository.saveAndFlush(block));
    return seededBlocks.getLast();
  }

  private void seedPrimaryMark(Long blockId) {
    BlockMarkEntity mark = new BlockMarkEntity();
    mark.setBlockId(blockId);
    mark.setMarkType("PRIMARY");
    mark.setSequenceNo(1);
    mark.setMark("M1");
    mark.setForestFileId("tfl01");
    mark.setCuttingPermitId(" 12 ");
    mark.setTimberMark("ab12");
    mark.setCutBlockId("BLK-A");
    mark.setCreatedBy(ACTOR);
    mark.setUpdatedBy(ACTOR);
    mark.setCreatedAt(BASE_TIME);
    mark.setUpdatedAt(BASE_TIME);
    seededMarks.add(blockMarkRepository.saveAndFlush(mark));
  }

  private void seedSecondaryMark(Long blockId, boolean deleted) {
    BlockMarkEntity mark = new BlockMarkEntity();
    mark.setBlockId(blockId);
    mark.setMarkType("SECONDARY");
    mark.setSequenceNo(1);
    mark.setMark("S1");
    mark.setDeleted(deleted);
    mark.setCreatedBy(ACTOR);
    mark.setUpdatedBy(ACTOR);
    mark.setCreatedAt(BASE_TIME);
    mark.setUpdatedAt(BASE_TIME);
    seededMarks.add(blockMarkRepository.saveAndFlush(mark));
  }

  private Long seedBlocklessUnit(String clientNumber, String district, Instant updatedAt) {
    return seedUnit(clientNumber, district, updatedAt).getId();
  }

  private void stubForestClient(String clientNumber) {
    clientApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/clients/findByClientNumber/" + clientNumber))
            .willReturn(
                okJson(
                    """
                    {
                      "clientNumber": "%s",
                      "clientName": "TEST CLIENT A",
                      "legalFirstName": null,
                      "legalMiddleName": null,
                      "clientStatusCode": "ACT",
                      "clientTypeCode": "F",
                      "acronym": null
                    }
                    """
                        .formatted(clientNumber))));
  }

  private static String uniqueDistrict() {
    return String.format("P%02X", DISTRICT_SEQ.getAndIncrement() % 256);
  }

  private static String uniqueClient() {
    // Forest Client numbers are numeric (ForestClientService.checkClientNumber reformats them);
    // seed realistic 8-digit numbers.
    return String.format("%08d", CLIENT_SEQ.incrementAndGet() % 100_000_000);
  }
}
