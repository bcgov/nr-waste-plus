package ca.bc.gov.nrs.hrs.controller;

import static org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.SYSTEM_OUT;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.context.TestExecutionListeners.MergeMode.MERGE_WITH_DEFAULTS;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@AutoConfigureMockMvc(print = SYSTEM_OUT)
@WithMockJwt
@DisplayName("Integrated Test | User Controller")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestExecutionListeners(
    value = TransactionalTestExecutionListener.class,
    mergeMode = MERGE_WITH_DEFAULTS
)
@Transactional
@Rollback(value = false)
class UserControllerIntegrationTest extends AbstractTestContainerIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  @DisplayName("Get user preferences when none exist should return empty map")
  @Order(1)
  void getUserPreferences_whenNoneExist_shouldReturnEmptyMap() throws Exception {
    mockMvc
        .perform(
            get("/api/users/preferences")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .with(jwt().jwt(jwt))
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json"))
        .andExpect(jsonPath("$.length()").value(0))
        .andReturn();
  }

  @Test
  @DisplayName("User set the preferences with some data")
  @Order(2)
  void userSetThePreferencesWithSomeData() throws Exception {
    String preferencesJson = """
        {
          "theme": "dark",
          "notifications": true,
          "itemsPerPage": 20
        }""";

    mockMvc
        .perform(
            put("/api/users/preferences")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .content(preferencesJson)
                .accept(MediaType.APPLICATION_JSON)
                .with(jwt().jwt(jwt))
                .with(csrf()))
        .andExpect(status().isAccepted())
        .andReturn();
  }

  @Test
  @DisplayName("Get user preferences after setting them should return the set preferences")
  @Order(3)
  void getUserPreferences_afterSettingThem_shouldReturnTheSetPreferences() throws Exception {
    mockMvc
        .perform(
            get("/api/users/preferences")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .with(jwt().jwt(jwt))
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json"))
        .andExpect(jsonPath("$.theme").value("dark"))
        .andExpect(jsonPath("$.notifications").value(true))
        .andExpect(jsonPath("$.itemsPerPage").value(20))
        .andReturn();
  }

}