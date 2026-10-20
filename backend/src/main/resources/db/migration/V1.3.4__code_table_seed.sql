-- Historical data only, not approved current extracts. Sources: legacy test
-- migration V2.0.1__code_table_pump.sql (generated 2025-08-15) and
-- V4.0.1__add_sampling_option_code.sql. The ORG_UNIT pump contains 23
-- district rows across two INSERT statements; it has no region/area records.
-- Geographic rows map each source district to geo_type DISTRICT. Status rows
-- are Oracle WAA values approved for HRS block status.

INSERT INTO hrs.geographic_code (
    id,
    code,
    description,
    geo_type,
    effective_date,
    expiry_date,
    update_timestamp
)
VALUES
(
    1826, 'DCC', 'Cariboo-Chilcotin Natural Resource District', 'DISTRICT',
    TIMESTAMP '2003-04-01 00:00:00', TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2014-06-28 08:21:00'
),
(
    1828, 'DCS', 'Cascades Natural Resource District', 'DISTRICT',
    TIMESTAMP '2003-04-01 00:00:00', TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2014-06-28 08:21:00'
),
(
    1829, 'DOS', 'Okanagan Shuswap Natural Resource District', 'DISTRICT',
    TIMESTAMP '2003-04-01 00:00:00', TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2014-06-28 08:21:00'
),
(
    1831, 'DRM', 'Rocky Mountain Natural Resource District', 'DISTRICT',
    TIMESTAMP '2003-04-01 00:00:00', TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2014-06-28 08:21:00'
),
(
    1832, 'DNI', 'North Island - Central Coast Natural Resource District',
    'DISTRICT', TIMESTAMP '2003-04-01 00:00:00',
    TIMESTAMP '9999-12-31 00:00:00', TIMESTAMP '2014-06-28 08:21:00'
),
(
    18, 'DPG', 'Prince George Natural Resource District', 'DISTRICT',
    TIMESTAMP '1905-01-01 00:00:00', TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2014-06-28 08:21:00'
),
(
    30, 'DVA', 'Stuart Nechako Natural Resource District', 'DISTRICT',
    TIMESTAMP '1905-01-01 00:00:00', TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2018-06-23 10:30:31'
),
(
    32, 'DKM', 'Coast Mountains Natural Resource District', 'DISTRICT',
    TIMESTAMP '1905-01-01 00:00:00', TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2014-06-28 08:21:00'
),
(
    38, 'DMK', 'Mackenzie Natural Resource District', 'DISTRICT',
    TIMESTAMP '1905-01-01 00:00:00', TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2014-06-28 08:21:00'
),
(
    46, 'DFN', 'Fort Nelson Natural Resource District', 'DISTRICT',
    TIMESTAMP '1905-01-01 00:00:00', TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2014-06-28 08:21:00'
),
(
    21, 'DKA', 'Thompson Rivers Natural Resource District', 'DISTRICT',
    TIMESTAMP '1905-01-01 00:00:00', TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2014-06-28 08:21:00'
),
(
    56, 'DMH', '100 Mile House Natural Resource District', 'DISTRICT',
    TIMESTAMP '1905-01-01 00:00:00', TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2014-06-28 08:21:00'
),
(
    50, 'DQU', 'Quesnel Natural Resource District', 'DISTRICT',
    TIMESTAMP '1905-01-01 00:00:00', TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2014-06-28 08:21:00'
),
(
    15, 'DCK', 'Chilliwack Natural Resource District', 'DISTRICT',
    TIMESTAMP '1905-01-01 00:00:00', TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2014-06-28 08:21:00'
),
(
    23, 'DSQ', 'Sea to Sky Natural Resource District', 'DISTRICT',
    TIMESTAMP '1905-01-01 00:00:00', TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2014-06-28 08:21:00'
),
(
    27, 'DSC', 'Sunshine Coast Natural Resource District', 'DISTRICT',
    TIMESTAMP '1905-01-01 00:00:00', TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2014-06-28 08:21:00'
),
(
    43, 'DCR', 'Campbell River Natural Resource District', 'DISTRICT',
    TIMESTAMP '1905-01-01 00:00:00', TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2014-06-28 08:21:00'
),
(
    48, 'DQC', 'Haida Gwaii Natural Resource District', 'DISTRICT',
    TIMESTAMP '1905-01-01 00:00:00', TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2014-06-28 08:21:00'
),
(
    1619, 'DSI', 'South Island Natural Resource District', 'DISTRICT',
    TIMESTAMP '1998-03-27 00:00:00', TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2014-06-28 08:21:00'
),
(
    1823, 'DND', 'Nadina Natural Resource District', 'DISTRICT',
    TIMESTAMP '2003-04-01 00:00:00', TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2014-06-28 08:21:00'
),
(
    1824, 'DSS', 'Skeena Stikine Natural Resource District', 'DISTRICT',
    TIMESTAMP '2003-04-01 00:00:00', TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2014-06-28 08:21:00'
),
(
    1825, 'DPC', 'Peace Natural Resource District', 'DISTRICT',
    TIMESTAMP '2003-04-01 00:00:00', TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2014-06-28 08:21:00'
),
(
    1902, 'DSE', 'Selkirk Natural Resource District', 'DISTRICT',
    TIMESTAMP '2014-06-28 08:20:45', TIMESTAMP '9999-12-31 00:00:00',
    TIMESTAMP '2014-06-28 08:20:45'
)
ON CONFLICT (code) DO UPDATE SET
    id = excluded.id,
    description = excluded.description,
    geo_type = excluded.geo_type,
    effective_date = excluded.effective_date,
    expiry_date = excluded.expiry_date,
    update_timestamp = excluded.update_timestamp;

INSERT INTO hrs.sampling_option_code (
    code,
    description,
    effective_date,
    expiry_date,
    update_timestamp
)
VALUES
(
    'AGR', 'Aggregate', DATE '2004-01-29', DATE '2099-12-31',
    TIMESTAMP '2004-05-27 00:00:00'
),
(
    'BLK', 'Cutblock', DATE '2004-01-29', DATE '2099-12-31',
    TIMESTAMP '2004-05-27 00:00:00'
),
(
    'OCU', 'Ocular', DATE '2004-01-29', DATE '2099-12-31',
    TIMESTAMP '2004-05-27 00:00:00'
),
(
    'AVG', 'Average', DATE '2004-01-29', DATE '2099-12-31',
    TIMESTAMP '2004-05-27 00:00:00'
)
ON CONFLICT (code) DO UPDATE SET
    description = excluded.description,
    effective_date = excluded.effective_date,
    expiry_date = excluded.expiry_date,
    update_timestamp = excluded.update_timestamp;

-- Historical WAA status snapshot from legacy test migration
-- V2.0.1__code_table_pump.sql, generated 2025-08-15. The approved HRS block
-- mapping is in the schema migration.
INSERT INTO hrs.waa_status_code (
    code,
    description,
    effective_date,
    expiry_date,
    update_timestamp
)
VALUES
(
    'ERR', 'Billing Error', DATE '2006-03-03', DATE '2099-12-31',
    TIMESTAMP '2025-05-22 00:00:00'
),
(
    'APP', 'Approved', DATE '2015-11-12', DATE '2099-12-31',
    TIMESTAMP '2025-05-22 00:00:00'
),
(
    'BIP', 'Billing in Progress', DATE '2005-12-16', DATE '2099-12-31',
    TIMESTAMP '2025-05-22 00:00:00'
),
(
    'BIS', 'Billing Issued', DATE '2005-12-16', DATE '2099-12-31',
    TIMESTAMP '2025-05-22 00:00:00'
),
(
    'DFT', 'Draft', DATE '2004-01-28', DATE '2099-12-31',
    TIMESTAMP '2025-05-22 00:00:00'
),
(
    'RTB', 'Ready To Bill', DATE '2006-03-02', DATE '2099-12-31',
    TIMESTAMP '2025-05-22 00:00:00'
),
(
    'BPR', 'Billing Processed', DATE '2004-01-28', DATE '2006-03-31',
    TIMESTAMP '2025-05-22 00:00:00'
),
(
    'REJ', 'Rejected', DATE '2004-01-28', DATE '2013-05-21',
    TIMESTAMP '2025-05-22 00:00:00'
),
(
    'SUB', 'Submitted', DATE '2004-01-28', DATE '2099-12-31',
    TIMESTAMP '2025-05-22 00:00:00'
),
(
    'COM', 'Complete', DATE '2005-01-01', DATE '2006-03-31',
    TIMESTAMP '2025-05-22 00:00:00'
),
(
    'DAC', 'Deactivated (closed)', DATE '2005-01-01', DATE '2099-12-31',
    TIMESTAMP '2025-05-22 00:00:00'
),
(
    'HWR', 'Hold Waste Relief', DATE '2000-01-01', DATE '2099-12-31',
    TIMESTAMP '2025-05-22 00:00:00'
),
(
    'ISUB', 'Interim Submit', DATE '2000-01-01', DATE '2099-12-31',
    TIMESTAMP '2025-05-22 00:00:00'
),
(
    'RBL', 'Re-bill', DATE '2006-11-08', DATE '2099-12-31',
    TIMESTAMP '2025-05-22 00:00:00'
),
(
    'WRA', 'Waste Relief Approved', DATE '2000-01-01', DATE '2099-12-31',
    TIMESTAMP '2025-05-22 00:00:00'
),
(
    'FREJ', 'Field Rejected', DATE '2013-05-21', DATE '2099-12-31',
    TIMESTAMP '2025-05-22 00:00:00'
),
(
    'OREJ', 'Office Rejected', DATE '2013-05-21', DATE '2099-12-31',
    TIMESTAMP '2025-05-22 00:00:00'
),
(
    'REV', 'Reviewed', DATE '2014-01-01', DATE '2015-11-12',
    TIMESTAMP '2025-05-22 00:00:00'
),
(
    'HLD', 'Hold', DATE '2000-01-01', DATE '2099-12-31',
    TIMESTAMP '2025-05-22 00:00:00'
)
ON CONFLICT (code) DO UPDATE SET
    description = excluded.description,
    effective_date = excluded.effective_date,
    expiry_date = excluded.expiry_date,
    update_timestamp = excluded.update_timestamp;
