-- ============================================================================
-- V1.3.3__partition_reporting_unit_id_sequence.sql — Issue #1400: Ensure Postgres
-- generated reporting unit IDs start above legacy Oracle sequence IDs
-- to prevent ID collisions when local sequence generation takes over.
-- ============================================================================
ALTER SEQUENCE hrs.reporting_unit_id_seq RESTART WITH 1000000000;

