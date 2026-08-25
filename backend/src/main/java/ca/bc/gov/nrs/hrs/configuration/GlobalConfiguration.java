package ca.bc.gov.nrs.hrs.configuration;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.base.CodeNameDto;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientAutocompleteResultDto;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientDto;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientLocationDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.CoastDataDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.CoastDistrictRowDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.CoastSectionDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeCreateDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeDetailDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeListItemDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.InteriorDataDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.InteriorDistrictRowDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.InteriorZoneDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.SpeciesCompositionTableDataDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.TableDataDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitDetailsDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitLegacyDetailsDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.entity.speciescomposition.SpeciesCompositionRow;
import ca.bc.gov.nrs.hrs.entity.users.UserIdentityEntity;
import ca.bc.gov.nrs.hrs.entity.users.UserPreferenceEntity;
import ca.bc.gov.nrs.hrs.exception.ForestClientNotFoundException;
import ca.bc.gov.nrs.hrs.exception.GlobalExceptionHandler;
import ca.bc.gov.nrs.hrs.exception.NotFoundGenericException;
import ca.bc.gov.nrs.hrs.exception.RequestException;
import ca.bc.gov.nrs.hrs.exception.RetriableException;
import ca.bc.gov.nrs.hrs.exception.TooManyRequestsException;
import ca.bc.gov.nrs.hrs.exception.UnretriableException;
import ca.bc.gov.nrs.hrs.exception.UserNotFoundException;
import ca.bc.gov.nrs.hrs.provider.forwarders.B3HeaderForwarder;
import ca.bc.gov.nrs.hrs.provider.forwarders.JwtForwarderRequestInitializer;
import ca.bc.gov.nrs.hrs.security.CorrelationIdConnectionProvider;
import io.micrometer.tracing.Tracer;
import javax.sql.DataSource;
import org.hibernate.cfg.JdbcSettings;
import org.hibernate.engine.jdbc.connections.internal.DatasourceConnectionProviderImpl;
import org.springframework.aot.hint.annotation.RegisterReflectionForBinding;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.SerializationFeature;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.json.JsonMapper.Builder;

/**
 * Global Spring configuration for the application.
 *
 * <p>This configuration class registers several shared beans used across the application,
 * including REST clients for external services and a Jackson ObjectMapper. It also registers
 * reflection hints required for native image builds via {@code @RegisterReflectionForBinding}
 * and enables JPA auditing.</p>
 *
 * @since 1.0.0
 */
@Configuration
@RegisterReflectionForBinding({
    ForestClientAutocompleteResultDto.class,
    ForestClientDto.class,
    ForestClientLocationDto.class,
    CodeDescriptionDto.class,
    CodeNameDto.class,
    UserPreferenceEntity.class,
    UserIdentityEntity.class,
    ForestClientNotFoundException.class,
    NotFoundGenericException.class,
    RequestException.class,
    RetriableException.class,
    TooManyRequestsException.class,
    UnretriableException.class,
    UserNotFoundException.class,
    ReportingUnitSearchResultDto.class,
    ReportingUnitSearchParametersDto.class,
    HttpSecurity.class,
    ReportingUnitDetailsDto.class,
    ReportingUnitLegacyDetailsDto.class,
    DistrictVolumeCreateDto.class,
    DistrictVolumeDetailDto.class,
    DistrictVolumeListItemDto.class,
    TableDataDto.class,
    InteriorDataDto.class,
    InteriorZoneDto.class,
    InteriorDistrictRowDto.class,
    CoastDataDto.class,
    CoastSectionDto.class,
    CoastDistrictRowDto.class,
    SpeciesCompositionTableDataDto.class,
    SpeciesCompositionRow.class
})
@EnableJpaAuditing(auditorAwareRef = "databaseAuditor")
public class GlobalConfiguration {

  /**
   * Builds a {@link RestClient} configured to call the Cognito userInfo endpoint.
   *
   * <p>The base URL is set to the configured Cognito userInfo URI from
   * {@link HrsConfiguration}. B3 trace headers are forwarded to Cognito via
   * the supplied {@link B3HeaderForwarder}. No default Authorization header is
   * set here — each call supplies its own Bearer token.</p>
   *
   * @param configuration application configuration providing the Cognito userInfo URI
   * @param b3Header      request initializer that forwards B3 trace headers
   * @return a configured {@link RestClient} for the Cognito userInfo endpoint
   */
  @Bean
  public RestClient cognitoApi(
      HrsConfiguration configuration,
      B3HeaderForwarder b3Header
  ) {
    return RestClient.builder()
        .baseUrl(configuration.getCognito().getUserinfoUri())
        .requestInitializer(b3Header)
        .build();
  }

  /**
   * Builds a {@link RestClient} configured to call the Forest Client API.
   *
   * <p>The returned client is configured with the base URL and API key taken
   * from the supplied {@link HrsConfiguration}. It sets the Content-Type to
   * {@code application/json} and applies the provided {@link B3HeaderForwarder}
   * as a request initializer so tracing headers are forwarded to the backend.</p>
   *
   * @param configuration application configuration that provides the target service
   *                      address and API key
   * @param b3Header      request initializer that forwards B3 trace headers
   * @return a configured {@link RestClient} for the Forest Client API
   */
  @Bean
  public RestClient forestClientApi(
      HrsConfiguration configuration,
      B3HeaderForwarder b3Header
  ) {
    return RestClient.builder()
        .baseUrl(configuration.getForestClientApi().getAddress())
        .defaultHeader("X-API-KEY",
            configuration.getForestClientApi().getKey())
        .defaultHeader(HttpHeaders.CONTENT_TYPE,
            MediaType.APPLICATION_JSON_VALUE)
        .requestInitializer(b3Header)
        .build();
  }

  /**
   * Builds a {@link RestClient} configured to call legacy backend APIs.
   *
   * <p>This client uses the legacy API base address from {@link HrsConfiguration}
   * and sets the content type to {@code application/json}. It applies both the
   * {@link JwtForwarderRequestInitializer} and the {@link B3HeaderForwarder} as
   * request initializers so that JWT forwarding and tracing headers are propagated
   * to legacy services.</p>
   *
   * @param configuration application configuration that provides the legacy API address
   * @param jwtForwarder  request initializer which forwards JWT credentials
   * @param b3Header      request initializer that forwards B3 trace headers
   * @return a configured {@link RestClient} for legacy APIs
   */
  @Bean
  public RestClient legacyApi(
      HrsConfiguration configuration,
      JwtForwarderRequestInitializer jwtForwarder,
      B3HeaderForwarder b3Header
  ) {
    return RestClient.builder()
        .baseUrl(configuration.getLegacyApi().getAddress())
        .defaultHeader(HttpHeaders.CONTENT_TYPE,
            MediaType.APPLICATION_JSON_VALUE)
        .requestInitializer(jwtForwarder)
        .requestInitializer(b3Header)
        .build();
  }

  /**
   * Provides the application's Jackson {@link JsonMapper} instance.
   *
   * <p>The {@link JsonMapper.Builder} is used to construct and configure the mapper
   * according to any customizations applied elsewhere in the application context.</p>
   *
   * @param builder Jackson builder used to create the mapper
   * @return configured {@link JsonMapper}
   */
  @Bean
  public JsonMapper objectMapper(Builder builder) {
    return builder
        .disable(SerializationFeature.FAIL_ON_EMPTY_BEANS)
        .build();
  }

  /**
   * Explicitly register the global exception handler so it's available even when
   * component scanning is altered (for example in tests or native-image contexts).
   */
  @Bean
  @ConditionalOnMissingBean(GlobalExceptionHandler.class)
  public GlobalExceptionHandler globalExceptionHandler() {
    return new GlobalExceptionHandler();
  }

  /**
   * Customizes Hibernate properties to wrap the pooled {@link DataSource} in a
   * {@link CorrelationIdConnectionProvider} that sets {@code app.correlation_id}
   * transaction-scoped via {@code set_config(..., true)} from the current B3 span.
   *
   * <p>The delegate is a {@link DatasourceConnectionProviderImpl} bound to the
   * Hikari {@link DataSource}; {@link JdbcSettings#CONNECTION_PROVIDER} is set to the
   * decorating provider so every {@code getConnection()} propagates the trace id with
   * {@code SELECT set_config('app.correlation_id', ?, true)} (is_local = true).</p>
   *
   * @param dataSource the Hikari pooled data source
   * @param tracer Micrometer tracer providing the current span
   * @return a customizer that registers the decorating connection provider
   */
  @Bean
  @SuppressWarnings({"deprecation", "removal"})
  public HibernatePropertiesCustomizer correlationIdConnectionProviderCustomizer(
      DataSource dataSource, Tracer tracer) {
    return hibernateProperties -> {
      DatasourceConnectionProviderImpl delegate = new DatasourceConnectionProviderImpl();
      delegate.setDataSource(dataSource);
      CorrelationIdConnectionProvider provider = new CorrelationIdConnectionProvider(delegate, tracer);
      provider.configure(hibernateProperties);
      hibernateProperties.put(JdbcSettings.CONNECTION_PROVIDER, provider);
    };
  }

}
