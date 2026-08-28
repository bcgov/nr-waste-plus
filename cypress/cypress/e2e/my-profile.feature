Feature: My profile

  @loginAsBCeID
  Scenario: Open the profile panel
    Given I visit "/clients"
    When I click on the "Profile settings" button
    Then I can read "My Profile"
    And I can read "Role: VIEWER, SUBMITTER, BCeID"
    And I can read "Log out"

  @loginAsBCeID
  Scenario: Close the profile panel
    Given I visit "/clients"
    When I click on the "Profile settings" button
    Then I can read "My Profile"
    When I click on the "Close" button
    Then I cannot see "My Profile"
