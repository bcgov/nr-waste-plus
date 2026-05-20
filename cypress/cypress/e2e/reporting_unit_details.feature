Feature: Reporting Unit Details

  This feature covers the Reporting Unit details page, accessible via /reporting-units/{id}.
  It verifies that the tombstone panel renders the correct client and RU information,
  that the Legacy Data tag appears only when the RU has no grade, and that invalid RU
  identifiers result in a not-found fallback.
  Scenarios marked "via search" exercise the full user journey: search page → click RU link → details page.

  # ── Direct navigation ────────────────────────────────────────────────────────

  @loginAsBCeID
  Scenario: Page loads and shows the reporting unit number in the title
    Given I visit "/reporting-units/36834"
    Then I can read "Reporting Unit no.: 36834"
    And I can read "Start a new waste submission by creating a reporting unit"

  @loginAsBCeID
  Scenario: Tombstone panel shows the client name and client number
    Given I visit "/reporting-units/36834"
    Then I can read "Client name"
    And I can read "SKYWALKERS RANCH"
    And I can read "Client number"
    And I can read "00010002"

  @loginAsBCeID
  Scenario: Tombstone panel shows the client status
    Given I visit "/reporting-units/36834"
    Then I can read "Client status"
    And I can read "Active"

  @loginAsBCeID
  Scenario: Tombstone panel shows the district and sampling option fields
    Given I visit "/reporting-units/36834"
    Then I can read "District"
    And I can read "Sampling option"
    And I can read "Cutblock"

  @loginAsBCeID
  Scenario: Legacy Data tag is displayed when the reporting unit has no grade
    Given I visit "/reporting-units/36834"
    Then I can read "Legacy data"
    And I can read "Grades"

  @loginAsBCeID
  Scenario: Legacy Data tag is not shown when the reporting unit has a grade
    Given I visit "/reporting-units/34906"
    Then I can read "Reporting Unit no.: 34906"
    And I cannot see "Legacy data"

  @loginAsBCeID
  Scenario: Different reporting unit loads its own client data
    Given I visit "/reporting-units/2131"
    Then I can read "Reporting Unit no.: 2131"
    And I can read "THE CONTINENTAL"
    And I can read "00010003"

  @loginAsBCeID
  Scenario: Navigating to a non-existent reporting unit shows a not-found page
    Given I visit "/reporting-units/0"
    Then I cannot see "Reporting Unit no.: 0"

  # ── Via search page ───────────────────────────────────────────────────────────

  @loginAsBCeID
  Scenario: Navigating from search to a reporting unit shows the correct title
    Given I visit "/search"
    When I type "36834" into the "Search" input
    Then I search
    And I wait for the text "36834" to appear
    When I click on the "36834" button
    Then I can read "Reporting Unit no.: 36834"
    And I can read "Start a new waste submission by creating a reporting unit"

  @loginAsBCeID
  Scenario: Navigating from search shows the correct client data in the tombstone
    Given I visit "/search"
    When I type "36834" into the "Search" input
    Then I search
    And I wait for the text "36834" to appear
    When I click on the "36834" button
    Then I can read "SKYWALKERS RANCH"
    And I can read "00010002"
    And I can read "Active"

  @loginAsBCeID
  Scenario: Navigating from search shows district and sampling option fields
    Given I visit "/search"
    When I type "36834" into the "Search" input
    Then I search
    And I wait for the text "36834" to appear
    When I click on the "36834" button
    Then I can read "District"
    And I can read "Sampling option"
    And I can read "Cutblock"

  @loginAsBCeID
  Scenario: Navigating from search shows the Legacy Data tag for an RU with no grade
    Given I visit "/search"
    When I type "36834" into the "Search" input
    Then I search
    And I wait for the text "36834" to appear
    When I click on the "36834" button
    Then I can read "Legacy data"

  @loginAsBCeID
  Scenario: Navigating from search shows no Legacy Data tag for an RU with a grade
    Given I visit "/search"
    When I type "34906" into the "Search" input
    Then I search
    And I wait for the text "34906" to appear
    When I click on the "34906" button
    Then I can read "Reporting Unit no.: 34906"
    And I cannot see "Legacy data"

  @loginAsBCeID
  Scenario: Navigating from search to a different reporting unit shows its client data
    Given I visit "/search"
    When I type "2131" into the "Search" input
    Then I search
    And I wait for the text "2131" to appear
    When I click on the "2131" button
    Then I can read "Reporting Unit no.: 2131"
    And I can read "THE CONTINENTAL"
    And I can read "00010003"
