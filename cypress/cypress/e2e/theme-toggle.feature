Feature: Theme toggle

  @loginAsBCeID
  Scenario: Toggle from light mode to dark mode
    Given I visit "/clients"
    Then I can read "Switch to dark mode"
    When I click on the "Switch to dark mode" button
    Then I can read "Switch to light mode"
