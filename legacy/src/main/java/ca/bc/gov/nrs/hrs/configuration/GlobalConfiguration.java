package ca.bc.gov.nrs.hrs.configuration;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitDetailsDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.entity.codes.OrgUnitEntity;
import ca.bc.gov.nrs.hrs.entity.reportingunit.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.exception.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.aot.hint.annotation.RegisterReflectionForBinding;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

/**
 * Global Spring configuration for the application.
 *
 * <p>This configuration class registers shared application infrastructure,
 * including a Jackson {@link ObjectMapper}, a fallback
 * {@link GlobalExceptionHandler} bean, and reflection hints required for
 * native-image builds via {@code @RegisterReflectionForBinding}.
 *
 * @since 1.0.0
 */
@Configuration
@RegisterReflectionForBinding({
    CodeDescriptionDto.class,
    OrgUnitEntity.class,
    ReportingUnitSearchParametersDto.class,
    ReportingUnitSearchResultDto.class,
    ReportingUnitEntity.class,
    ReportingUnitDetailsDto.class
})
public class GlobalConfiguration {

  /**
   * Provides the application's Jackson {@link ObjectMapper} instance.
   *
   * <p>The {@link Jackson2ObjectMapperBuilder} is used to construct and configure the
   * {@code ObjectMapper} according to any customizations applied to the builder elsewhere in the
   * application context.
   *
   * @param builder the Jackson builder used to create the mapper
   * @return a configured {@link ObjectMapper}
   */
  @Bean
  public ObjectMapper objectMapper(Jackson2ObjectMapperBuilder builder) {
    return builder.build();
  }

  /**
   * Registers a {@link GlobalExceptionHandler} bean if one is not already
   * present in the application context. The handler is normally auto-discovered
   * via {@code @RestControllerAdvice}; this bean provides an explicit
   * registration fallback for environments where component scanning is limited.
   */
  @Bean
  @ConditionalOnMissingBean(GlobalExceptionHandler.class)
  public GlobalExceptionHandler globalExceptionHandler() {
    return new GlobalExceptionHandler();
  }
}