package ca.bc.gov.nrs.hrs.provider;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpRequestInitializer;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JwtForwarderRequestInitializer implements ClientHttpRequestInitializer {

  @Override
  public void initialize(ClientHttpRequest request) {
    request.getHeaders()
        .add(HttpHeaders.AUTHORIZATION, String.format("Bearer %s", getToken()));
  }

  private String getToken() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

    if (authentication == null || !authentication.isAuthenticated()) {
      return null;
    }

    if (authentication instanceof JwtAuthenticationToken jwtAuth) {
      return jwtAuth.getToken().getTokenValue();
    }
    return null;
  }
}
