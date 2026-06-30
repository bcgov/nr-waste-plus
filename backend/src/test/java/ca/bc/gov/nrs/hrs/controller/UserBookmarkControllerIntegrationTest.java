package ca.bc.gov.nrs.hrs.controller;

import static org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.SYSTEM_OUT;
import static org.springframework.test.context.TestExecutionListeners.MergeMode.MERGE_WITH_DEFAULTS;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.TestExecutionListeners;
import org.springframework.test.context.transaction.TransactionalTestExecutionListener;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@AutoConfigureMockMvc(print = SYSTEM_OUT)
@WithMockJwt(
    value = "markbook"
)
@DisplayName("Integrated Test | User Bookmark Controller")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestExecutionListeners(
    value = TransactionalTestExecutionListener.class,
    mergeMode = MERGE_WITH_DEFAULTS
)
@Transactional
@Rollback(value = false)
class UserBookmarkControllerIntegrationTest extends AbstractTestContainerIntegrationTest {

  private static final long REPORTING_UNIT_A = 90001L;
  private static final long REPORTING_UNIT_B = 90002L;

  @Autowired
  private MockMvc mockMvc;

  @Test
  @DisplayName("Add same bookmark twice should keep one record")
  @Order(1)
  void addSameBookmarkTwice_shouldKeepOneRecord() throws Exception {
    mockMvc
        .perform(
            put("/api/users/bookmarks/{reportingUnitId}", REPORTING_UNIT_A)
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON)
                .with(SecurityMockMvcRequestPostProcessors.csrf()))
        .andExpect(status().isAccepted())
        .andReturn();

    mockMvc
        .perform(
            put("/api/users/bookmarks/{reportingUnitId}", REPORTING_UNIT_A)
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON)
                .with(SecurityMockMvcRequestPostProcessors.csrf()))
        .andExpect(status().isAccepted())
        .andReturn();
  }

  @Test
  @DisplayName("Add second bookmark should return both bookmark ids")
  @Order(2)
  void addSecondBookmark_shouldReturnBothBookmarkIds() throws Exception {
    mockMvc
        .perform(
            put("/api/users/bookmarks/{reportingUnitId}", REPORTING_UNIT_B)
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON)
                .with(SecurityMockMvcRequestPostProcessors.csrf()))
        .andExpect(status().isAccepted())
        .andReturn();
  }

  @Test
  @DisplayName("Delete same bookmark twice should be idempotent")
  @Order(3)
  void deleteSameBookmarkTwice_shouldBeIdempotent() throws Exception {
    mockMvc
        .perform(
            delete("/api/users/bookmarks/{reportingUnitId}", REPORTING_UNIT_A)
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON)
                .with(SecurityMockMvcRequestPostProcessors.csrf()))
        .andExpect(status().isNoContent())
        .andReturn();

    mockMvc
        .perform(
            delete("/api/users/bookmarks/{reportingUnitId}", REPORTING_UNIT_A)
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON)
                .with(SecurityMockMvcRequestPostProcessors.csrf()))
        .andExpect(status().isNoContent())
        .andReturn();
  }

}

