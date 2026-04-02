Feature: Collection of sample tests

  This is just a sample template file to show how to write and format your test.

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

  @loginAsBCeID
  Scenario: Lighthouse category thresholds from table
    Given I visit "/search"
    Then the lighthouse score should be at least:
      | performance     | 50 |
      | accessibility   | 90 |
      | best-practices  | 90 |
      | seo             | 80 |

  @loginAsBCeID
  Scenario: Explicit Lighthouse metric thresholds
    Given I visit "/search"
    Then the lighthouse metric "ttfb" should be at most "100"
    And the lighthouse metric "cls" should be at most "0.1"
    And the lighthouse "performance" score should be above 50
    And the lighthouse metric "lcp" should be at most "16000"

  @chromeOnly
  Scenario: UX quality baseline
    Given I visit "/"
    Then the UX quality score should be acceptable

  Scenario: Button uses the correct font size
    Given I visit "/"
    Then the "Log in with IDIR" "button" should have "font-size" as "14px"

  Scenario: Button uses the correct style
    Given I visit "/"
    Then the "Log in with IDIR" "button" should use the "cds--btn--primary" class

  Scenario: Button uses correct height token value    
    Given I visit "/"
    Then the "Log in with IDIR" "button" should have "$layout-04" "height"

  Scenario: Title meets contrast requirements
    Given I visit "/"
    Then the "Waste Plus" "heading" should meet "AA" standard for contrast