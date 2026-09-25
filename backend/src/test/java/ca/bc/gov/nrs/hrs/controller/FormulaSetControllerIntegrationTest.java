package ca.bc.gov.nrs.hrs.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.SYSTEM_OUT;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.transaction.annotation.Transactional;

@AutoConfigureMockMvc(print = SYSTEM_OUT)
@DisplayName("Integrated Test | Formula Set Controller")
@Transactional
class FormulaSetControllerIntegrationTest extends AbstractTestContainerIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private JdbcTemplate jdbcTemplate;
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
        .andExpect(status().isUnprocessableContent());
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
        .andExpect(status().isUnprocessableContent());
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
        .andExpect(status().isUnprocessableContent());
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
        .andExpect(status().isUnprocessableContent());
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
        .andExpect(status().isUnprocessableContent());
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
        .andExpect(jsonPath("$.formulas[0].expression").value("2 + 3"))
        .andExpect(jsonPath("$.formulas[0].sortOrder").value(0))
        .andExpect(jsonPath("$.formulas[0].declaredVariables").doesNotExist())
        .andExpect(jsonPath("$.formulas[0].validationErrors").doesNotExist());
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
  @DisplayName("List returns lightweight paginated formula sets for admins")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void listReturnsLightweightPageForAdmin() throws Exception {
    createFormulaSetWithTwoRows(LocalDate.now().plusDays(60));

    mockMvc.perform(get("/api/configuration/formulas")
            .param("page", "0")
            .param("size", "1"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].id").isNumber())
        .andExpect(jsonPath("$.content[0].area").value("COASTAL"))
        .andExpect(jsonPath("$.content[0].startDate").value(LocalDate.now().plusDays(60).toString()))
        .andExpect(jsonPath("$.content[0].formulaCount").value(2))
        .andExpect(jsonPath("$.content[0].createdAt").isNotEmpty())
        .andExpect(jsonPath("$.content[0].updatedAt").isNotEmpty())
        .andExpect(jsonPath("$.content[0].formulas").doesNotExist())
        .andExpect(jsonPath("$.page.size").value(1))
        .andExpect(jsonPath("$.page.number").value(0));
  }

  @Test
  @DisplayName("List rejects unauthenticated and non-admin users")
  void listRejectsUnauthenticated() throws Exception {
    mockMvc.perform(get("/api/configuration/formulas"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("List rejects non-admin users")
  @WithMockJwt
  void listRejectsNonAdmin() throws Exception {
    mockMvc.perform(get("/api/configuration/formulas"))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("List returns an empty page when no formula sets exist")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void listReturnsEmptyPage() throws Exception {
    mockMvc.perform(get("/api/configuration/formulas")
            .param("page", "0")
            .param("size", "10"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content").isArray())
        .andExpect(jsonPath("$.content.length()").value(0));
  }

  @Test
  @DisplayName("List excludes deleted sets and orders newest start date first")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void listExcludesDeletedSetsAndOrdersByStartDate() throws Exception {
    createFormulaSetWithTwoRows(LocalDate.now().plusDays(60));
    String deletedLocation = createFormulaSetWithTwoRows(LocalDate.now().plusDays(90));
    long deletedId = Long.parseLong(
        deletedLocation.substring(deletedLocation.lastIndexOf('/') + 1));

    mockMvc.perform(delete("/api/configuration/formulas/" + deletedId)
            .with(SecurityMockMvcRequestPostProcessors.csrf()))
        .andExpect(status().isNoContent());

    mockMvc.perform(get("/api/configuration/formulas"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].startDate")
            .value(LocalDate.now().plusDays(60).toString()))
        .andExpect(jsonPath("$.content[?(@.id == " + deletedId + ")]").doesNotExist());
  }

  // ─── GET /{id} ─────────────────────────────────────────────────────────

  @Test
  @DisplayName("Get by id returns 200 and formula rows omit internal validation state")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void getByIdOmitsInternalValidationState() throws Exception {
    String location = createFormulaSet();
    long id = Long.parseLong(location.substring(location.lastIndexOf('/') + 1));

    mockMvc.perform(get("/api/configuration/formulas/" + id))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(id))
        .andExpect(jsonPath("$.formulas[0].formulaKey").value("da.mature.volume"))
        .andExpect(jsonPath("$.formulas[0].expression").value("1 + 2"))
        .andExpect(jsonPath("$.formulas[0].sortOrder").value(0))
        .andExpect(jsonPath("$.formulas[0].declaredVariables").doesNotExist())
        .andExpect(jsonPath("$.formulas[0].validationErrors").doesNotExist());
  }

  // ─── Validation failure → 422 contract ──────────────────────────────

  @Test
  @DisplayName("Create response omits internal validation state")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void createResponseOmitsInternalValidationState() throws Exception {
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
        .andExpect(jsonPath("$.formulas[0].formulaKey").value("da.mature.volume"))
        .andExpect(jsonPath("$.formulas[0].expression").value("1 + 2"))
        .andExpect(jsonPath("$.formulas[0].sortOrder").value(0))
        .andExpect(jsonPath("$.formulas[0].declaredVariables").doesNotExist())
        .andExpect(jsonPath("$.formulas[0].validationErrors").doesNotExist())
        .andExpect(content().string(not(containsString("validationErrors"))))
        .andExpect(content().string(not(containsString("declaredVariables"))));
  }

  @Test
  @DisplayName("Create rejects invalid expression with 422")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void createRejectsInvalidExpressionWith422() throws Exception {
    Map<String, Object> body = Map.of(
        "area", "COASTAL",
        "startDate", LocalDate.now().plusDays(30).toString(),
        "formulas", new Object[]{
            Map.of("formulaKey", "da.x", "expression", "1 +", "sortOrder", 0)
        });

    mockMvc.perform(post("/api/configuration/formulas")
            .with(SecurityMockMvcRequestPostProcessors.csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)))
        .andExpect(status().isUnprocessableContent())
        .andExpect(jsonPath("$.detail", containsString("SYNTAX_ERROR")));
  }

  @Test
  @DisplayName("Update rejects invalid expression with 422")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void updateRejectsInvalidExpressionWith422() throws Exception {
    String location = createFormulaSet();
    long id = Long.parseLong(location.substring(location.lastIndexOf('/') + 1));

    Map<String, Object> body = Map.of(
        "area", "COASTAL",
        "startDate", LocalDate.now().plusDays(30).toString(),
        "formulas", new Object[]{
            Map.of("formulaKey", "da.mature.volume", "expression", "1 +", "sortOrder", 0)
        });

    mockMvc.perform(put("/api/configuration/formulas/" + id)
            .with(SecurityMockMvcRequestPostProcessors.csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)))
        .andExpect(status().isUnprocessableContent())
        .andExpect(jsonPath("$.detail", containsString("SYNTAX_ERROR")));
  }

  @Test
  @DisplayName("Create rejects duplicate formula keys with 422")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void createRejectsDuplicateFormulaKeysWith422() throws Exception {
    Map<String, Object> body = Map.of(
        "area", "COASTAL",
        "startDate", LocalDate.now().plusDays(30).toString(),
        "formulas", new Object[]{
            Map.of("formulaKey", "da.x", "expression", "1", "sortOrder", 0),
            Map.of("formulaKey", "da.x", "expression", "2", "sortOrder", 1)
        });

    mockMvc.perform(post("/api/configuration/formulas")
            .with(SecurityMockMvcRequestPostProcessors.csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)))
        .andExpect(status().isUnprocessableContent())
        .andExpect(jsonPath("$.detail").value("Formula keys must be unique."));
  }

  @Test
  @DisplayName("Get by id returns 404 for nonexistent set")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void getByIdReturns404ForNonexistentSet() throws Exception {
    mockMvc.perform(get("/api/configuration/formulas/999999999"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.detail", containsString("Formula set not found")));
  }

  @Test
  @DisplayName("Effective returns 200 with formula set")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void effectiveReturnsOk() throws Exception {
    createFormulaSet();

    mockMvc.perform(get("/api/configuration/formulas/" + LocalDate.now().plusDays(31) + "/COASTAL"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.area").value("COASTAL"))
        .andExpect(jsonPath("$.formulas.length()").value(1))
        .andExpect(jsonPath("$.formulas[0].declaredVariables").doesNotExist())
        .andExpect(jsonPath("$.formulas[0].validationErrors").doesNotExist());
  }

  @Test
  @DisplayName("Effective rejects non-admin users")
  @WithMockJwt
  void effectiveRejectsNonAdminUsers() throws Exception {
    mockMvc.perform(get("/api/configuration/formulas/2000-01-01/COASTAL"))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("Effective rejects unauthenticated request")
  void effectiveRejectsUnauthenticated() throws Exception {
    mockMvc.perform(get("/api/configuration/formulas/" + LocalDate.now().plusDays(30) + "/COASTAL"))
        .andExpect(status().isUnauthorized());
  }

  // ─── GET /variables ─────────────────────────────────────────────────

  @Test
  @DisplayName("Variables returns 404 when no species composition config exists")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void variablesReturns404WhenNoSpeciesComposition() throws Exception {
    mockMvc.perform(get("/api/configuration/formulas/variables")
            .param("date", "2020-08-01")
            .param("area", "INTERIOR")
            .param("districtCode", "DCC"))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("Variables rejects unauthenticated request")
  void variablesRejectsUnauthenticated() throws Exception {
    mockMvc.perform(get("/api/configuration/formulas/variables")
            .param("date", "2020-06-01")
            .param("area", "INTERIOR")
            .param("districtCode", "DCC"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("Variables rejects missing date parameter")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void variablesRejectsMissingDate() throws Exception {
    mockMvc.perform(get("/api/configuration/formulas/variables")
            .param("area", "INTERIOR"))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("Variables rejects missing area parameter")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void variablesRejectsMissingArea() throws Exception {
    mockMvc.perform(get("/api/configuration/formulas/variables")
            .param("date", "2020-06-01"))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("Variables rejects missing districtCode parameter")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void variablesRejectsMissingDistrictCode() throws Exception {
    mockMvc.perform(get("/api/configuration/formulas/variables")
            .param("date", "2020-06-01")
            .param("area", "INTERIOR"))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("Variables returns 200 with effective district-scoped variables")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void variablesReturns200ForEffectiveDistrictCode() throws Exception {
    // Species-composition fixture effective from 2020-09-01 so it stays outside the
    // 2020-08-01 window pinned by variablesReturns404WhenNoSpeciesComposition.
    // Inserted on the test-managed transaction and rolled back with it.
    jdbcTemplate.execute("""
        INSERT INTO hrs.district_volume
            (area, start_date, end_date, table_data, table_level_factor, heli_multiplier,
             config_type, created_at, created_by, updated_at, updated_by)
        VALUES
            ('INTERIOR', '2020-09-01', NULL,
             '{"speciesRows": [
                 {"district": {"code": "DKM", "description": "Coast"}, "species": {"SS": 100.0}},
                 {"district": {"code": "DCC", "description": "Other"}, "species": {"PW": 42.0}}
               ],
               "formulas": {}}'::jsonb,
             1.000, NULL, 'SPECIES_COMPOSITION',
             NOW(), 'test-seed:variables-dkm-v1', NOW(), 'test-seed:variables-dkm-v1')
        """);

    mockMvc.perform(get("/api/configuration/formulas/variables")
            .param("date", "2020-09-15")
            .param("area", "INTERIOR")
            .param("districtCode", "DKM"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.area").value("INTERIOR"))
        .andExpect(jsonPath("$.effectiveDate").value("2020-09-15"))
        .andExpect(jsonPath("$.namespaces.da").isNotEmpty())
        .andExpect(jsonPath("$.namespaces.sc").isNotEmpty())
        .andExpect(jsonPath("$.flat").isNotEmpty())
        .andExpect(jsonPath("$.flat['sc.SS']").exists())
        .andExpect(jsonPath("$.flat['sc.PW']").doesNotExist())
        // Fixed schema: da, sc, submission, hbs, fta.
        .andExpect(jsonPath("$.catalog.length()").value(5));
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

  private String createFormulaSetWithTwoRows(LocalDate startDate) throws Exception {
    Map<String, Object> body = Map.of(
        "area", "COASTAL",
        "startDate", startDate.toString(),
        "formulas", new Object[]{
            Map.of("formulaKey", "da.volume.one", "expression", "1 + 2", "sortOrder", 0),
            Map.of("formulaKey", "da.volume.two", "expression", "3 + 4", "sortOrder", 1)
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
