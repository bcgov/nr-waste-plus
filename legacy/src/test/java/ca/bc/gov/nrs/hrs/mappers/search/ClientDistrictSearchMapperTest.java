package ca.bc.gov.nrs.hrs.mappers.search;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ClientDistrictSearchMapperTest {

  @Test
  void returnsNullForNullProjection() {
    assertThat(new ClientDistrictSearchMapperImpl().fromProjection(null)).isNull();
  }
}
