Feature: Login and Logout

  @loginAsBCeID
  Scenario: BceID User Logout
    Given I can read "Waste search"
    When I click on the "Profile settings" button
    And I can read "BCEIDBUSINESS\alliance_uat"
    Then I click on the "Log out" button