-- ============================================================================
-- V1.3.2__drop_outbox_infrastructure.sql — AM-021 (2026-10-13): Legacy Oracle
-- compatibility writes are dropped; District Average submissions are
-- modern-side only with Postgres authoritative. The outbox delivery chain
-- (#1232 publication, #1233 leased polling relay, #1235 read-after-timeout
-- classifier, #1236 reconciliation ops surface, #1237 Legacy write endpoints)
-- was descoped, so hrs.outbox_event has neither writer nor reader.
--
-- Scope: legacy-sync outbox plumbing ONLY. Retained: hrs.idempotency_record
-- (required by open issue #1234), the shared audit infrastructure
-- (hrs.audit_row_change(), hrs.audit_event / hrs.audit_change,
-- correlation_id), trg_idempotency_record_shared_audit, and all domain
-- tables. HBS/FTA integration schema (AM-020) is untouched.
--
-- Applied migrations V1.2.3 / V1.3.1 are never edited; this forward
-- migration removes the objects they created.
-- Rollback: hrs.outbox_event never received domain writes (the publication
-- feature never shipped); restore = re-apply V1.2.3 lines 39-153 and
-- V1.3.1 lines 180-185.
-- ============================================================================

-- The trigger and constraint drops reference the hrs.outbox_event relation,
-- and PostgreSQL's IF EXISTS suppresses only the named object, not a missing
-- table — a rerun or partial-state repair with the table already gone would
-- fail with "relation does not exist". Guarding on to_regclass keeps the
-- script convergent for both states, as documented above.

DO $$
BEGIN
  IF to_regclass('hrs.outbox_event') IS NOT NULL THEN
    -- 1. Trigger first: bound to hrs.outbox_event.
    DROP TRIGGER IF EXISTS trg_outbox_event_shared_audit ON hrs.outbox_event;

    -- 2. Indexes before the table (belt-and-braces: DROP TABLE would remove
    --    them, but explicit drops keep partial states idempotent).
    DROP INDEX IF EXISTS hrs.idx_outbox_actionable;
    DROP INDEX IF EXISTS hrs.idx_outbox_lease;

    -- 3. Constraints before the table (same rationale as the indexes).
    ALTER TABLE hrs.outbox_event
        DROP CONSTRAINT IF EXISTS outbox_event_event_uq;
    ALTER TABLE hrs.outbox_event
        DROP CONSTRAINT IF EXISTS outbox_event_attempt_count_ck;
    ALTER TABLE hrs.outbox_event
        DROP CONSTRAINT IF EXISTS outbox_event_status_ck;
    ALTER TABLE hrs.outbox_event
        DROP CONSTRAINT IF EXISTS outbox_event_pk;

    -- 4. Table: CASCADE is unnecessary — no FK edges reference hrs.outbox_event.
    DROP TABLE hrs.outbox_event;
  END IF;
END $$;

-- 5. Sequence last: OWNED BY hrs.outbox_event.outbox_event_id, so PostgreSQL
--    already dropped it with the table in the normal path; the explicit
--    IF EXISTS drop documents intent and tolerates the orphaned-sequence edge.
DROP SEQUENCE IF EXISTS hrs.outbox_event_id_seq;
