Feature: Form screen loads correctly

  This is just a simple template file to show how to write and format your test

  Scenario: Screen loads
    Given I visit "/"
    Then I can read "Waste Plus"

  @loginAsBCeID
  Scenario: Keyboard navigation
    Given I visit "/search"
    When I type "RU 500" into the "Search" input
    Then I press "Tab" 4 times
    Then the "Status" input should be focused

  @loginAsBCeID
  Scenario: Acessibility - No violations
    Given I visit "/clients"
    Then the "main" region should have no accessibility violations