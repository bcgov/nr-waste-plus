Feature: Reporting Unit Block Details

  The block details first tab ("Submission details") renders the Interior
  submission-details block in two modes: editable for current blocks and
  read-only for legacy blocks. Field values are asserted through their visible
  labels — never data-testids — and the read-only desktop layout is pinned to
  the same grid spans as the editable block (#1239 read-only alignment).

  Value ground truth (local dev data, browser-observed 2026-11-04):
  - RU 34752 / block 167214 renders read-only: code lists are not wired to the
    page yet, so code-backed fields show the "--" placeholder, both benchmarks
    show "--", the dispersed-retention answer is "No", and the primary logging
    date is empty.
  - RU 34906 / block 176467 renders editable: every input starts empty, the
    dispersed-retention toggle is off ("No"), and both benchmarks show "--".

  Background:
    Given the viewport is 1440 by 1000 pixels

  # ── Read-only block (legacy data) ────────────────────────────────────────────

  @loginAsBCeID
  Scenario: Read-only block shows the submission details heading and hint
    Given I visit "/reporting-units/34752/167214"
    Then I can read "Submission details"
    And I can read "Complete all fields and click Save before leaving this tab"

  @loginAsBCeID
  Scenario: Read-only block shows the code-list fields through their labels
    Given I visit "/reporting-units/34752/167214"
    Then the field "Harvest status" shows "--"
    And the field "BEC zone" shows "--"
    And the field "BEC subzone/variant" shows "--"
    And the field "District average criteria" shows "--"

  @loginAsBCeID
  Scenario: Read-only block shows the benchmark values through their labels
    Given I visit "/reporting-units/34752/167214"
    Then the field "Benchmark zone" shows "--"
    And the field "Waste benchmark (m³/ha)" shows "--"

  @loginAsBCeID
  Scenario: Read-only block answers the dispersed retention question
    Given I visit "/reporting-units/34752/167214"
    Then the field "Is dispersed retention >= 50%?" shows "No"

  @loginAsBCeID
  Scenario: Read-only block leaves the primary logging date empty
    Given I visit "/reporting-units/34752/167214"
    Then the field "Primary logging complete" shows ""

  @loginAsBCeID
  Scenario: Read-only block offers no editing actions
    Given I visit "/reporting-units/34752/167214"
    Then I can read "Submission details"
    And I cannot see "Add secondary timber mark"
    And I cannot see "Add road permit timber mark"

  @loginAsBCeID
  Scenario: Read-only block keeps the editable desktop row grouping
    Given I visit "/reporting-units/34752/167214"
    Then the field "Primary logging complete" and the field "Harvest status" are on the same row
    And the field "Harvest status" and the field "BEC zone" are on the same row
    And the field "BEC zone" and the field "BEC subzone/variant" are on the same row
    And the field "BEC subzone/variant" and the field "Benchmark zone" are not on the same row
    And the field "Waste benchmark (m³/ha)" and the field "Benchmark zone" are on the same row
    And the field "Benchmark zone" is left-aligned with the field "Primary logging complete"
    And the field "Is dispersed retention >= 50%?" is left-aligned with the field "Primary logging complete"
    And the field "District average criteria" spans the full row

  # ── Editable block (current data) ────────────────────────────────────────────

  @loginAsBCeID
  Scenario: Editable block shows the submission details heading and hint
    Given I visit "/reporting-units/34906/176467"
    Then I can read "Submission details"
    And I can read "Complete all fields and click Save before leaving this tab"

  @loginAsBCeID
  Scenario: Editable block starts with empty submission inputs
    Given I visit "/reporting-units/34906/176467"
    Then the field "Primary logging complete" shows ""
    And the field "Harvest status" shows ""
    And the field "BEC zone" shows ""
    And the field "BEC subzone/variant" shows ""
    And the field "District average criteria" shows ""
    And I can read "Select the district average criteria that applies to this submission"

  @loginAsBCeID
  Scenario: Editable block shows the benchmark values through their labels
    Given I visit "/reporting-units/34906/176467"
    Then the field "Benchmark zone" shows "--"
    And the field "Waste benchmark (m³/ha)" shows "--"

  @loginAsBCeID
  Scenario: Editable block starts with the dispersed retention toggle off
    Given I visit "/reporting-units/34906/176467"
    Then the toggle "Is dispersed retention >= 50%?" is off

  @loginAsBCeID
  Scenario: Editable block offers the timber mark actions
    Given I visit "/reporting-units/34906/176467"
    Then I can read "Add secondary timber mark"
    And I can read "Add road permit timber mark"

  @loginAsBCeID
  Scenario: Editable block keeps its desktop row grouping
    Given I visit "/reporting-units/34906/176467"
    Then the field "Primary logging complete" and the field "Harvest status" are on the same row
    And the field "Harvest status" and the field "BEC zone" are on the same row
    And the field "BEC zone" and the field "BEC subzone/variant" are on the same row
    And the field "BEC subzone/variant" and the field "Benchmark zone" are not on the same row
    And the field "Waste benchmark (m³/ha)" and the field "Benchmark zone" are on the same row
    And the field "District average criteria" spans the full row
