package ca.bc.gov.nrs.hrs.configuration;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.entity.codes.OrgUnitEntity;
import ca.bc.gov.nrs.hrs.entity.reportingunit.ReportingUnitEntity;
import org.springframework.aot.hint.annotation.RegisterReflectionForBinding;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.SerializationFeature;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.json.JsonMapper.Builder;

/**
 * Global Spring configuration for the application.
 *
 * <p>This configuration class registers several shared beans used across the
 * application, including REST clients for external services and a Jackson ObjectMapper. It also
 * registers reflection hints required for native image builds via
 * {@code @RegisterReflectionForBinding} and enables JPA auditing.
 * </p>
 *
 * @since 1.0.0
 */
@Configuration
@RegisterReflectionForBinding({
    CodeDescriptionDto.class,
    OrgUnitEntity.class,
    ReportingUnitSearchParametersDto.class,
    ReportingUnitSearchResultDto.class,
    ReportingUnitEntity.class
})
public class GlobalConfiguration {

  /**
   * Provides the application's Jackson {@link JsonMapper} instance.
   *
   * <p>The {@link JsonMapper.Builder} is used to construct and
   * configure the {@code JsonMapper} according to any customizations applied to the builder
   * elsewhere in the application context.</p>
   *
   * @param builder the Jackson builder used to create the mapper
   * @return a configured {@link JsonMapper}
   */
  @Bean
  public JsonMapper objectMapper(Builder builder) {
    return builder
        .disable(SerializationFeature.FAIL_ON_EMPTY_BEANS)
        .build();
  }

}
