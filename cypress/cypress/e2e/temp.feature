Feature: Design Token Validation - Main Page

  This feature file tests the UX/UI design token validation on the main page of the Waste Plus application.

  Background:
    Given I visit "/"

  Scenario: Button uses correct typography
    Then the "Log in with IDIR" button should have "$spacing-05" "padding"

  Scenario: Heading uses correct font size
    Then the "Waste Plus" heading should have "$heading-01" font size

  Scenario: Element with text has correct color token
    Then the element with text "Waste Plus" should have "$text-primary" text color

  Scenario: Button uses full token validation
    Then the "Log in with IDIR" button should use the "$button-primary" token

  Scenario: Heading uses typography token
    Then the "Waste Plus" heading should use the "$heading-01" typography

  Scenario: Button has specific padding token
    Then the "Log in with Business BCeID" button should have "$spacing-05" padding

  Scenario: Element meets AA contrast
    Then the element with text "Waste Plus" should meet "AA" contrast

  Scenario: wrong font size token
    Then the "Waste Plus" heading should have "$body-01" font size

  Scenario: missing contrast level
    When the element with text "Waste Plus" should meet "A" contrast
