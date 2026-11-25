Feature: SSO login smoke checks

  @loginAsBCeID
  Scenario: Business BCeID user reaches the search page as the configured test account
    Given I visit "/search"
    When I click on the "Profile settings" button
    Then the profile email should match the configured "bceid_username"

  @loginAsIDIR
  Scenario: IDIR user reaches the search page as the configured test account
    Given I visit "/search"
    When I click on the "Profile settings" button
    Then the profile email should match the configured "idir_username"
