-- ============================================================================
-- V1.1.11__remove_unused_identity_cache_and_formula_structures.sql
-- Issue #1364 — remove retired identity-cache and legacy formula objects
-- ============================================================================
--
-- Idempotent cleanup. On fresh databases the consolidated baseline
-- (V1.0.0__hrs_baseline.sql) already omits these objects, so every statement
-- below is a guarded no-op; on databases migrated through the historical
-- V1.0.0..V1.1.10 sequence (after `flyway repair`) these statements perform
-- the removals.
--
-- Removed, and why it is safe:
--
--   1. hrs.user_identity — Cognito identity cache filled by the hydration
--      filter that #1364 removes. No other table references it
--      (user_preferences/user_bookmarks carry plain user_id strings), so the
--      drop also takes its PK, GIN index and secondary indexes with it.
--
--   2. hrs.district_volume_formula — legacy per-district formula storage
--      superseded by hrs.formula_set/hrs.formula_set_row (V1.1.7) and never
--      populated outside local development. Dropping the table also drops its
--      indexes, check constraint and trg_district_volume_formula_shared_audit
--      trigger.
--
--   3/4. hrs.formula_set_row.declared_variables and .validation_errors —
--      always written with empty defaults and never read back; formula
--      validation lives in the parser (#1220).
--
--   5. hrs.idx_district_volume_data_gin — GIN index over
--      district_volume.table_data; no JSONB-path query uses it.
--
-- Rollback strategy: recreate from the pre-#1364 migrations — V1.0.1
-- (user_identity), V1.1.5 (district_volume_formula), V1.1.7 (formula_set_row
-- columns) and V1.0.3 (idx_district_volume_data_gin). None of the removed
-- objects held data outside local development, so no backup restore is
-- required.
-- ============================================================================

-- 1. Identity cache (was V1.0.1).
DROP TABLE IF EXISTS hrs.user_identity;

-- 2. Legacy formula storage (was V1.1.5).
DROP TABLE IF EXISTS hrs.district_volume_formula;

-- 3/4. Unused formula_set_row columns (were V1.1.7).
ALTER TABLE hrs.formula_set_row DROP COLUMN IF EXISTS declared_variables;
ALTER TABLE hrs.formula_set_row DROP COLUMN IF EXISTS validation_errors;

-- 5. JSONB GIN index on district_volume.table_data (was V1.0.3).
DROP INDEX IF EXISTS hrs.idx_district_volume_data_gin;
