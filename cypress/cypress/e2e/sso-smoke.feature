Feature: SSO login smoke checks

  @loginAsBCeID
  Scenario: Business BCeID user can reach the search page
    Given I can read "Waste search"
    Then I can read "Search by RU No. or Block ID"

  @loginAsIDIR
  Scenario: IDIR user can reach the search page
    Given I visit "/search"
    Then the page should have at least one ARIA live region
