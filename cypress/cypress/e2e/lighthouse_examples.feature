Feature: Lighthouse quality checks

  Example Lighthouse scenarios focused on key thresholds and argument-based checks.

  @loginAsBCeID
  Scenario: Lighthouse category thresholds from table
    Given I visit "/search"
    Then the Lighthouse score should be at least:
      | performance     | 80 |
      | accessibility   | 90 |
      | best-practices  | 90 |
      | seo             | 80 |

  @loginAsBCeID
  Scenario: Explicit Lighthouse metric thresholds
    Given I visit "/search"
    Then the Lighthouse metric "ttfb" should be at most "800"
    And the Lighthouse metric "lcp" should be at most "2500"
    And the Lighthouse metric "cls" should be at most "0.1"
    And the Lighthouse metric "performance" should be at least "80"

  Scenario: UX quality baseline
    Given I visit "/"
    Then the UX quality score should be acceptable
