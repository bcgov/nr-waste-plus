Feature: BceID User Tests

  @loginAsBCeID
  Scenario: BceID User Logout
    Given I am a "BceID" user
    When I can read "Waste search"
    Then I click on the "Profile settings" button
    And I click on the "Log out" button