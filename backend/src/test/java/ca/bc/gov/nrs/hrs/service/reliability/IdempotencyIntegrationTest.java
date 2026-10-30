package ca.bc.gov.nrs.hrs.service.reliability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doCallRealMethod;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.entity.reliability.IdempotencyRecordEntity;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import ca.bc.gov.nrs.hrs.repository.reliability.IdempotencyRecordRepository;
import ca.bc.gov.nrs.hrs.service.UserService;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Real-database integration test for the {@link IdempotencyInterceptor} middleware.
 *
 * <p>Exercises PostgreSQL unique constraint collision and transaction rollback
 * against the Testcontainers database container via {@link AbstractTestContainerIntegrationTest}.
 */
@AutoConfigureMockMvc
@WithMockJwt(value = "idempotency-test-user")
@DisplayName("Integrated Test | Idempotency Interceptor Real Database")
class IdempotencyIntegrationTest extends AbstractTestContainerIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private IdempotencyRecordRepository idempotencyRecordRepository;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Autowired
  private TransactionTemplate transactionTemplate;

  @MockitoSpyBean
  private UserService userService;

  @AfterEach
  void cleanUp() {
    transactionTemplate.executeWithoutResult(
        txStatus -> jdbcTemplate.update("TRUNCATE wasteplus.idempotency_record CASCADE"));
    SecurityContextHolder.clearContext();
  }

  @Test
  @DisplayName("concurrent duplicate requests race PostgreSQL unique key and mutate exactly once")
  void concurrentRequests_shouldRacePostgreSqlUniqueKey_andMutateExactlyOnce()
      throws Exception {
    String idempotencyKey = UUID.randomUUID().toString();
    String payload = "{\"theme\": \"dark\", \"notifications\": true}";

    int concurrency = 6;
    CountDownLatch startLatch = new CountDownLatch(1);
    CountDownLatch inFlightLatch = new CountDownLatch(1);
    CountDownLatch releaseLatch = new CountDownLatch(1);

    doAnswer(
        invocation -> {
          inFlightLatch.countDown();
          releaseLatch.await(5, TimeUnit.SECONDS);
          return invocation.callRealMethod();
        })
        .when(userService)
        .saveUserPreferences(any(), any());

    SecurityContext securityContext = SecurityContextHolder.getContext();
    ExecutorService executor = Executors.newFixedThreadPool(concurrency);
    List<Future<MvcResult>> futures = new ArrayList<>();

    for (int i = 0; i < concurrency; i++) {
      futures.add(
          executor.submit(
              () -> {
                startLatch.await();
                SecurityContextHolder.setContext(securityContext);
                try {
                  return mockMvc
                      .perform(
                          put("/api/users/preferences")
                              .header("Idempotency-Key", idempotencyKey)
                              .contentType(MediaType.APPLICATION_JSON)
                              .content(payload)
                              .with(SecurityMockMvcRequestPostProcessors.csrf()))
                      .andReturn();
                } finally {
                  SecurityContextHolder.clearContext();
                }
              }));
    }

    startLatch.countDown();

    // Wait until the winning thread has claimed the key and entered the service method
    assertThat(inFlightLatch.await(5, TimeUnit.SECONDS)).isTrue();
    // Allow racing threads to hit the in-progress / unique constraint race in PostgreSQL
    Thread.sleep(200);
    // Release the winning thread to finish the mutation and commit the transaction
    releaseLatch.countDown();

    int successCount = 0;
    int conflictCount = 0;

    for (Future<MvcResult> future : futures) {
      MvcResult result = future.get(10, TimeUnit.SECONDS);
      int status = result.getResponse().getStatus();
      if (status == 202) {
        successCount++;
      } else if (status == 409) {
        conflictCount++;
      }
    }

    executor.shutdown();

    // The winning thread produces a 202; contenders arriving before commit receive a 409 conflict,
    // while contenders delayed past commit legitimately receive a replayed 202.
    assertThat(successCount).isGreaterThanOrEqualTo(1);
    assertThat(conflictCount).isGreaterThanOrEqualTo(1);
    assertThat(successCount + conflictCount).isEqualTo(concurrency);

    // Business mutation must have executed exactly once
    verify(userService, times(1)).saveUserPreferences(any(), any());

    // Completed record must exist in PostgreSQL
    Optional<IdempotencyRecordEntity> record =
        idempotencyRecordRepository.findByIdempotencyKey(idempotencyKey);
    assertThat(record).isPresent();
    assertThat(record.get().getStatus()).isEqualTo(IdempotencyService.STATUS_COMPLETED);
    assertThat(record.get().getResponseStatus()).isEqualTo(202);

    // Replay after completion returns the replayed response without executing the service again
    mockMvc
        .perform(
            put("/api/users/preferences")
                .header("Idempotency-Key", idempotencyKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload)
                .with(SecurityMockMvcRequestPostProcessors.csrf()))
        .andExpect(status().isAccepted());

    verify(userService, times(1)).saveUserPreferences(any(), any());
  }

  @Test
  @DisplayName("downstream transaction rollback in PostgreSQL releases key for safe retry")
  void downstreamFailure_shouldRollbackPostgreSqlRecord_andReleaseKeyForRetry()
      throws Exception {
    String idempotencyKey = UUID.randomUUID().toString();
    String payload = "{\"theme\": \"light\"}";

    doThrow(new RuntimeException("Simulated business failure"))
        .when(userService)
        .saveUserPreferences(any(), any());

    mockMvc
        .perform(
            put("/api/users/preferences")
                .header("Idempotency-Key", idempotencyKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload)
                .with(SecurityMockMvcRequestPostProcessors.csrf()))
        .andExpect(status().isInternalServerError())
        .andExpect(jsonPath("$.title").value("Internal Server Error"));

    // PostgreSQL transaction rollback must have undone the in-progress idempotency record
    assertThat(idempotencyRecordRepository.findByIdempotencyKey(idempotencyKey)).isEmpty();

    // Safe retry on released key succeeds
    doCallRealMethod().when(userService).saveUserPreferences(any(), any());

    mockMvc
        .perform(
            put("/api/users/preferences")
                .header("Idempotency-Key", idempotencyKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload)
                .with(SecurityMockMvcRequestPostProcessors.csrf()))
        .andExpect(status().isAccepted());

    Optional<IdempotencyRecordEntity> completed =
        idempotencyRecordRepository.findByIdempotencyKey(idempotencyKey);
    assertThat(completed).isPresent();
    assertThat(completed.get().getStatus()).isEqualTo(IdempotencyService.STATUS_COMPLETED);
  }
}

