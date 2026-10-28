package ca.bc.gov.nrs.hrs.service.reliability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.entity.reliability.IdempotencyRecordEntity;
import ca.bc.gov.nrs.hrs.exception.GlobalExceptionHandler;
import ca.bc.gov.nrs.hrs.repository.reliability.IdempotencyRecordRepository;
import java.net.URI;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@DisplayName("Idempotency interceptor")
class IdempotencyInterceptorTest {

  private MockMvc mockMvc;
  private TestIdempotencyRecordRepository repository;
  private TestMutationController controller;

  @BeforeEach
  void setUp() {
    SecurityContextHolder.clearContext();
    CURRENT_TX.remove();
    repository = new TestIdempotencyRecordRepository();
    controller = new TestMutationController();
    TestTransactionManager txManager = new TestTransactionManager(repository, controller);
    IdempotencyService service = new IdempotencyService(repository);
    IdempotencyInterceptor interceptor = new IdempotencyInterceptor(service, txManager);

    mockMvc = MockMvcBuilders.standaloneSetup(controller)
        .addFilters(interceptor)
        .setControllerAdvice(new GlobalExceptionHandler())
        .build();
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
    CURRENT_TX.remove();
  }

  @Test
  @DisplayName("first request claims key, completes mutation, and records snapshot")
  void shouldCompleteFirstRequest() throws Exception {
    String key = UUID.randomUUID().toString();
    String body = "{\"name\": \"alpha\", \"quantity\": 5}";

    mockMvc.perform(post("/api/test-mutation")
            .header("Idempotency-Key", key)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("MUTATED"))
        .andExpect(jsonPath("$.count").value(1));

    assertThat(controller.mutationCount.get()).isEqualTo(1);

    Optional<IdempotencyRecordEntity> saved = repository.findByIdempotencyKey(key);
    assertThat(saved).isPresent();
    assertThat(saved.get().getStatus()).isEqualTo(IdempotencyService.STATUS_COMPLETED);
    assertThat(saved.get().getResponseStatus()).isEqualTo(200);
    assertThat(saved.get().getResponseSnapshot()).isNotNull();
    assertThat(saved.get().getResponseSnapshot().get("status").asText()).isEqualTo("MUTATED");
  }

  @Test
  @DisplayName("retry with same key and matching fingerprint replays cached response verbatim")
  void shouldReplayCompletedResponseOnRetry() throws Exception {
    String key = UUID.randomUUID().toString();
    String body = "{\"name\": \"alpha\", \"quantity\": 5}";

    // First request
    mockMvc.perform(post("/api/test-mutation")
            .header("Idempotency-Key", key)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.count").value(1));

    assertThat(controller.mutationCount.get()).isEqualTo(1);

    // Second request: retry with identical payload and key
    mockMvc.perform(post("/api/test-mutation")
            .header("Idempotency-Key", key)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("MUTATED"))
        .andExpect(jsonPath("$.count").value(1));

    // Assert mutation count did NOT increase
    assertThat(controller.mutationCount.get()).isEqualTo(1);
  }

  @Test
  @DisplayName("replays 201 Created and restores original Location response header")
  void shouldRestoreLocationHeaderOnCreatedResponseReplay() throws Exception {
    String key = UUID.randomUUID().toString();

    // First request creating resource
    mockMvc.perform(post("/api/test-mutation/created")
            .header("Idempotency-Key", key))
        .andExpect(status().isCreated())
        .andExpect(header().string("Location", "/api/test-resources/1"))
        .andExpect(content().string(""));

    assertThat(controller.mutationCount.get()).isEqualTo(1);

    // Replay with identical key
    mockMvc.perform(post("/api/test-mutation/created")
            .header("Idempotency-Key", key))
        .andExpect(status().isCreated())
        .andExpect(header().string("Location", "/api/test-resources/1"))
        .andExpect(content().string(""));

    // Mutation should not execute again
    assertThat(controller.mutationCount.get()).isEqualTo(1);
  }

  @Test
  @DisplayName("rejects replay by a different authenticated caller with 403 forbidden")
  void shouldRejectReplayByDifferentCaller() throws Exception {
    String key = UUID.randomUUID().toString();
    String body = "{\"name\": \"shared-action\"}";

    // Caller A performs the mutation
    SecurityContextHolder.getContext().setAuthentication(
        new UsernamePasswordAuthenticationToken("caller-A", "n/a", List.of()));

    mockMvc.perform(post("/api/test-mutation")
            .header("Idempotency-Key", key)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.count").value(1));

    assertThat(controller.mutationCount.get()).isEqualTo(1);

    // Caller B attempts to replay Caller A's idempotency key
    SecurityContextHolder.getContext().setAuthentication(
        new UsernamePasswordAuthenticationToken("caller-B", "n/a", List.of()));

    mockMvc.perform(post("/api/test-mutation")
            .header("Idempotency-Key", key)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
        .andExpect(status().isForbidden())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.title").value("Forbidden"))
        .andExpect(jsonPath("$.detail").value(
            "Caller is not authorized to replay or claim this idempotency key."));

    assertThat(controller.mutationCount.get()).isEqualTo(1);
  }

  @Test
  @DisplayName("retry with same key but different payload returns 409 conflict")
  void shouldReturn409OnFingerprintMismatch() throws Exception {
    String key = UUID.randomUUID().toString();
    String body1 = "{\"name\": \"alpha\", \"quantity\": 5}";
    String body2 = "{\"name\": \"beta\", \"quantity\": 99}";

    mockMvc.perform(post("/api/test-mutation")
            .header("Idempotency-Key", key)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body1))
        .andExpect(status().isOk());

    assertThat(controller.mutationCount.get()).isEqualTo(1);

    mockMvc.perform(post("/api/test-mutation")
            .header("Idempotency-Key", key)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body2))
        .andExpect(status().isConflict())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.title").value("Idempotency Conflict"))
        .andExpect(jsonPath("$.detail").value(
            "Idempotency key '" + key
                + "' has already been used with a different request payload."));

    assertThat(controller.mutationCount.get()).isEqualTo(1);
  }

  @Test
  @DisplayName("concurrent duplicate request while IN_PROGRESS returns 409 conflict")
  void shouldReturn409WhileInProgress() throws Exception {
    String key = UUID.randomUUID().toString();
    String body = "{\"name\": \"alpha\", \"quantity\": 5}";

    // Simulate an in-progress record in the repository
    IdempotencyRecordEntity inProgressRecord = new IdempotencyRecordEntity();
    inProgressRecord.setIdempotencyKey(key);
    inProgressRecord.setRequestFingerprint(
        IdempotencyFingerprinter.computeFingerprint(
            new org.springframework.mock.web.MockHttpServletRequest("POST", "/api/test-mutation"),
            body.getBytes()));
    inProgressRecord.setStatus(IdempotencyService.STATUS_IN_PROGRESS);
    repository.save(inProgressRecord);

    mockMvc.perform(post("/api/test-mutation")
            .header("Idempotency-Key", key)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
        .andExpect(status().isConflict())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.title").value("Idempotency Conflict"))
        .andExpect(jsonPath("$.detail").value(
            "A request with idempotency key '" + key + "' is currently in progress."));

    assertThat(controller.mutationCount.get()).isEqualTo(0);
  }

  @Test
  @DisplayName("requests without Idempotency-Key header proceed without interception")
  void shouldPassThroughWithoutHeader() throws Exception {
    String body = "{\"name\": \"gamma\"}";

    mockMvc.perform(post("/api/test-mutation")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.count").value(1));

    assertThat(controller.mutationCount.get()).isEqualTo(1);
    assertThat(repository.records).isEmpty();
  }

  @Test
  @DisplayName("GET requests ignore Idempotency-Key header and proceed normally")
  void shouldIgnoreIdempotencyKeyOnGet() throws Exception {
    String key = UUID.randomUUID().toString();

    mockMvc.perform(get("/api/test-mutation")
            .header("Idempotency-Key", key))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.method").value("GET"));

    assertThat(repository.records).isEmpty();
  }

  @Test
  @DisplayName("rejects key longer than 256 characters with 400 Bad Request")
  void shouldRejectOversizedKey() throws Exception {
    String oversizedKey = "a".repeat(257);

    mockMvc.perform(post("/api/test-mutation")
            .header("Idempotency-Key", oversizedKey)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
        .andExpect(status().isBadRequest())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.detail").value(
            "Idempotency-Key header length must not exceed 256 characters."));

    assertThat(controller.mutationCount.get()).isEqualTo(0);
  }

  @Test
  @DisplayName("releases key on downstream failure so subsequent retry can succeed")
  void shouldReleaseKeyOnDownstreamFailure() throws Exception {
    String key = UUID.randomUUID().toString();
    String body = "{\"name\": \"fail\"}";

    // First attempt fails with 500 error
    mockMvc.perform(post("/api/test-mutation?fail=true")
            .header("Idempotency-Key", key)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
        .andExpect(status().isInternalServerError());

    // Record should be released (deleted)
    assertThat(repository.findByIdempotencyKey(key)).isEmpty();

    // Subsequent retry should succeed
    mockMvc.perform(post("/api/test-mutation?fail=false")
            .header("Idempotency-Key", key)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
        .andExpect(status().isOk());

    assertThat(controller.mutationCount.get()).isEqualTo(1);
    assertThat(repository.findByIdempotencyKey(key)).isPresent();
    assertThat(repository.findByIdempotencyKey(key).get().getStatus())
        .isEqualTo(IdempotencyService.STATUS_COMPLETED);
  }

  @Test
  @DisplayName("race condition: concurrent duplicates execute mutation exactly once")
  void shouldHandleConcurrentRaceCondition() throws Exception {
    String key = UUID.randomUUID().toString();
    String body = "{\"name\": \"concurrent\"}";

    int concurrency = 8;
    ExecutorService executor = Executors.newFixedThreadPool(concurrency);
    CountDownLatch startLatch = new CountDownLatch(1);
    List<Future<MvcResult>> futures = new ArrayList<>();

    for (int i = 0; i < concurrency; i++) {
      futures.add(executor.submit(() -> {
        startLatch.await();
        return mockMvc.perform(post("/api/test-mutation?delayMs=50")
                .header("Idempotency-Key", key)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andReturn();
      }));
    }

    startLatch.countDown();

    int successCount = 0;
    int conflictCount = 0;

    for (Future<MvcResult> future : futures) {
      MvcResult result = future.get();
      int status = result.getResponse().getStatus();
      if (status == 200) {
        successCount++;
      } else if (status == 409) {
        conflictCount++;
      }
    }

    executor.shutdown();

    // Mutation occurred exactly once!
    assertThat(controller.mutationCount.get()).isEqualTo(1);
    assertThat(successCount).isGreaterThanOrEqualTo(1);
    assertThat(successCount + conflictCount).isEqualTo(concurrency);
  }

  @Test
  @DisplayName("rolls back business mutation if snapshot persistence or completion fails")
  void shouldRollbackMutationWhenCompletionFails() throws Exception {
    String key = UUID.randomUUID().toString();
    String body = "{\"name\": \"fail-snapshot\"}";

    repository.failOnComplete = true;

    mockMvc.perform(post("/api/test-mutation")
            .header("Idempotency-Key", key)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
        .andExpect(status().isInternalServerError());

    // Both the business mutation AND the idempotency claim must be rolled back atomically
    assertThat(controller.mutationCount.get()).isEqualTo(0);
    assertThat(repository.findByIdempotencyKey(key)).isEmpty();
  }

  static class TxContext {
    final List<String> insertedKeys = new ArrayList<>();
    final Map<String, IdempotencyRecordEntity> previousStates = new HashMap<>();
    boolean mutated = false;
  }

  static final ThreadLocal<TxContext> CURRENT_TX = new ThreadLocal<>();

  static class TestTransactionManager extends AbstractPlatformTransactionManager {

    private final TestIdempotencyRecordRepository repository;
    private final TestMutationController controller;

    TestTransactionManager(
        TestIdempotencyRecordRepository repository,
        TestMutationController controller) {
      this.repository = repository;
      this.controller = controller;
    }

    @Override
    protected Object doGetTransaction() {
      TxContext context = CURRENT_TX.get();
      if (context == null) {
        context = new TxContext();
      }
      return context;
    }

    @Override
    protected void doBegin(Object transaction, TransactionDefinition definition) {
      CURRENT_TX.set((TxContext) transaction);
    }

    @Override
    protected void doCommit(DefaultTransactionStatus status) {
      CURRENT_TX.remove();
    }

    @Override
    protected void doRollback(DefaultTransactionStatus status) {
      TxContext context = (TxContext) status.getTransaction();
      for (String key : context.insertedKeys) {
        repository.records.remove(key);
      }
      context.previousStates.forEach(repository.records::put);
      if (context.mutated) {
        controller.mutationCount.decrementAndGet();
      }
      CURRENT_TX.remove();
    }

    @Override
    protected void doCleanupAfterCompletion(Object transaction) {
      CURRENT_TX.remove();
    }
  }

  @RestController
  @RequestMapping("/api/test-mutation")
  static class TestMutationController {

    final AtomicInteger mutationCount = new AtomicInteger(0);

    @PostMapping
    public ResponseEntity<Map<String, Object>> mutate(
        @RequestBody Map<String, Object> body,
        @RequestParam(defaultValue = "false") boolean fail,
        @RequestParam(defaultValue = "0") int delayMs) throws InterruptedException {

      if (delayMs > 0) {
        Thread.sleep(delayMs);
      }
      if (fail) {
        throw new RuntimeException("Simulated mutation failure");
      }

      int count = mutationCount.incrementAndGet();
      TxContext tx = CURRENT_TX.get();
      if (tx != null) {
        tx.mutated = true;
      }
      return ResponseEntity.ok(Map.of(
          "status", "MUTATED",
          "count", count,
          "payload", body));
    }

    @PostMapping("/created")
    public ResponseEntity<Void> createResource() {
      int count = mutationCount.incrementAndGet();
      TxContext tx = CURRENT_TX.get();
      if (tx != null) {
        tx.mutated = true;
      }
      return ResponseEntity.created(URI.create("/api/test-resources/" + count)).build();
    }

    @GetMapping
    public ResponseEntity<Map<String, String>> getMethod() {
      return ResponseEntity.ok(Map.of("method", "GET"));
    }
  }

  static class TestIdempotencyRecordRepository implements IdempotencyRecordRepository {

    final Map<String, IdempotencyRecordEntity> records = new ConcurrentHashMap<>();
    volatile boolean failOnComplete = false;

    @Override
    public synchronized IdempotencyRecordEntity save(IdempotencyRecordEntity entity) {
      if (failOnComplete && IdempotencyService.STATUS_COMPLETED.equals(entity.getStatus())) {
        throw new RuntimeException("Simulated snapshot persistence failure");
      }
      String key = entity.getIdempotencyKey();
      IdempotencyRecordEntity existing = records.get(key);
      if (existing != null && existing != entity) {
        // Enforce unique key constraint
        throw new org.springframework.dao.DataIntegrityViolationException(
            "Duplicate idempotency key: " + key);
      }
      TxContext tx = CURRENT_TX.get();
      if (tx != null) {
        if (existing == null) {
          tx.insertedKeys.add(key);
        } else if (!tx.previousStates.containsKey(key)) {
          IdempotencyRecordEntity clone = new IdempotencyRecordEntity();
          clone.setId(existing.getId());
          clone.setIdempotencyKey(existing.getIdempotencyKey());
          clone.setRequestFingerprint(existing.getRequestFingerprint());
          clone.setStatus(existing.getStatus());
          clone.setResponseStatus(existing.getResponseStatus());
          clone.setResponseSnapshot(existing.getResponseSnapshot());
          clone.setCreatedBy(existing.getCreatedBy());
          clone.setUpdatedBy(existing.getUpdatedBy());
          tx.previousStates.put(key, clone);
        }
      }
      records.put(key, entity);
      return entity;
    }

    @Override
    public Optional<IdempotencyRecordEntity> findById(Long id) {
      return records.values().stream().filter(r -> id.equals(r.getId())).findFirst();
    }

    @Override
    public Optional<IdempotencyRecordEntity> findByIdempotencyKey(String idempotencyKey) {
      return Optional.ofNullable(records.get(idempotencyKey));
    }

    @Override
    public synchronized void delete(IdempotencyRecordEntity entity) {
      if (entity != null && entity.getIdempotencyKey() != null) {
        records.remove(entity.getIdempotencyKey());
      }
    }

    @Override
    public synchronized void deleteByIdempotencyKey(String idempotencyKey) {
      records.remove(idempotencyKey);
    }
  }
}

