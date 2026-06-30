package ca.bc.gov.nrs.hrs.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
@WithMockJwt(value = "concurrent-user")
@DisplayName("Integrated Test | User Preference Concurrency")
class UserPreferenceConcurrencyIT extends AbstractTestContainerIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  @DisplayName("Concurrent updates should succeed due to retry mechanism")
  void concurrentUpdates_shouldSucceed() throws Exception {
    String preferencesJson1 = "{\"theme\": \"dark\"}";
    String preferencesJson2 = "{\"theme\": \"light\"}";

    ExecutorService executor = Executors.newFixedThreadPool(2);

    CompletableFuture<Void> task1 = CompletableFuture.runAsync(() -> {
      try {
        mockMvc.perform(put("/api/users/preferences")
            .contentType(MediaType.APPLICATION_JSON)
            .content(preferencesJson1)
            .with(SecurityMockMvcRequestPostProcessors.csrf()))
            .andExpect(status().isAccepted());
      } catch (Exception e) {
        throw new RuntimeException(e);
      }
    }, executor);

    CompletableFuture<Void> task2 = CompletableFuture.runAsync(() -> {
      try {
        mockMvc.perform(put("/api/users/preferences")
            .contentType(MediaType.APPLICATION_JSON)
            .content(preferencesJson2)
            .with(SecurityMockMvcRequestPostProcessors.csrf()))
            .andExpect(status().isAccepted());
      } catch (Exception e) {
        throw new RuntimeException(e);
      }
    }, executor);

    CompletableFuture.allOf(task1, task2).join();
    executor.shutdown();
  }
}
