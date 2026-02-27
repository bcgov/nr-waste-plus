Feature: Login and Logout

  @loginAsBCeID
  Scenario: BceID User Logout
    Given I am a "BceID" user
    When I can read "Waste search"
    Then I click on the "Profile settings" button
    And I can read "BCEIDBUSINESS\alliance_uat"
    Then I click on the "Log out" button