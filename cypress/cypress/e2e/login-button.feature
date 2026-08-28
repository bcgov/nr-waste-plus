Feature: Login button styling

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
