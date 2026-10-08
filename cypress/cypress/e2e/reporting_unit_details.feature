Feature: Reporting Unit Details

  This feature covers the Reporting Unit details page, accessible via /reporting-units/{id}.
  It verifies that the tombstone panel renders the correct client and RU information,
  that the Legacy Data tag appears only when the RU has no grade, and that invalid RU
  identifiers result in a not-found fallback.
  Scenarios marked "via search" exercise the full user journey: search page → click RU link → details page.

  # ── Direct navigation ────────────────────────────────────────────────────────

  @loginAsBCeID
  Scenario: Page loads and shows the reporting unit number in the title
    Given I visit "/reporting-units/36828"
    Then I can read "Reporting Unit No. 36828"
    And I can read "View reporting unit details"

  @loginAsBCeID
  Scenario: Tombstone panel shows the client name and client number
    Given I visit "/reporting-units/36828"
    Then I can read "Client name"
    And I can read "CANADIAN FOREST PRODUCTS LTD."
    And I can read "Client number"
    And I can read "00001271"

  @loginAsBCeID
  Scenario: Tombstone panel shows the client status
    Given I visit "/reporting-units/36828"
    Then I can read "Client status"
    And I can read "Active"

  @loginAsBCeID
  Scenario: Tombstone panel shows the district and sampling option fields
    Given I visit "/reporting-units/36828"
    Then I can read "District"
    And I can read "Sampling option"
    And I can read "Aggregate"

  @loginAsBCeID
  Scenario: Legacy Data tag is displayed when the reporting unit has no grade
    Given the reporting unit API for "36828" returns no grade
    Given I visit "/reporting-units/36828"
    Then I can read "Legacy data"
    And I can read "Grades"

  @loginAsBCeID
  Scenario: Navigating to a non-existent reporting unit shows a not-found page
    Given I visit "/reporting-units/0"
    Then I cannot see "Reporting Unit No. 0"

  # ── Via search page ───────────────────────────────────────────────────────────

  @loginAsBCeID
  Scenario: Navigating from search to a reporting unit shows the correct title
    Given I visit "/search"
    When I type "36828" into the "Search" input
    Then I search
    And I wait for the text "36828" to appear
    When I click on the "36828" button
    Then I can read "Reporting Unit No. 36828"
    And I can read "View reporting unit details"

  @loginAsBCeID
  Scenario: Navigating from search shows the correct client data in the tombstone
    Given I visit "/search"
    When I type "36828" into the "Search" input
    Then I search
    And I wait for the text "36828" to appear
    When I click on the "36828" button
    Then I can read "CANADIAN FOREST PRODUCTS LTD."
    And I can read "00001271"
    And I can read "Active"

  @loginAsBCeID
  Scenario: Navigating from search shows district and sampling option fields
    Given I visit "/search"
    When I type "36828" into the "Search" input
    Then I search
    And I wait for the text "36828" to appear
    When I click on the "36828" button
    Then I can read "District"
    And I can read "Sampling option"
    And I can read "Aggregate"

  @loginAsBCeID
  Scenario: Navigating from search shows the Legacy Data tag for an RU with no grade
    Given the reporting unit API for "36828" returns no grade
    Given I visit "/search"
    When I type "36828" into the "Search" input
    Then I search
    And I wait for the text "36828" to appear
    When I click on the "36828" button
    Then I can read "Legacy data"

  # ── Blocks section (feature-flagged) ──
  # The blocks list renders behind the `reporting-unit-block-details-enabled`
  # feature flag. Until its API is wired (#1250), the section shows its empty
  # state: a "No results" title with no table headers.
  @loginAsBCeID
  Scenario: Blocks section shows its empty state while the API is not wired
    Given I visit "/reporting-units/36828"
    Then I can read "No results"
    And I cannot see "Licence No."
