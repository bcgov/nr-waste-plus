package ca.bc.gov.nrs.hrs;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

import ca.bc.gov.nrs.hrs.exception.RetriableException;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import io.github.resilience4j.core.functions.Either;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryRegistry;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpStatusCode;

@AutoConfigureMockMvc
@DisplayName("Integrated Test | App Context")
class BackendApplicationTests extends AbstractTestContainerIntegrationTest {

  @Autowired
  private RetryRegistry retryRegistry;

  @Test
  void contextLoads() {
    /* Is empty because we just wanna check if app load*/
  }


  @Test
  @DisplayName("Retry with backoff")
  void forestReadRetry_shouldHaveCustomIntervalFunction() {
    Retry retry = retryRegistry.retry("apiRetry");
    var intervalBiFunction = retry.getRetryConfig().getIntervalBiFunction();

    long firstWait = intervalBiFunction.apply(1,
        Either.left(new RetriableException(HttpStatusCode.valueOf(400), "Test")));
    long secondWait = intervalBiFunction.apply(2,
        Either.left(new RetriableException(HttpStatusCode.valueOf(400), "Test")));

    assertThat(firstWait).isGreaterThan(0);    // 500
    assertThat(secondWait).isGreaterThan(firstWait); // 1000
  }

}
