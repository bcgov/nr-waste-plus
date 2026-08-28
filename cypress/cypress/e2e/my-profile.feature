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

  @loginAsBCeID
  Scenario: Selected client appears at the top of the profile panel
    Given I visit "/clients"
    When I click on the "Profile settings" button
    Then I can read "My Profile"
    When I click on the "TOLKO INDUSTRIES LTD." button
    Then the profile settings button should show "TOLKO INDUSTRIES LTD."
    When I click on the "Select none" button
    Then I can read "Select none"

  @loginAsBCeID
  Scenario: Selected client is used as the search parameter
    Given I visit "/clients"
    When I click on the "Profile settings" button
    When I click on the "TOLKO INDUSTRIES LTD." button
    When I click on the "Profile settings" button
    And I click on the "Waste search" link
    Then the client filter for "00147603" should be visible
    When I click on the "My clients" link
    And I click on the "Profile settings" button
    When I click on the "Select none" button
    Then I can read "Select none"
