Feature: Theme toggle

  @loginAsBCeID
  Scenario: Toggle from light mode to dark mode
    Given I visit "/clients"
    Then the theme toggle should offer "dark" mode
    When I click on the theme toggle
    Then the theme toggle should offer "light" mode
