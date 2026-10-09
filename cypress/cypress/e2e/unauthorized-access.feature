Feature: Unauthorized resource access

  # Deliberately untagged (like login-button.feature): no @loginAs* hook may run,
  # so the scenario always executes with a clean, unauthenticated session.

  Scenario: Anonymous user is denied a protected reporting unit
    Given I visit "/reporting-units/34752"
    Then I am presented with a sign-in challenge or an unauthorized error
    And I cannot see "Reporting Unit no.: 34752"
