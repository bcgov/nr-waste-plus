package ca.bc.gov.nrs.hrs.security;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpRequestInitializer;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JwtForwarderRequestInitializer implements ClientHttpRequestInitializer {

  private final LoggedUserHelper userHelper;

  @Override
  public void initialize(ClientHttpRequest request) {
      request.getHeaders()
          .add(HttpHeaders.AUTHORIZATION, String.format("Bearer %s", userHelper.getToken()));
  }
}
