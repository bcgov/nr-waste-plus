Feature: Simple search

  This feature tests the simple search functionality on the search page, using only the basic filters.

  @loginAsBCeID
  Scenario: Screen loads
    Given I visit "/search"
    Then I can read "Waste Plus"

  @loginAsBCeID
  Scenario: Search for a RU 500
    Given I visit "/search"
    When I type "RU 500" into the "Search" input
    Then I search
    Then I can read "No results"
    And I can read "Consider adjusting your search term(s) and try again."
  
  @loginAsBCeID
  Scenario: Search for the DCC district
    Given I visit "/search"
    When I select "DCC" from the "District" dropdown
    Then I search
    And I can read "CANADIAN FOREST PRODUCTS LTD."

  @loginAsBCeID
  Scenario: Search for the OCU sampling option
    Given I visit "/search"
    When I select "OCU" from the "Sampling option" dropdown
    Then I search
    And I can read "TOLKO INDUSTRIES LTD."

  @loginAsBCeID
  Scenario: Search for the DFT status
    Given I visit "/search"
    When I select "DFT" from the "Status" dropdown
    Then I search
    And I can read "CANADIAN FOREST PRODUCTS LTD."

  @loginAsBCeID
  Scenario: Select a filter and clear it
    Given I visit "/search"
    When I select "DCC" from the "District" dropdown
    Then I can read "District: DCC"
    And I click on the "Clear filters" button    
    Then I cannot see "District: DCC"

  @loginAsBCeID
  Scenario: Open advanced search
    Given I visit "/search"
    When I click on the "Advanced Search" button
    Then I can read "Advanced search"

  @loginAsBCeID
  Scenario: Fill date ranges on advanced search
    Given I visit "/search"
    When I click on the "Advanced Search" button
    Then I can read "Advanced search"
    And I type "2024-01-01" into the "Start date" input
    And I type "2024-12-31" into the "End date" input
    Then I search
    And I can read "TOLKO INDUSTRIES LTD."
    And I can read "CANADIAN FOREST PRODUCTS LTD."

  @loginAsBCeID
  Scenario: Use autocomplete on advanced search
    Given I visit "/search"
    When I click on the "Advanced Search" button
    Then I can read "Advanced search"
    And I type "iceking" into the "Submitter IDIR/BCeID" autocomplete
    Then I search
    