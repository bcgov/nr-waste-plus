-- ============================================================================
-- V1.3.4__offset_reporting_unit_id_sequence.sql — Issue #1400: Ensure Postgres
-- generated reporting unit IDs start above legacy Oracle sequence IDs
-- to prevent ID collisions when local sequence generation takes over.
-- ============================================================================
ALTER SEQUENCE IF EXISTS hrs.reporting_unit_id_seq START WITH 1000000000;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_sequences
    WHERE schemaname = 'hrs'
      AND sequencename = 'reporting_unit_id_seq'
      AND COALESCE(last_value, 1) < 1000000000
  ) THEN
    ALTER SEQUENCE IF EXISTS hrs.reporting_unit_id_seq RESTART WITH 1000000000;
  END IF;
END $$;


