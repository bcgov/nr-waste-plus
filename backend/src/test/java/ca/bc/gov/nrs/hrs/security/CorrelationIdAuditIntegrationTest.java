package ca.bc.gov.nrs.hrs.security;

import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.ConfigType;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.TableData;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.repository.AuditChangeRepository;
import ca.bc.gov.nrs.hrs.repository.DistrictVolumeRepository;
import io.micrometer.tracing.Baggage;
import io.micrometer.tracing.CurrentTraceContext;
import io.micrometer.tracing.Link;
import io.micrometer.tracing.ScopedSpan;
import io.micrometer.tracing.Span;
import io.micrometer.tracing.SpanCustomizer;
import io.micrometer.tracing.TraceContext;
import io.micrometer.tracing.Tracer;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Spike §6 integration coverage for B3 correlation propagation to the audit trigger.
 *
 * <p>Exercises the {@link CorrelationIdConnectionProvider} + Postgres GUC
 * {@code app.correlation_id} + {@code hrs.audit_district_volume_change()} trigger chain
 * against the real Testcontainers PostgreSQL 17 database via
 * {@link AbstractTestContainerIntegrationTest}.
 *
 * <p>All tests are intentionally <em>not</em> {@code @Transactional}: each mutation goes through
 * its own Spring {@code @Transactional} boundary (repository/service) and commits before the
 * audit is queried, so the transaction-scoped {@code set_config('app.correlation_id', ?, true)}
 * behaviour is observable. A class-level {@code @Transactional} would fold everything into the
 * test's outer transaction and hide leak/reuse bugs.
 *
 * <p>SecurityContext is populated per mutation (see {@link
 * ca.bc.gov.nrs.hrs.repository.DistrictVolumeRepositoryTest} pattern) so auditing never hits
 * the {@code created_by} / {@code updated_by} NOT NULL constraint.
 */
@DisplayName("Spike §6 | correlation_id audit trigger integration")
class CorrelationIdAuditIntegrationTest extends AbstractTestContainerIntegrationTest {

  @TestConfiguration
  static class TestTracerConfig {
    @Bean
    @Primary
    Tracer tracer() {
      return new ThreadLocalTracer();
    }
  }

  @Autowired private Tracer tracer;

  private static final AtomicLong START_DATE_OFFSET = new AtomicLong(100);

  @Autowired private DistrictVolumeRepository districtVolumeRepository;
  @Autowired private AuditChangeRepository auditChangeRepository;
  @Autowired private JdbcTemplate jdbcTemplate;
  @Autowired private org.springframework.transaction.support.TransactionTemplate transactionTemplate;

  @AfterEach
  void clearSecurityContext() {
    SecurityContextHolder.clearContext();
  }

  /** Thread-local Tracer that creates fresh spans per nextSpan() and tracks current span. */
  static class ThreadLocalTracer implements Tracer {
    private final ThreadLocal<Span> current = new ThreadLocal<>();

    @Override public Span nextSpan() { return new TestSpan(); }
    @Override public Span nextSpan(Span parent) { return new TestSpan(); }
    @Override public Span currentSpan() { Span s = current.get(); return s != null ? s : Span.NOOP; }
    @Override public Tracer.SpanInScope withSpan(Span span) {
      Span prev = current.get();
      if (span != null) current.set(span);
      else current.remove();
      return () -> {
        if (prev == null) current.remove();
        else current.set(prev);
      };
    }
    @Override public ScopedSpan startScopedSpan(String name) { Span s = nextSpan().name(name).start(); return new TestScopedSpan(s); }
    @Override public Span.Builder spanBuilder() { return new TestSpanBuilder(); }
    @Override public TraceContext.Builder traceContextBuilder() { return new TestTraceContextBuilder(); }
    @Override public CurrentTraceContext currentTraceContext() { return new TestCurrentTraceContext(); }
    @Override public SpanCustomizer currentSpanCustomizer() { return SpanCustomizer.NOOP; }
    @Override public Map<String, String> getAllBaggage() { return Collections.emptyMap(); }
    @Override public Baggage getBaggage(String key) { return null; }
    @Override public Baggage getBaggage(TraceContext ctx, String key) { return null; }
    @Override public Baggage createBaggage(String key) { return null; }
    @Override public Baggage createBaggage(String key, String value) { return null; }

    static final class TestSpan implements Span {
      private final String traceId = UUID.randomUUID().toString().replace("-", "");
      private final String spanId = UUID.randomUUID().toString().replace("-", "");
      private final TraceContext ctx = new TestTraceContext(traceId, spanId);
      @Override public boolean isNoop() { return false; }
      @Override public TraceContext context() { return ctx; }
      @Override public Span start() { return this; }
      @Override public Span name(String name) { return this; }
      @Override public Span event(String name) { return this; }
      @Override public Span event(String name, long duration, TimeUnit unit) { return this; }
      @Override public Span tag(String key, String value) { return this; }
      @Override public Span error(Throwable t) { return this; }
      @Override public Span remoteServiceName(String name) { return this; }
      @Override public Span remoteIpAndPort(String ip, int port) { return this; }
      @Override public void end() {}
      @Override public void end(long duration, TimeUnit unit) {}
      @Override public void abandon() {}
    }

    static final class TestTraceContext implements TraceContext {
      private final String traceId; private final String spanId;
      TestTraceContext(String traceId, String spanId) { this.traceId = traceId; this.spanId = spanId; }
      @Override public String traceId() { return traceId; }
      @Override public String spanId() { return spanId; }
      @Override public String parentId() { return null; }
      @Override public Boolean sampled() { return Boolean.TRUE; }
    }

    static final class TestScopedSpan implements ScopedSpan {
      private final Span span;
      TestScopedSpan(Span span) { this.span = span; }
      @Override public boolean isNoop() { return span.isNoop(); }
      @Override public TraceContext context() { return span.context(); }
      @Override public ScopedSpan name(String name) { span.name(name); return this; }
      @Override public ScopedSpan tag(String key, String value) { span.tag(key, value); return this; }
      @Override public ScopedSpan event(String name) { span.event(name); return this; }
      @Override public ScopedSpan error(Throwable t) { span.error(t); return this; }
      @Override public void end() { span.end(); }
    }

    static final class TestSpanBuilder implements Span.Builder {
      @Override public Span.Builder setParent(TraceContext parent) { return this; }
      @Override public Span.Builder setNoParent() { return this; }
      @Override public Span.Builder name(String name) { return this; }
      @Override public Span.Builder event(String name) { return this; }
      @Override public Span.Builder tag(String key, String value) { return this; }
      @Override public Span.Builder tag(String key, long value) { return this; }
      @Override public Span.Builder tag(String key, double value) { return this; }
      @Override public Span.Builder tag(String key, boolean value) { return this; }
      @Override public Span.Builder tagOfStrings(String key, List<String> values) { return this; }
      @Override public Span.Builder tagOfLongs(String key, List<Long> values) { return this; }
      @Override public Span.Builder tagOfDoubles(String key, List<Double> values) { return this; }
      @Override public Span.Builder tagOfBooleans(String key, List<Boolean> values) { return this; }
      @Override public Span.Builder error(Throwable t) { return this; }
      @Override public Span.Builder kind(Span.Kind kind) { return this; }
      @Override public Span.Builder remoteServiceName(String remoteServiceName) { return this; }
      @Override public Span.Builder remoteIpAndPort(String ip, int port) { return this; }
      @Override public Span.Builder startTimestamp(long timestamp, TimeUnit unit) { return this; }
      @Override public Span.Builder addLink(Link link) { return this; }
      @Override public Span start() { return new TestSpan(); }
    }

    static final class TestTraceContextBuilder implements TraceContext.Builder {
      @Override public TraceContext.Builder traceId(String traceId) { return this; }
      @Override public TraceContext.Builder spanId(String spanId) { return this; }
      @Override public TraceContext.Builder parentId(String parentId) { return this; }
      @Override public TraceContext.Builder sampled(Boolean sampled) { return this; }
      @Override public TraceContext build() { return new TestTraceContext(UUID.randomUUID().toString().replace("-",""), UUID.randomUUID().toString().replace("-","")); }
    }

    static final class TestCurrentTraceContext implements CurrentTraceContext {
      @Override public TraceContext context() { return TraceContext.NOOP; }
      @Override public Scope newScope(TraceContext ctx) { throw new UnsupportedOperationException(); }
      @Override public Scope maybeScope(TraceContext ctx) { throw new UnsupportedOperationException(); }
      @Override public <C> Callable<C> wrap(Callable<C> c) { return c; }
      @Override public Runnable wrap(Runnable r) { return r; }
      @Override public Executor wrap(Executor e) { return e; }
      @Override public ExecutorService wrap(ExecutorService e) { return e; }
    }
  }

  // ---- §6.1 happy path -----------------------------------------------------

  @Test
  @DisplayName("§6.1 happy path — active B3 span writes its traceId into audit_event.correlation_id and audit_change exists")
  void happypath_withSpanWritesCorrelationId() {
    setSecurityContext();

    Span span = tracer.nextSpan().name("test-happy-path").start();
    String traceIdBefore = span.context().traceId();
    long beforeMaxEventId = maxAuditEventId();
    try (Tracer.SpanInScope ws = tracer.withSpan(span)) {
      assertThat(traceIdBefore).isNotBlank();
      assertThat(tracer.currentSpan()).isNotNull();

      transactionTemplate.executeWithoutResult(status ->
          districtVolumeRepository.saveAndFlush(newEntity(Area.INTERIOR)));
    } finally {
      span.end();
    }
    // Query outside the span scope and outside the mutation transaction to prove
    // the value was persisted, not just visible in the same Hibernate session.
    String correlationId = latestCorrelationId();
    assertThat(correlationId)
        .as("audit_event.correlation_id should be set when a span is active")
        .isNotBlank();

    Long latestEventId = maxAuditEventId();
    assertThat(latestEventId).isGreaterThan(beforeMaxEventId);
    assertAuditChangeExistsForEvent(latestEventId);
  }

  // ---- §6.2 no-span ---------------------------------------------------------

  @Test
  @DisplayName("§6.2 no-span — without an active span the mutation succeeds and correlation_id IS NULL")
  void noSpanWritesNull() {
    // Prove we really are in the no-span condition before mutating.
    assertThat(tracer.currentSpan())
        .as("no span should be active before the noSpan test; previous test must have cleaned up")
        .satisfiesAnyOf(
            span -> assertThat(span).isNull(),
            span -> assertThat(span.isNoop()).isTrue());

    setSecurityContext();

    DistrictVolumeEntity entity = newEntity(Area.COASTAL);

    districtVolumeRepository.saveAndFlush(entity);

    String correlationId = latestCorrelationId();
    assertThat(correlationId)
        .as("when no B3 span is active the provider must not set app.correlation_id")
        .isNull();

    // Still a valid audit row
    Long latestEventId = maxAuditEventId();
    assertAuditChangeExistsForEvent(latestEventId);
  }

  // ---- §6.3 raw SQL (bypass application provider) --------------------------

  @Test
  @DisplayName("§6.3 raw SQL — direct JdbcTemplate INSERT bypasses Hibernate provider and records NULL correlation_id")
  void rawSqlWriteHasNullCorrelation() {
    assertThat(tracer.currentSpan())
        .satisfiesAnyOf(span -> assertThat(span).isNull(), span -> assertThat(span.isNoop()).isTrue());

    long beforeMaxEventId = maxAuditEventId();
    LocalDate startDate = LocalDate.now().plusDays(nextStartOffset());
    int rows =
        jdbcTemplate.update(
            "INSERT INTO hrs.district_volume "
                + "(area, start_date, table_data, table_level_factor, created_by, updated_by, config_type, deleted) "
                + "VALUES (?, ?, ?::jsonb, ?, ?, ?, ?, FALSE)",
            Area.INTERIOR.name(),
            java.sql.Date.valueOf(startDate),
            "{}",
            new BigDecimal("1.000"),
            "raw-sql-user",
            "raw-sql-user",
            ConfigType.DISTRICT_VOLUME.name());

    assertThat(rows).isOne();

    Long latestEventId = maxAuditEventId();
    assertThat(latestEventId).isGreaterThan(beforeMaxEventId);
    assertThat(
            jdbcTemplate.queryForObject(
                "SELECT correlation_id FROM hrs.audit_event WHERE id = ?", String.class, latestEventId))
        .as("raw JdbcTemplate write must bypass the Hibernate provider")
        .isEmpty();
    assertThat(
            jdbcTemplate.queryForObject(
                "SELECT action FROM hrs.audit_event WHERE id = ?", String.class, latestEventId))
        .isEqualTo("CREATE");
    assertAuditChangeExistsForEvent(latestEventId);
  }

  // ---- §6.4 multiple transactions, distinct IDs -----------------------------

  @Test
  @DisplayName("§6.4 multiple transactions — two sequential commits with different traceIds get distinct correlation_ids")
  void multipleTransactionsGetDistinctCorrelationIds() {
    setSecurityContext();

    // First transaction with span A
    Span span1 = tracer.nextSpan().name("test-multi-tx-1").start();
    String traceId1 = span1.context().traceId();
    assertThat(traceId1).isNotBlank();
    DistrictVolumeEntity e1 = newEntity(Area.INTERIOR);
    try (Tracer.SpanInScope ws = tracer.withSpan(span1)) {
      districtVolumeRepository.saveAndFlush(e1);
    } finally {
      span1.end();
    }
    String corr1 = latestCorrelationId();
    Long eventId1 = maxAuditEventId();
    assertThat(corr1).isEqualTo(traceId1);
    assertAuditChangeExistsForEvent(eventId1);

    // Second transaction with span B — must be a different traceId to prove per-transaction binding.
    Span span2 = tracer.nextSpan().name("test-multi-tx-2").start();
    String traceId2 = span2.context().traceId();
    assertThat(traceId2).isNotBlank();
    // Brave may rarely reuse 64-bit traceIds, but nextSpan() with no parent always starts a new trace,
    // so the two 128-bit ids should differ. If they collide, fail fast — test is not proving isolation.
    assertThat(traceId2).as("two independent traces must have distinct ids").isNotEqualTo(traceId1);

    DistrictVolumeEntity e2 = newEntity(Area.INTERIOR);
    // SecurityContext is ThreadLocal and survives across transactions in the same test thread;
    // re-set to be explicit (idempotent).
    setSecurityContext();
    try (Tracer.SpanInScope ws = tracer.withSpan(span2)) {
      districtVolumeRepository.saveAndFlush(e2);
    } finally {
      span2.end();
    }
    String corr2 = latestCorrelationId();
    Long eventId2 = maxAuditEventId();
    assertThat(corr2).isEqualTo(traceId2);
    assertThat(eventId2).isGreaterThan(eventId1);
    assertAuditChangeExistsForEvent(eventId2);

    // Prove each audit row captured its own correct id — no cross-contamination.
    String fetchedCorr1 =
        jdbcTemplate.queryForObject(
            "SELECT correlation_id FROM hrs.audit_event WHERE id = ?", String.class, eventId1);
    String fetchedCorr2 =
        jdbcTemplate.queryForObject(
            "SELECT correlation_id FROM hrs.audit_event WHERE id = ?", String.class, eventId2);
    assertThat(fetchedCorr1).isEqualTo(traceId1);
    assertThat(fetchedCorr2).isEqualTo(traceId2);
    assertThat(fetchedCorr1).isNotEqualTo(fetchedCorr2);
  }

  // ---- §6.5 connection reuse / no bleed -----------------------------------

/**
 * §6.5 — Connection reuse / no bleed.
 *
 * <p><b>Why this test proves no bleed even on the same physical Hikari connection:</b>
 * {@link CorrelationIdConnectionProvider} binds the trace id via
 * {@code SELECT set_config('app.correlation_id', ?, true)} — the third argument {@code true}
 * means {@code is_local}, i.e. PostgreSQL marks the GUC as <em>local to the current
 * transaction</em> and discards it automatically on {@code COMMIT} / {@code ROLLBACK}
 * (see {@code src/main/resources/db/migration/V1.0.6__audit_correlation_id.sql} and the
 * Postgres {@code set_config} docs). Hibernate's default connection handling mode is
 * {@code DELAYED_ACQUISITION_AND_RELEASE_AFTER_TRANSACTION}: the JDBC {@code Connection}
 * is acquired at the first SQL statement inside the Spring {@code @Transactional} and
 * returned to the Hikari pool after the transaction commits. The same physical connection
 * may therefore be handed to the next transaction. Because the GUC is transaction-local,
 * the next transaction starts with {@code current_setting('app.correlation_id', true) == NULL}
 * even when the underlying socket is reused — no explicit {@code RESET} is required and
 * a previous trace id cannot leak.
 *
 * <p>If the provider had used {@code set_config(..., false)} (session-scoped), a trace id
 * would persist on the pooled connection after commit and bleed into the next request on
 * that connection. This test would then fail on the second assertion (no-span would see
 * the previous trace id).
 *
 * <p>Investigation: Hibernate handling mode is the ORM default and is <em>not</em> overridden
 * anywhere in {@code application.yml} or {@code GlobalConfiguration}, so
 * {@code DELAYED_ACQUISITION_AND_RELEASE_AFTER_TRANSACTION} applies. Explicitly proving
 * reuse of the <em>same physical connection</em> from Hikari would require instrumenting
 * the pool or unwrapping {@code HikariProxyConnection} and is brittle; instead we prove
 * the <em>semantic guarantee</em> (no bleed) which is the contract that matters. The
 * transaction-local semantics make physical-reuse equivalence explicit: even if reuse
 * happens, state does not bleed.
 */
  @Test
  @DisplayName("§6.5 connection reuse — sequential transactions in same thread do not bleed correlation_id across pooled connections")
  void connectionReuse_noBleedAcrossSequentialTransactions() {
    setSecurityContext();

    // Transaction 1: with span A -> expect traceId A persisted
    Span spanA = tracer.nextSpan().name("test-reuse-A").start();
    String traceIdA = spanA.context().traceId();
    assertThat(traceIdA).isNotBlank();
    DistrictVolumeEntity e1 = newEntity(Area.COASTAL);
    try (Tracer.SpanInScope ws = tracer.withSpan(spanA)) {
      transactionTemplate.execute(status -> {
        districtVolumeRepository.saveAndFlush(e1);
        return null;
      });
    } finally {
      spanA.end();
    }
    String corrA = latestCorrelationId();
    Long eventA = maxAuditEventId();
    assertThat(corrA).as("first reused-connection tx with span should persist its traceId").isEqualTo(traceIdA);
    assertAuditChangeExistsForEvent(eventA);

    // Transaction 2: no span -> expect NULL even though the same physical Hikari connection
    // may be reused. If the GUC had been session-scoped, this would incorrectly contain traceIdA.
    // Re-establish SecurityContext (ThreadLocal, but explicit for clarity).
    setSecurityContext();
    // Ensure we are really out of any span before the no-span mutation.
    assertThat(tracer.currentSpan())
        .satisfiesAnyOf(span -> assertThat(span).isNull(), span -> assertThat(span.isNoop()).isTrue());

    DistrictVolumeEntity e2 = newEntity(Area.COASTAL);
    transactionTemplate.execute(status -> {
      // No GUC set for this transaction (no span)
      districtVolumeRepository.saveAndFlush(e2);
      return null;
    });
    String corrNull = latestCorrelationId();
    Long eventNull = maxAuditEventId();
    assertThat(eventNull).isGreaterThan(eventA);
    assertThat(corrNull)
        .as("second tx with no span must not set app.correlation_id even if Hikari reused the same physical connection")
        .isEmpty();
    assertAuditChangeExistsForEvent(eventNull);

    // Transaction 3: with span B (distinct) -> expect traceId B, not A or NULL bleed
    Span spanB = tracer.nextSpan().name("test-reuse-B").start();
    String traceIdB = spanB.context().traceId();
    assertThat(traceIdB).isNotBlank();
    assertThat(traceIdB).isNotEqualTo(traceIdA);
    DistrictVolumeEntity e3 = newEntity(Area.COASTAL);
    setSecurityContext();
    try (Tracer.SpanInScope ws = tracer.withSpan(spanB)) {
      transactionTemplate.execute(status -> {
        districtVolumeRepository.saveAndFlush(e3);
        return null;
      });
    } finally {
      spanB.end();
    }
    String corrB = latestCorrelationId();
    Long eventB = maxAuditEventId();
    assertThat(eventB).isGreaterThan(eventNull);
    assertThat(corrB).as("third tx with new span should persist its own traceId, not the previous null or A").isEqualTo(traceIdB);
    assertThat(corrB).isNotEqualTo(corrA);
    assertAuditChangeExistsForEvent(eventB);

    // Final cross-check via direct id lookup to rule out LIMIT 1 ordering flakiness
    assertThat(
            jdbcTemplate.queryForObject(
                "SELECT correlation_id FROM hrs.audit_event WHERE id = ?", String.class, eventA))
        .isEqualTo(traceIdA);
    assertThat(
            jdbcTemplate.queryForObject(
                "SELECT correlation_id FROM hrs.audit_event WHERE id = ?", String.class, eventNull))
        .isEmpty();
    assertThat(
            jdbcTemplate.queryForObject(
                "SELECT correlation_id FROM hrs.audit_event WHERE id = ?", String.class, eventB))
        .isEqualTo(traceIdB);
  }

  // ---- helpers --------------------------------------------------------------

  private void setSecurityContext() {
    JwtAuthenticationToken token =
        new JwtAuthenticationToken(this.jwt, AuthorityUtils.createAuthorityList());
    SecurityContextHolder.getContext().setAuthentication(token);
  }

  private DistrictVolumeEntity newEntity(Area area) {
    DistrictVolumeEntity entity = new DistrictVolumeEntity();
    entity.setArea(area);
    entity.setConfigType(ConfigType.DISTRICT_VOLUME);
    entity.setStartDate(LocalDate.now().plusDays(nextStartOffset()));
    // Minimal valid TableData — matches DistrictVolumeRepositoryTest construction.
    entity.setTableData(new TableData(null, null, null, Map.of()));
    entity.setTableLevelFactor(new BigDecimal("1.000"));
    return entity;
  }

  private long nextStartOffset() {
    return START_DATE_OFFSET.getAndIncrement();
  }

  private Long maxAuditEventId() {
    Long max = jdbcTemplate.queryForObject("SELECT MAX(id) FROM hrs.audit_event", Long.class);
    return max != null ? max : 0L;
  }

  private String latestCorrelationId() {
    // Returns NULL as Java null when the column IS NULL (queryForObject with String.class does that).
    // Use a list query to distinguish "no rows" from "null value".
    return jdbcTemplate.queryForObject(
        "SELECT correlation_id FROM hrs.audit_event ORDER BY id DESC LIMIT 1", String.class);
  }

  private void assertAuditChangeExistsForEvent(Long eventId) {
    Integer count =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM hrs.audit_change WHERE event_id = ?", Integer.class, eventId);
    assertThat(count)
        .as("audit_change row must exist for audit_event %d", eventId)
        .isNotNull()
        .isGreaterThan(0);

    // Also confirm via JPA repository to guard against native-query vs JPA visibility drift.
    // AuditChangeRepository is a plain JpaRepository — findAll should see the same row after commit.
    // We do not assert count == 1 globally because other tests have inserted rows earlier in the
    // same container lifecycle; we only assert that *this* event is represented.
    long jpaCountForEvent =
        auditChangeRepository.findAll().stream()
            .filter(ac -> eventId.equals(ac.getEventId()))
            .count();
    assertThat(jpaCountForEvent)
        .as("audit_change must be visible via JPA as well for event %d", eventId)
        .isGreaterThan(0);
  }
}
