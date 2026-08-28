Feature: User experience quality

  @chromeOnly
  Scenario: UX quality baseline
    Given I visit "/"
    Then the UX quality score should be acceptable
