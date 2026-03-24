Feature: UX/UI Token-based Style Checks
  As a designer or developer
  I want to ensure our UI uses the correct Carbon/BCGov design tokens
  So that our application is visually consistent and accessible
  
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
