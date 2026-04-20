package ca.bc.gov.nrs.hrs.security;

import ca.bc.gov.nrs.hrs.configuration.HrsConfiguration;
import ca.bc.gov.nrs.hrs.service.UserIdentityService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Servlet filter that hydrates the Spring Security context with a persisted
 * {@link ca.bc.gov.nrs.hrs.entity.users.UserIdentityEntity} for configured paths.
 *
 * <p>Runs after JWT validation. For matching paths it extracts the Cognito
 * {@code sub} and access token, delegates to {@link UserIdentityService} (DB first,
 * Cognito fallback) and replaces the principal with a
 * {@link UserIdentityAuthentication}. If lookup fails the original principal
 * is preserved so the request proceeds normally.</p>
 *
 * <p>Hydrated paths are configurable via
 * {@code ca.bc.gov.nrs.hydration.paths} in {@code application.yml}.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserIdentityHydrationFilter extends OncePerRequestFilter {

  private final UserIdentityService userIdentityService;
  private final HrsConfiguration configuration;

  @Override
  protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
    String path = request.getRequestURI();
    List<String> hydratedPaths = configuration.getHydration().getPaths();
    return hydratedPaths.stream().noneMatch(path::startsWith);
  }

  @Override
  protected void doFilterInternal(
      @NonNull HttpServletRequest request,
      @NonNull HttpServletResponse response,
      @NonNull FilterChain chain
  ) throws IOException, ServletException {

    Authentication auth = SecurityContextHolder.getContext().getAuthentication();

    if (auth instanceof JwtAuthenticationToken jwtAuth) {
      String sub = jwtAuth.getToken().getSubject();
      String accessToken = jwtAuth.getToken().getTokenValue();

      userIdentityService.getOrRefreshBySub(sub, accessToken)
          .ifPresentOrElse(
              identity -> {
                log.debug("Identity hydrated for sub={}", sub);
                UserIdentityAuthentication enriched = new UserIdentityAuthentication(
                    jwtAuth.getToken(),
                    jwtAuth.getAuthorities(),
                    identity
                );
                SecurityContextHolder.getContext().setAuthentication(enriched);
              },
              () -> log.warn("Could not hydrate identity for sub={}, proceeding without it", sub)
          );
    }

    chain.doFilter(request, response);
  }
}
