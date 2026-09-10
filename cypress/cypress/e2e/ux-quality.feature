Feature: User experience quality

  @chromeOnly
  Scenario: UX quality baseline on the public landing page
    Given I visit "/"
    Then the UX quality score should be acceptable

  @chromeOnly @loginAsBCeID
  Scenario: UX quality baseline on an authenticated page
    Given I visit "/search"
    Then the UX quality score should be acceptable
