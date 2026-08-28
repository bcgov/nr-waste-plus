Feature: User experience quality

  @chromeOnly @loginAsBCeID
  Scenario: UX quality baseline
    Given I visit "/search"
    Then the UX quality score should be acceptable
