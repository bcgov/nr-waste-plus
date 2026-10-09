Feature: Screen reader announcements

  Scenario: The landing page has a persistent ARIA live region
    Given I visit "/"
    Then the page should have at least one ARIA live region

  @loginAsIDIR
  Scenario: The search page has a persistent ARIA live region
    Given I visit "/search"
    Then the page should have at least one ARIA live region

  @loginAsIDIR
  Scenario: Theme toggle announces the new mode
    Given I visit "/search"
    And I click on the theme toggle
    Then the "app-announcer" live region should announce "Dark mode enabled"
    And I click on the theme toggle
    Then the "app-announcer" live region should announce "Light mode enabled"

  @loginAsIDIR
  Scenario: Profile panel open and close are announced
    Given I visit "/search"
    And I click on the "Profile settings" button
    Then the "app-announcer" live region should announce "Profile panel opened"
    And I close the profile panel
    Then the "app-announcer" live region should announce "Profile panel closed"

  @loginAsIDIR
  Scenario: District selection is announced
    Given I visit "/search"
    And I click on the "Profile settings" button
    And I click on the "Campbell River" button
    Then the "app-announcer" live region should announce "Selected district: Campbell River"
    And I close the profile panel
