-- ============================================================================
-- V1.3.2__add_reporting_unit_sampling_code.sql — Issue #1400: add sampling_code
-- column to hrs.reporting_unit to persist waste sampling options (e.g. AVG).
-- ============================================================================
ALTER TABLE hrs.reporting_unit
    ADD COLUMN sampling_code character varying(10) DEFAULT 'AVG' NOT NULL;

COMMENT ON COLUMN hrs.reporting_unit.sampling_code IS 'Waste sampling option code, e.g. AVG.';

