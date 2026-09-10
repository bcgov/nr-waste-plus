Feature: Lighthouse quality thresholds

  @loginAsBCeID
  Scenario: Lighthouse category thresholds from table
    Given I visit "/search"
    Then the lighthouse score should be at least:
      | performance     | 75 |
      | accessibility   | 90 |
      | best-practices  | 90 |
      | seo             | 80 |

  @loginAsBCeID
  Scenario: Explicit Lighthouse metric thresholds
    Given I visit "/search"
    Then the lighthouse score should be at least:
      | performance | 75 |
    And the lighthouse metric "ttfb" should be at most "95"
    And the lighthouse metric "cls" should be at most "0.1"
    And the lighthouse metric "lcp" should be at most "2500"
