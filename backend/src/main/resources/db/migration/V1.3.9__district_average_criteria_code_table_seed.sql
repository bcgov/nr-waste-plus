-- District Average criteria options (Waste manual section 4.5). Source
-- precedence for wording differences: manual, then spreadsheet, then
-- Confluence (Confluence supersedes previous). Descriptions are full text
-- without numeric label prefix (frontend appends criterion number). Seeded in
-- deterministic criterion order 1..11 with stable codes.

INSERT INTO wasteplus.district_average_criteria_code (
    code,
    description,
    effective_date,
    expiry_date,
    update_timestamp
)
VALUES
(
    '1',
    'Forestry Licence to Cut with a volume limit of 2,000 m3 or less, written in the licence agreement.',
    TIMESTAMP '2026-01-01 00:00:00',
    TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2026-01-01 00:00:00'
),
(
    '2',
    'Occupant Licence to Cut with a volume limit of 2,000 m3 or less, written in the licence agreement.',
    TIMESTAMP '2026-01-01 00:00:00',
    TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2026-01-01 00:00:00'
),
(
    '3',
    'Forestry Licence to Cut issued under 47.6 (3) of the Act in conjunction with an activity funded out of the BCTS account.',
    TIMESTAMP '2026-01-01 00:00:00',
    TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2026-01-01 00:00:00'
),
(
    '4',
    'Forestry Licence to Cut issued under Section 47.6 (2)(d) of the Act and Section 4 of the LTC Regulation, and utilizes Section 6.2.1 (1)(d) of the Interior Appraisal Manual (with set sawlog stumpage rate of $1.20/m3) in conjunction with an activity funded by the Forest Investment Program (i.e. Forests for Tomorrow).',
    TIMESTAMP '2026-01-01 00:00:00',
    TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2026-01-01 00:00:00'
),
(
    '5',
    'A scale based right of way accessing a cruise based cutblock.',
    TIMESTAMP '2026-01-01 00:00:00',
    TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2026-01-01 00:00:00'
),
(
    '6',
    'A cutblock within a blanket salvage cutting authority.',
    TIMESTAMP '2026-01-01 00:00:00',
    TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2026-01-01 00:00:00'
),
(
    '7',
    'A cutblock smaller than 2.0 ha. This paragraph does not apply to partial cutblocks or patch cut cutblocks.',
    TIMESTAMP '2026-01-01 00:00:00',
    TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2026-01-01 00:00:00'
),
(
    '8',
    'A waste assessment area within a Woodlot Licence or Community Forest Licence that has 50% or more of the stand volume retained in dispersed retention.',
    TIMESTAMP '2026-01-01 00:00:00',
    TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2026-01-01 00:00:00'
),
(
    '9',
    'A waste assessment area where all coniferous timber harvested from the cutting authority (up to the date of the waste submission) was billed at the minimum stumpage rate of $0.25. Where this criterion is used, an HBS report(s) of billing volume and value must be attached to the submission.',
    TIMESTAMP '2026-01-01 00:00:00',
    TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2026-01-01 00:00:00'
),
(
    '10',
    'A submission for material disposed of prior to a waste assessment, as described in Section 4.4. This criterion can only be used under the direction of the District Manager and the Area Director.',
    TIMESTAMP '2026-01-01 00:00:00',
    TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2026-01-01 00:00:00'
),
(
    '11',
    'A submission for a late waste assessment where a field survey is no longer feasible. This criterion can only be used under the direction of the District Manager and the Area Director.',
    TIMESTAMP '2026-01-01 00:00:00',
    TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2026-01-01 00:00:00'
)
ON CONFLICT (code) DO UPDATE SET
    description = excluded.description,
    effective_date = excluded.effective_date,
    expiry_date = excluded.expiry_date,
    update_timestamp = excluded.update_timestamp;
