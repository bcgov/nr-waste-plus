  Feature: Test IDIR

  @loginAsIDIR
  Scenario: Selected district shows on the profile settings button
    Given I visit "/search"
    When I click on the "Profile settings" button
    And I click on the "Campbell River" button
    Then the profile settings button should show "Campbell River"
    When I close the profile panel
    Then the profile settings button should show "Campbell River"

  @loginAsBCeID
  Scenario: Open the profile panel
    Given I visit "/clients"
    When I click on the "Profile settings" button
    Then I can read "My Profile"
    And I can read "Role: VIEWER, SUBMITTER, BCeID"
    And I can read "Log out"