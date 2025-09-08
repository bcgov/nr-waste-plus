package ca.bc.gov.nrs.hrs.configuration;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.base.CodeNameDto;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientAutocompleteResultDto;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientDto;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientLocationDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.entity.users.UserPreferenceEntity;
import ca.bc.gov.nrs.hrs.exception.ForestClientNotFoundException;
import ca.bc.gov.nrs.hrs.exception.NotFoundGenericException;
import ca.bc.gov.nrs.hrs.exception.RequestException;
import ca.bc.gov.nrs.hrs.exception.RetriableException;
import ca.bc.gov.nrs.hrs.exception.TooManyRequestsException;
import ca.bc.gov.nrs.hrs.exception.UnretriableException;
import ca.bc.gov.nrs.hrs.exception.UserNotFoundException;
import ca.bc.gov.nrs.hrs.security.JwtForwarderRequestInitializer;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.aot.hint.annotation.RegisterReflectionForBinding;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import org.springframework.web.client.RestClient;

@Configuration
@RegisterReflectionForBinding({
    ForestClientAutocompleteResultDto.class,
    ForestClientDto.class,
    ForestClientLocationDto.class,
    CodeDescriptionDto.class,
    CodeNameDto.class,
    UserPreferenceEntity.class,
    ForestClientNotFoundException.class,
    NotFoundGenericException.class,
    RequestException.class,
    RetriableException.class,
    TooManyRequestsException.class,
    UnretriableException.class,
    UserNotFoundException.class,
    ReportingUnitSearchResultDto.class,
    ReportingUnitSearchParametersDto.class
})
@EnableJpaAuditing(auditorAwareRef = "databaseAuditor")
public class GlobalConfiguration {

  @Bean
  public RestClient forestClientApi(HrsConfiguration configuration) {
    return RestClient
        .builder()
        .baseUrl(configuration.getForestClientApi().getAddress())
        .defaultHeader("X-API-KEY", configuration.getForestClientApi().getKey())
        .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
        .build();
  }

  @Bean
  public RestClient legacyApi(
      HrsConfiguration configuration,
      JwtForwarderRequestInitializer jwtForwarder
  ) {
    return RestClient
        .builder()
        .baseUrl(configuration.getLegacyApi().getAddress())
        .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
        .requestInitializer(jwtForwarder)
        .build();
  }

  @Bean
  public ObjectMapper objectMapper(Jackson2ObjectMapperBuilder builder) {
    return builder.build();
  }

}
