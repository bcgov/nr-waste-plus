Feature: Keyboard navigation

  @loginAsBCeID
  Scenario: Search form can be navigated with the keyboard
    Given I visit "/search"
    When I type "RU 500" into the "Search" input
    Then I press "Tab" 4 times
    Then the "Status" input should be focused

  @loginAsBCeID
  Scenario: Clients page exposes its controls to keyboard users
    Given I visit "/clients"
    Then the clients page controls should be keyboard focusable

  @loginAsBCeID
  Scenario: Skip to main content link moves keyboard focus to the main landmark
    Given I visit "/search"
    Then the skip link should target an existing main landmark
    When I activate the skip link with the keyboard
    Then focus should be on the main landmark
