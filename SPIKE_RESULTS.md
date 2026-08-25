# Spike Results: B3 Correlation ID into Audit Trigger

## Scope and Verdict

This JVM-only spike validates propagation of the Micrometer trace ID from the
current span to the PostgreSQL audit trigger without adding Spring AOP, a
request filter, or an application correlation `ThreadLocal`.

**Verdict:** the approach works in this application on Spring Boot 4.1.0,
Hibernate ORM 7.4.1.Final, and PostgreSQL 17. The Hibernate provider decorator
is consumed by the JPA connection path, and all five real PostgreSQL integration
scenarios pass. A native-image build was intentionally not run. Native
reflection/runtime compatibility remains a follow-up validation item.

## Worktree

- Branch: `spike/correlation-id-audit-trigger`
- Worktree: `~/Worktrees/bcgov/nr-waste-plus/spike-correlation-id-audit-trigger`

## Investigation Findings

- The existing audit framework is in `hrs.audit_event` and
  `hrs.audit_change`, with the sole trigger on `hrs.district_volume`.
- `hrs.audit_district_volume_change()` supports both `DISTRICT_VOLUME` and
  `SPECIES_COMPOSITION` through `config_type` and writes one event/change pair
  per mutated row.
- The application uses Flyway and `spring-boot-starter-data-jpa`.
- The actual dependency versions are Spring Boot 4.1.0, Hibernate ORM
  7.4.1.Final, and Micrometer Tracing 1.7.0.
- Spring MVC is used through `spring-boot-starter-webmvc`; no WebFlux stack was
  found.
- Micrometer Tracing uses the Brave bridge. Existing `B3HeaderForwarder`
  confirms B3 propagation for outbound calls, while the provider reads the
  current Micrometer `Tracer` span directly.
- `AbstractTestContainerIntegrationTest` supplies the existing real PostgreSQL
  Testcontainers setup. The spike uses PostgreSQL 17.
- No pre-existing `HibernatePropertiesCustomizer` was found. The spike adds
  one in `GlobalConfiguration`.
- Hibernate's default connection handling mode is
  `DELAYED_ACQUISITION_AND_RELEASE_AFTER_TRANSACTION`; the physical connection
  is acquired for the transaction and returned to the pool after completion.

## Migration and Trigger

File: `backend/src/main/resources/db/migration/V1.0.6__audit_correlation_id.sql`

- Adds `hrs.audit_event.correlation_id` with the required additive
  `ADD COLUMN IF NOT EXISTS ... VARCHAR(64)` statement.
- The current V1.0.5 baseline already creates this column as `VARCHAR(128)`.
  V1.0.6 deliberately does not downsize an existing column, so the actual
  migrated schema remains `VARCHAR(128)` on a fresh database. This preserves
  existing values and is the safe resolution of the mismatch between the
  requested type and the already-landed baseline.
- Reads the transaction-local setting with the exact null-safe expression:
  `corr_id := current_setting('app.correlation_id', true);`
- Adds `corr_id` only to the `hrs.audit_event` insert. `audit_change` remains
  unchanged and has no correlation field.
- The rest of the trigger body, actor resolution, operation classification,
  changed-column calculation, entity-kind handling, and trigger binding remain
  unchanged from V1.0.5.
- Raw SQL and writes made without a setting continue to succeed; the trigger
  stores a null/empty database value as produced by PostgreSQL's unset GUC
  behavior.

## Connection Provider

File: `backend/src/main/java/ca/bc/gov/nrs/hrs/security/CorrelationIdConnectionProvider.java`

- Implements Hibernate's `ConnectionProvider` and wraps
  `DatasourceConnectionProviderImpl`.
- On `getConnection()`, obtains the delegate connection first, reads
  `tracer.currentSpan()`, and for a non-noop span with a nonblank trace ID
  executes the prepared statement:

  ```sql
  SELECT set_config('app.correlation_id', ?, true)
  ```

- The `true` argument makes the setting transaction-local, preventing a trace
  ID from bleeding across pooled-connection reuse.
- No-span calls skip propagation entirely.
- Delegate lifecycle and unwrapping methods are forwarded, including Hibernate's
  `Configurable.configure(...)` and `Stoppable.stop()` contracts.
- If propagation fails, the borrowed connection is returned before the SQL
  exception is rethrown.
- No Spring stereotype, AOP advice, servlet filter, or application correlation
  `ThreadLocal` was added.

## Wiring

File: `backend/src/main/java/ca/bc/gov/nrs/hrs/configuration/GlobalConfiguration.java`

- A single `HibernatePropertiesCustomizer` constructs a
  `DatasourceConnectionProviderImpl`, binds the application's `DataSource`,
  wraps it with `CorrelationIdConnectionProvider`, initializes the delegate
  lifecycle, and registers the instance under Hibernate's canonical
  `JdbcSettings.CONNECTION_PROVIDER` property (`hibernate.connection.provider_class`).
- The initial attempt used the wrong property key and left the delegate
  unconfigured. The final wiring corrected both issues; the passing tests prove
  Hibernate calls the wrapper on the JPA connection path.

## Reflection Hints

No new reflection hint was added. `CorrelationIdConnectionProvider` is created
directly with `new` inside the customizer and does not require reflective
instantiation. No new DTO or projection was introduced. Existing reflection
registration in `GlobalConfiguration` remains unchanged; the spike does not
alter the already-registered application types. Native-image verification is
out of scope and should confirm Hibernate's own SPI/runtime requirements in a
separate follow-up.

## Integration Tests

File: `backend/src/test/java/ca/bc/gov/nrs/hrs/security/CorrelationIdAuditIntegrationTest.java`

All tests use the real Testcontainers PostgreSQL database and assert direct
rows in the audit tables. The nested `ThreadLocalTracer` is only a test tracer
double; it is not used by production correlation capture.

- §6.1 active span: the audit event receives the generated test trace ID and a
  corresponding audit change exists.
- §6.2 no span: the mutation succeeds and the audit event has no correlation
  ID.
- §6.3 raw JDBC SQL: bypassing Hibernate still fires the trigger and produces
  no correlation ID.
- §6.4 two sequential transactions: two distinct test spans produce two
  distinct audit correlation IDs.
- §6.5 same-thread sequential transactions: a span, no-span transaction, and a
  second span do not bleed values across transaction boundaries.

## Verification

Required command, run from `backend/`:

```bash
./mvnw verify -P all-tests
```

Result:

```text
BUILD SUCCESS
Tests run: 122, Failures: 0, Errors: 0, Skipped: 0
All coverage checks have been met.
```

The targeted correlation suite also passed independently with five tests and
zero failures/errors. No native-image build was run.

## Residual Risks

- The current V1.0.5 schema's `VARCHAR(128)` definition takes precedence over
  the additive V1.0.6 `VARCHAR(64)` declaration on a fresh migration. A future
  production schema decision can introduce a separately reviewed narrowing
  migration if a 64-character limit is required.
- Hibernate provider SPI behavior and runtime reflection support should be
  validated in the later native-image spike.
- `set_config` adds a statement on provider connection acquisition. If a future
  connection-handling mode causes repeated acquisition within one logical
  transaction, the overhead should be measured before production rollout.

## Tracing diagnostic

The requested web-path probe was run against the existing `@SpringBootTest`
`RANDOM_PORT` base with `@AutoConfigureMockMvc` and the existing
`@WithMockJwt` test authentication. No production configuration, SQL, POM,
correlation implementation, filter, AOP, application `ThreadLocal`, or manual
`set_config` code was changed.

### §2 findings

- At request-handling time, `tracer.currentSpan()` was not `null`; it was the
  Micrometer no-op span implementation (`io.micrometer.tracing.Span$1`) with
  blank trace/span IDs and `noop=true`.
- The same no-op result was observed immediately before and after both the
  no-header GET comparison and the B3-header POST. The supplied
  `X-B3-TraceId=0123456789abcdef0123456789abcdef` and
  `X-B3-SpanId=0123456789abcdef` headers were present in the MockMvc request,
  but were not extracted into a current span.
- The runtime tracer bean was `noopTracer`; the observation registry was
  `io.micrometer.observation.SimpleObservationRegistry`. No `Propagator` bean
  was exposed by the application context (`propagatorBeans=[]`).
- The controller endpoint is annotated with `@Observed`, but the MockMvc
  dispatch did not create a Brave/Micrometer web span. The application uses
  Spring MVC (`spring-boot-starter-webmvc`), Spring Boot 4.1.0, Micrometer
  Tracing 1.7.0 with the Brave bridge, and the configured B3 properties remain
  present in `application.yml`.
- The B3-header POST reached the controller and returned HTTP 201, created an
  audit event and audit change, but `hrs.audit_event.correlation_id` was `NULL`.

### Raw probe output

```text
TRACE_PROBE before no-headers span=io.micrometer.tracing.Span$1 traceId= spanId= noop=true
TRACE_PROBE after no-headers span=io.micrometer.tracing.Span$1 traceId= spanId= noop=true
TRACE_PROBE before headers span=io.micrometer.tracing.Span$1 traceId= spanId= noop=true
TRACE_PROBE tracer=io.micrometer.tracing.Tracer$1
TRACE_PROBE observationRegistry=io.micrometer.observation.SimpleObservationRegistry
TRACE_PROBE tracerBeans=[noopTracer]
TRACE_PROBE propagatorBeans=[]
TRACE_PROBE observationRegistryBeans=[observationRegistry]
...
Status = 201
Headers = [..., Location:"/api/configuration/district-average-volumes/3", ...]
TRACE_PROBE after headers span=io.micrometer.tracing.Span$1 traceId= spanId= noop=true
expected: "0123456789abcdef0123456789abcdef"
 but was: null
Tests run: 2, Failures: 1, Errors: 0, Skipped: 0
```

### Classification

**Classification: B — test/runtime instrumentation gap, not a confirmed
library limitation.** The test authentication helper supplies a Spring
Security context for MockMvc, while MockMvc does not establish the embedded
Tomcat servlet observation path. A real socket request was previously attempted
against the RANDOM_PORT server, but it received HTTP 401 because `@WithMockJwt`
does not create a signed bearer token. Therefore the evidence proves that this
MockMvc path has no active propagated span, but does not establish whether the
configured production web runtime extracts B3 headers.

The temporary diagnostic code was removed after the probe. The final diff was
checked to ensure no `TRACE_PROBE`, temporary endpoint, temporary filter,
temporary tracer, or other probe implementation remains.

## Tracing dependency/config diagnostic

This diagnostic was read-only except for this appended section. No Java,
build, test, or configuration source was changed as part of this diagnostic.

### Commands and results

From `backend/`, the requested command completed successfully:

```text
./mvnw dependency:tree -Dscope=test
BUILD SUCCESS
```

The resolved dependency tree contains these relevant artifacts and scopes:

```text
org.springframework.boot:spring-boot-starter-webmvc:4.1.0:compile
org.springframework.boot:spring-boot-starter-actuator:4.1.0:compile
org.springframework.boot:spring-boot-actuator-autoconfigure:4.1.0:compile
org.springframework.boot:spring-boot-actuator:4.1.0:compile
org.springframework.boot:spring-boot-micrometer-tracing:4.1.0:compile
org.springframework.boot:spring-boot-micrometer-observation:4.1.0:compile
org.springframework.boot:spring-boot-autoconfigure:4.1.0:compile
io.micrometer:micrometer-observation:1.17.0:compile
io.micrometer:micrometer-commons:1.17.0:compile
io.micrometer:micrometer-tracing:1.7.0:compile
io.micrometer:context-propagation:1.2.1:compile
io.micrometer:micrometer-tracing-bridge-brave:1.7.0:compile
io.zipkin.brave:brave:6.3.1:compile
io.zipkin.brave:brave-context-slf4j:6.3.1:compile
io.zipkin.brave:brave-instrumentation-http:6.3.1:compile
io.zipkin.aws:brave-propagation-aws:1.4.0:compile
io.zipkin.contrib.brave-propagation-w3c:brave-propagation-tracecontext:0.2.0:compile
```

The application declares `spring-boot-starter-actuator`,
`spring-boot-micrometer-tracing`, and
`micrometer-tracing-bridge-brave` directly in `backend/pom.xml`. The
Spring Boot 4.1 Brave auto-configuration prerequisite coordinate is
`org.springframework.boot:spring-boot-micrometer-tracing-brave:4.1.0`;
that artifact is not present in the resolved dependency tree. The resolved
tree has the Micrometer Brave bridge and Brave libraries, but not the Spring
Boot Brave auto-configuration module.

The compile and test classpaths were also generated and compared. Both had
204 entries; there were zero test-only and zero main-only entries. The
resolved tracing, Brave, actuator, observation, and Boot auto-configuration
jars listed above are therefore available on both classpaths. This is not a
missing test dependency distinction.

For documentation cross-check, Spring Boot documentation identifies Actuator
as providing Micrometer Tracing dependency management/auto-configuration, and
the Boot 4.1 Brave auto-configuration source is conditioned on Brave plus the
Micrometer Brave bridge. The Boot BOM/source index identifies
`spring-boot-micrometer-tracing-brave` as the Boot Brave module. Context7
source: Spring Boot `/spring-projects/spring-boot`, tracing and
`BraveAutoConfiguration` documentation/source excerpts queried on
2026-08-25.

### Configuration and test-source evidence

`backend/src/main/resources/application.yml` contains the requested settings:

```yaml
management:
  observations:
    annotations:
      enabled: true
  tracing:
    export:
      enabled: true
    propagation:
      type: B3
    sampling:
      probability: 0.7
```

The same file enables tracing baggage/correlation at lines 112–121. The only
matching test configuration is
`backend/src/test/resources/application-default.yml`, which overrides only
`management.tracing.sampling.probability` to `1.0` (lines 25–28); it does not
disable tracing or observations. The requested searches found no
`management.tracing`, `management.observations`, `tracing.enabled`, or
`observations.enabled` disabling property elsewhere under
`backend/src/test/resources`.

The all-test-Java search found no `@TestPropertySource`, no
`@EnableAutoConfiguration(exclude)`, no `spring.autoconfigure.exclude`, and no
test `management.*` property. The only `@DynamicPropertySource` is in
`AbstractTestContainerIntegrationTest`, where it overrides the PostgreSQL
datasource URL, username, and password. It does not alter observability.

### B3 handling evidence

The whole-backend search found B3 handling in
`backend/src/main/java/ca/bc/gov/nrs/hrs/provider/forwarders/B3HeaderForwarder.java`
and its unit test. `B3HeaderForwarder` reads the current Micrometer span and
adds `X-B3-TraceId` and `X-B3-SpanId` to outgoing `ClientHttpRequest`s. No
`Propagation.B3`, `B3Propagation`, or `Propagator` implementation/configuration
was found in application Java code. The only other B3 matches are
application YAML CORS/header/logging references and the temporary diagnostic
test's request headers. Thus the application code's explicit B3 handling is
outbound forwarding only; inbound extraction is expected from framework
auto-configuration, not from this forwarder.

### Classification

**Corrected classification: classpath dependency evidence was real but not
causal.** The actuator, Micrometer observation/tracing APIs, Micrometer Brave
bridge, and Brave runtime artifacts are resolved on both main and test
classpaths. However, `@SpringBootTest` deliberately stubs reporting tracing
components; the no-op tracer and absent propagator were therefore the expected
test-context behavior, not evidence that the resolved runtime dependency set
was the cause of the failed correlation assertion. Spring Boot's official
documentation says to add `@AutoConfigureTracing` when reporting tracing
components are needed in a `@SpringBootTest` integration test:
<https://docs.spring.io/spring-boot/4.1/reference/testing/spring-boot-applications.html#testing.spring-boot-applications.tracing>.
Context7 confirmed the same Boot 4.1 documentation and the annotation's exact
API/package, `org.springframework.boot.micrometer.tracing.test.autoconfigure.AutoConfigureTracing`.
The earlier `(4) missing autoconfiguration prerequisite` conclusion is
withdrawn and must not be treated as settled fact.

## Fix: `@AutoConfigureTracing`

The test now uses the exact Boot 4.1 annotation and import:

```java
import org.springframework.boot.micrometer.tracing.test.autoconfigure.AutoConfigureTracing;

@AutoConfigureTracing
```

This is a test-only change. The annotation is supplied by the
`org.springframework.boot:spring-boot-micrometer-tracing-test:4.1.0` artifact
in the Boot 4.1 test module. It is declared in `backend/pom.xml` with no
explicit version and `test` scope; the Boot parent/BOM resolves it to 4.1.0.
The artifact was absent from the original resolved classpath and is now
present as a direct test dependency. No main/production dependency was
changed.

Official documentation: [Using Tracing in Spring Boot tests](https://docs.spring.io/spring-boot/4.1/reference/testing/spring-boot-applications.html#testing.spring-boot-applications.tracing).
Context7 source: [Spring Boot 4.1.0 testing documentation](https://github.com/spring-projects/spring-boot/blob/v4.1.0/documentation/spring-boot-docs/src/docs/antora/modules/reference/pages/testing/spring-boot-applications.adoc), queried 2026-08-25.

### Verification

Before applying the dependency and annotation, the required isolated command
was run from `backend/` and failed only because `correlation_id` was `NULL`:

```text
./mvnw test -Dtest=DistrictVolumeCorrelationIdAuditIntegrationTest -P all-tests
Tests run: 1, Failures: 1, Errors: 0, Skipped: 0
expected: "0123456789abcdef0123456789abcdef" but was: null
```

The artifact/classpath check showed that the annotation artifact was not
available transitively. After adding the permitted test-scope dependency, the
annotation compiled and the isolated test passed:

```text
./mvnw test -Dtest=DistrictVolumeCorrelationIdAuditIntegrationTest -P all-tests
Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
asserted correlation_id = 0123456789abcdef0123456789abcdef
```

Full verification also passed:

```text
./mvnw verify -P all-tests
Tests run: 123, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
All coverage checks have been met.
```

**Final verdict:** `@AutoConfigureTracing` is the required Boot 4.1 test
configuration. With the managed `spring-boot-micrometer-tracing-test:4.1.0`
test dependency, the web integration test compiles and confirms that the
supplied B3 trace ID is persisted as the audit event `correlation_id`.
