package ca.bc.gov.nrs.hrs.controller;

import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.dto.base.CodeNameDto;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WiremockLogNotifier;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.retry.RetryRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
@WithMockJwt
@DisplayName("Integrated Test | Codes Controller")
class CodesControllerIntegrationTest extends AbstractTestContainerIntegrationTest {

  @RegisterExtension
  static WireMockExtension clientApiStub =
      WireMockExtension.newInstance()
          .options(
              wireMockConfig()
                  .port(10001)
                  .notifier(new WiremockLogNotifier())
                  .asynchronousResponseEnabled(true)
                  .stubRequestLoggingDisabled(false))
          .configureStaticDsl(true)
          .build();

  @Autowired
  private MockMvc mockMvc;
  @Autowired
  private CircuitBreakerRegistry circuitBreakerRegistry;
  @Autowired
  private RetryRegistry retryRegistry;

  @BeforeEach
  public void setUp(){
    clientApiStub.resetAll();

    CircuitBreaker breaker = circuitBreakerRegistry.circuitBreaker("breaker");
    breaker.reset();
    RetryConfig retry = retryRegistry.retry("apiRetry").getRetryConfig();
    retryRegistry.remove("apiRetry");
    retryRegistry.retry("apiRetry", retry);
  }

  @Test
  @DisplayName("Get districts happy Path should Succeed")
  void getOpeningCategories_happyPath_shouldSucceed() throws Exception {
    CodeNameDto category = new CodeNameDto("DMH",
        "100 Mile House Natural Resource District");

    mockMvc
        .perform(
            get("/api/codes/districts")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json"))
        .andExpect(jsonPath("$[0].code").value(category.code()))
        .andExpect(jsonPath("$[0].name").value(category.name()))
        .andReturn();
  }

}