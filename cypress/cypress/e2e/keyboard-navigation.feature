Feature: Keyboard navigation

  @loginAsBCeID
  Scenario: Search form can be navigated with the keyboard
    Given I visit "/search"
    When I type "RU 500" into the "Search" input
    Then I press "Tab" 4 times
    Then the "Status" input should be focused

  @loginAsBCeID
  Scenario: Clients page follows a predictable focus order
    Given I visit "/clients"
    Then the focus order should be "Waste search, Create reporting unit, Need Help?, Search by name, Search, Edit columns, 00147603, 00001271, Items per page:, Page of 1 page"
