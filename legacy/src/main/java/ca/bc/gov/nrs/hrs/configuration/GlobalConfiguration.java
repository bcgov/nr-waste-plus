package ca.bc.gov.nrs.hrs.configuration;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.entity.codes.OrgUnitEntity;
import ca.bc.gov.nrs.hrs.entity.reportingunit.ReportingUnitEntity;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.aot.hint.annotation.RegisterReflectionForBinding;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

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
   * Provides the application's Jackson {@link ObjectMapper} instance.
   *
   * <p>The {@link Jackson2ObjectMapperBuilder} is used to construct and
   * configure the {@code ObjectMapper} according to any customizations applied to the builder
   * elsewhere in the application context.</p>
   *
   * @param builder the Jackson builder used to create the mapper
   * @return a configured {@link ObjectMapper}
   */
  @Bean
  public ObjectMapper objectMapper(Jackson2ObjectMapperBuilder builder) {
    return builder.build();
  }

}
