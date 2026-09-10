package ca.bc.gov.nrs.hrs.configuration;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitDetailsDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.entity.codes.OrgUnitEntity;
import ca.bc.gov.nrs.hrs.entity.reportingunit.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.exception.GlobalExceptionHandler;
import org.springframework.aot.hint.annotation.RegisterReflectionForBinding;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.json.JsonMapper.Builder;

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
   * Provides the application's Jackson {@link JsonMapper} instance.
   *
   * <p>The {@link JsonMapper.Builder} is used to construct and configure the mapper
   * according to any customizations applied elsewhere in the application context.</p>
   *
   * @param builder the Jackson builder used to create the mapper
   * @return a configured {@link JsonMapper}
   */
  @Bean
  public JsonMapper objectMapper(Builder builder) {
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