package ca.bc.gov.nrs.hrs.controller;

import static org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.SYSTEM_OUT;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.transaction.annotation.Transactional;

@AutoConfigureMockMvc(print = SYSTEM_OUT)
@DisplayName("Integrated Test | Formula Set Controller")
@Transactional
class FormulaSetControllerIntegrationTest extends AbstractTestContainerIntegrationTest {

  @Autowired private MockMvc mockMvc;
  private final ObjectMapper objectMapper = new ObjectMapper();

  // ─── POST ──────────────────────────────────────────────────────────────

  @Test
  @DisplayName("Create returns 201 with location header")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void createReturnsCreatedWithLocation() throws Exception {
    Map<String, Object> body = Map.of(
        "area", "COASTAL",
        "startDate", LocalDate.now().plusDays(30).toString(),
        "formulas", new Object[]{
            Map.of("formulaKey", "da.mature.volume", "expression", "1 + 2", "sortOrder", 0)
        });

    mockMvc.perform(post("/api/configuration/formulas")
            .with(SecurityMockMvcRequestPostProcessors.csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)))
        .andExpect(status().isCreated())
        .andExpect(header().exists("Location"))
        .andExpect(jsonPath("$.area").value("COASTAL"))
        .andExpect(jsonPath("$.formulas.length()").value(1))
        .andExpect(jsonPath("$.formulas[0].formulaKey").value("da.mature.volume"));
  }

  @Test
  @DisplayName("Create rejects missing area")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void createRejectsMissingArea() throws Exception {
    Map<String, Object> body = Map.of(
        "startDate", LocalDate.now().plusDays(30).toString(),
        "formulas", new Object[]{
            Map.of("formulaKey", "da.x", "expression", "1", "sortOrder", 0)
        });

    mockMvc.perform(post("/api/configuration/formulas")
            .with(SecurityMockMvcRequestPostProcessors.csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("Create rejects missing startDate")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void createRejectsMissingStartDate() throws Exception {
    Map<String, Object> body = Map.of(
        "area", "COASTAL",
        "formulas", new Object[]{
            Map.of("formulaKey", "da.x", "expression", "1", "sortOrder", 0)
        });

    mockMvc.perform(post("/api/configuration/formulas")
            .with(SecurityMockMvcRequestPostProcessors.csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("Create rejects empty formulas")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void createRejectsEmptyFormulas() throws Exception {
    Map<String, Object> body = Map.of(
        "area", "COASTAL",
        "startDate", LocalDate.now().plusDays(30).toString(),
        "formulas", new Object[]{});

    mockMvc.perform(post("/api/configuration/formulas")
            .with(SecurityMockMvcRequestPostProcessors.csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("Create rejects blank formula key")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void createRejectsBlankFormulaKey() throws Exception {
    Map<String, Object> body = Map.of(
        "area", "COASTAL",
        "startDate", LocalDate.now().plusDays(30).toString(),
        "formulas", new Object[]{
            Map.of("formulaKey", "", "expression", "1", "sortOrder", 0)
        });

    mockMvc.perform(post("/api/configuration/formulas")
            .with(SecurityMockMvcRequestPostProcessors.csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("Create rejects negative sort order")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void createRejectsNegativeSortOrder() throws Exception {
    Map<String, Object> body = Map.of(
        "area", "COASTAL",
        "startDate", LocalDate.now().plusDays(30).toString(),
        "formulas", new Object[]{
            Map.of("formulaKey", "da.x", "expression", "1", "sortOrder", -1)
        });

    mockMvc.perform(post("/api/configuration/formulas")
            .with(SecurityMockMvcRequestPostProcessors.csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("Create rejects unauthenticated request")
  void createRejectsUnauthenticated() throws Exception {
    Map<String, Object> body = Map.of(
        "area", "COASTAL",
        "startDate", LocalDate.now().plusDays(30).toString(),
        "formulas", new Object[]{
            Map.of("formulaKey", "da.x", "expression", "1", "sortOrder", 0)
        });

    mockMvc.perform(post("/api/configuration/formulas")
            .with(SecurityMockMvcRequestPostProcessors.csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("Create rejects non-admin user")
  @WithMockJwt
  void createRejectsNonAdmin() throws Exception {
    Map<String, Object> body = Map.of(
        "area", "COASTAL",
        "startDate", LocalDate.now().plusDays(30).toString(),
        "formulas", new Object[]{
            Map.of("formulaKey", "da.x", "expression", "1", "sortOrder", 0)
        });

    mockMvc.perform(post("/api/configuration/formulas")
            .with(SecurityMockMvcRequestPostProcessors.csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)))
        .andExpect(status().isForbidden());
  }

  // ─── PUT ───────────────────────────────────────────────────────────────

  @Test
  @DisplayName("Update returns 200 with updated formulas")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void updateReturnsOkWithUpdatedFormulas() throws Exception {
    String location = createFormulaSet();
    long id = Long.parseLong(location.substring(location.lastIndexOf('/') + 1));

    Map<String, Object> body = Map.of(
        "area", "COASTAL",
        "startDate", LocalDate.now().plusDays(30).toString(),
        "formulas", new Object[]{
            Map.of("formulaKey", "da.mature.updated", "expression", "2 + 3", "sortOrder", 0)
        });

    mockMvc.perform(put("/api/configuration/formulas/" + id)
            .with(SecurityMockMvcRequestPostProcessors.csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.formulas[0].formulaKey").value("da.mature.updated"))
        .andExpect(jsonPath("$.formulas[0].expression").value("2 + 3"));
  }

  @Test
  @DisplayName("Update returns 404 for nonexistent set")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void updateReturns404ForNonexistentSet() throws Exception {
    Map<String, Object> body = Map.of(
        "area", "COASTAL",
        "startDate", LocalDate.now().plusDays(30).toString(),
        "formulas", new Object[]{
            Map.of("formulaKey", "da.x", "expression", "1", "sortOrder", 0)
        });

    mockMvc.perform(put("/api/configuration/formulas/999999")
            .with(SecurityMockMvcRequestPostProcessors.csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)))
        .andExpect(status().isNotFound());
  }

  // ─── DELETE ────────────────────────────────────────────────────────────

  @Test
  @DisplayName("Delete returns 204")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void deleteReturns204() throws Exception {
    String location = createFormulaSet();
    long id = Long.parseLong(location.substring(location.lastIndexOf('/') + 1));

    mockMvc.perform(delete("/api/configuration/formulas/" + id)
            .with(SecurityMockMvcRequestPostProcessors.csrf()))
        .andExpect(status().isNoContent());
  }

  @Test
  @DisplayName("Delete returns 404 for nonexistent set")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void deleteReturns404ForNonexistentSet() throws Exception {
    mockMvc.perform(delete("/api/configuration/formulas/999999")
            .with(SecurityMockMvcRequestPostProcessors.csrf()))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("Delete rejects unauthenticated request")
  void deleteRejectsUnauthenticated() throws Exception {
    mockMvc.perform(delete("/api/configuration/formulas/1")
            .with(SecurityMockMvcRequestPostProcessors.csrf()))
        .andExpect(status().isUnauthorized());
  }

  // ─── GET ───────────────────────────────────────────────────────────────

  @Test
  @DisplayName("Effective returns 200 with formula set")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void effectiveReturnsOk() throws Exception {
    createFormulaSet();

    mockMvc.perform(get("/api/configuration/formulas/" + LocalDate.now().plusDays(31) + "/COASTAL"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.area").value("COASTAL"))
        .andExpect(jsonPath("$.formulas.length()").value(1));
  }

  @Test
  @DisplayName("Effective returns 404 when no set found")
  @WithMockJwt
  void effectiveReturns404WhenNotFound() throws Exception {
    mockMvc.perform(get("/api/configuration/formulas/2000-01-01/COASTAL"))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("Effective rejects unauthenticated request")
  void effectiveRejectsUnauthenticated() throws Exception {
    mockMvc.perform(get("/api/configuration/formulas/" + LocalDate.now().plusDays(30) + "/COASTAL"))
        .andExpect(status().isUnauthorized());
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  private String createFormulaSet() throws Exception {
    Map<String, Object> body = Map.of(
        "area", "COASTAL",
        "startDate", LocalDate.now().plusDays(30).toString(),
        "formulas", new Object[]{
            Map.of("formulaKey", "da.mature.volume", "expression", "1 + 2", "sortOrder", 0)
        });

    return mockMvc.perform(post("/api/configuration/formulas")
            .with(SecurityMockMvcRequestPostProcessors.csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)))
        .andReturn()
        .getResponse()
        .getHeader("Location");
  }
}
