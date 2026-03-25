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

  @chromeOnly
  Scenario: UX quality baseline
    Given I visit "/"
    Then the UX quality score should be acceptable

  Scenario: Button uses the correct font size
    Given I visit "/"
    Then the "Log in with IDIR" button should have "font-size" "14px"

  Scenario: Button uses the correct style
    Given I visit "/"
    Then the "Log in with IDIR" button should use the "cds--btn-primary" style

  Scenario: Button uses all styles from the token
    Given I visit "/"
    Then the "Log in with Business BCeID" button should have all styles from the "cds--btn" token

  Scenario: Title uses all styles from the token
    Given I visit "/"
    Then the element with text "Waste Plus" should have all styles from the "cds--heading-01" token

  Scenario: H1 Title uses all styles from the token
    Given I visit "/"
    Then the element "h1" with text "Waste Plus" should have all styles from the "cds--heading-01" token