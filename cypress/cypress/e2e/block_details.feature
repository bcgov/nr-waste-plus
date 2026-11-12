Feature: Reporting Unit Block Details

  This feature covers the block details page for a District Average block, at
  /reporting-units/{ruId}/{blockId}. It verifies the first tab of the v2 design:
  the four tab-1 cards, the interior/coast submission-details variants, the
  progressive filling order, the D11 additional-requirements interplay, the
  read-only legacy presentation, and navigation from the tab-1 card buttons to
  the sibling tabs. The reporting-unit and block endpoints are stubbed so the
  scenarios assert the rendered contract independently of backend readiness.

  # ── Direct navigation ────────────────────────────────────────────────────────

  @loginAsIDIR
  Scenario: Draft interior block renders the four tab-1 cards
    Given the reporting unit API for "468" returns the "Interior" district average unit
    And the block details API for "468/12" returns the "draft" block
    When I visit "/reporting-units/468/12"
    Then I can read "Block ID 12"
    And I can read "Submission details"
    And I can read "Waste assessment area summary"
    And I can read "District average volumes summary"
    And I can read "Additional requirements"
    And I can read "BEC zone"
    And I can read "Benchmark zone"
    And I cannot see "Maturity"
    And I cannot see "Heli logging"
    And I cannot see "Cable yarding (ha)"

  @loginAsIDIR
  Scenario: Draft coast block renders the coast-only submission fields
    Given the reporting unit API for "468" returns the "Coast" district average unit
    And the block details API for "468/12" returns the "draft" block
    When I visit "/reporting-units/468/12"
    Then I can read "Submission details"
    And I can read "Maturity"
    And I can read "Heli logging"
    And I can read "Cable yarding (ha)"
    And I cannot see "BEC zone"

  # ── Progressive filling (R6 −1…−5) ──────────────────────────────────────────

  @loginAsIDIR
  Scenario: Progressive filling reveals the retention fields and keeps the criteria field
    Given the reporting unit API for "468" returns the "Interior" district average unit
    And the block details API for "468/12" returns the "draft" block
    When I visit "/reporting-units/468/12"
    Then I can read "Primary logging complete"
    And I cannot see "Dispersed retention percentage"
    When I type "5/1/2024" into the "Primary logging complete" input
    Then I can read "Is dispersed retention >= 50%?"
    When I toggle the "Is dispersed retention >= 50%?" switch on
    Then I can read "Dispersed retention percentage"
    And I can read "Explain how retention percentage was calculated"
    When I type "60" into the "Dispersed retention percentage" input
    Then the "Dispersed retention percentage" input should contain "60"
    And I can read "District average criteria"

  # ── Additional requirements (D11 / BR-3) ────────────────────────────────────

  @loginAsIDIR
  Scenario: The certify checkbox follows the D11 both-No rule
    Given the reporting unit API for "468" returns the "Interior" district average unit
    And the block details API for "468/12" returns the "draft" block
    When I visit "/reporting-units/468/12"
    Then I can read "I hereby certify that none of the above conditions apply to this block"
    When I toggle the "Were any piles on this block burnt prior to submission?" switch on
    Then I cannot see "I hereby certify that none of the above conditions apply to this block"
    When I toggle the "Were any piles on this block burnt prior to submission?" switch off
    Then I can read "I hereby certify that none of the above conditions apply to this block"

  # ── Read-only legacy presentation ───────────────────────────────────────────

  @loginAsIDIR
  Scenario: A legacy block renders read-only with the legacy data tag
    Given the reporting unit API for "468" returns the "Interior" district average unit
    And the block details API for "468/12" returns the "legacy" block
    When I visit "/reporting-units/468/12"
    Then I can read "Legacy data"
    And I can read "2024-05-01"
    And I can read "Client name"
    And I can read "Canadian Forest Products Ltd."
    And I cannot see "Add secondary timber mark"
    And no switch should be visible

  # ── Tab-1 card buttons navigate (S7) ────────────────────────────────────────

  @loginAsIDIR
  Scenario: The area calculator button selects the area calculator tab
    Given the reporting unit API for "468" returns the "Interior" district average unit
    And the block details API for "468/12" returns the "draft" block
    When I visit "/reporting-units/468/12"
    And I click on the "Go to area calculator" button
    Then the "Area calculator" tab should be selected
    And I can read "Area calculator content"

  @loginAsIDIR
  Scenario: The volume details button selects the waste volumes tab
    Given the reporting unit API for "468" returns the "Interior" district average unit
    And the block details API for "468/12" returns the "draft" block
    When I visit "/reporting-units/468/12"
    And I click on the "View volume details" button
    Then the "Waste volumes" tab should be selected
    And I can read "Waste volumes content"

  @loginAsIDIR
  Scenario: The attachments button selects the attachments tab
    Given the reporting unit API for "468" returns the "Interior" district average unit
    And the block details API for "468/12" returns the "draft" block
    When I visit "/reporting-units/468/12"
    And I click on the "Add attachments" button
    Then the "Attachments" tab should be selected
    And I can read "Attachments content"
