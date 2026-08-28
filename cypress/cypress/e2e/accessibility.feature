Feature: Accessibility

  @loginAsBCeID
  Scenario: No accessibility violations
    Given I visit "/clients"
    Then the "main" region should have no accessibility violations
