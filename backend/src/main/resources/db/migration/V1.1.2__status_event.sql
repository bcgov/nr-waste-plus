-- Issue #1215: shared append-only lifecycle history for reporting units and
-- blocks.  Status vocabulary is intentionally service-owned for now.

CREATE TABLE IF NOT EXISTS hrs.status_event (
    id BIGSERIAL,
    reporting_unit_id BIGINT,
    block_id BIGINT,
    status VARCHAR(32) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    details JSONB,
    created_by VARCHAR(128) NOT NULL,
    updated_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT status_event_pk PRIMARY KEY (id),
    CONSTRAINT fk_status_event_reporting_unit
        FOREIGN KEY (reporting_unit_id) REFERENCES hrs.reporting_unit(id),
    CONSTRAINT fk_status_event_block
        FOREIGN KEY (block_id) REFERENCES hrs.block(id),
    CONSTRAINT status_event_subject_ck
        CHECK ((reporting_unit_id IS NOT NULL) <> (block_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_status_event_reporting_unit_time
    ON hrs.status_event (reporting_unit_id, created_at DESC, id DESC)
    WHERE reporting_unit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_status_event_block_time
    ON hrs.status_event (block_id, created_at DESC, id DESC)
    WHERE block_id IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_block_comment_status_event'
          AND conrelid = 'hrs.block_comment'::regclass
    ) THEN
        ALTER TABLE hrs.block_comment
            ADD CONSTRAINT fk_block_comment_status_event
            FOREIGN KEY (status_event_id) REFERENCES hrs.status_event(id);
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_block_comment_status_event_id
    ON hrs.block_comment (status_event_id);

COMMENT ON TABLE hrs.status_event IS 'Append-only lifecycle events for reporting units and blocks.';
COMMENT ON COLUMN hrs.status_event.status IS 'Service-validated lifecycle status; no database vocabulary check is imposed yet.';
COMMENT ON COLUMN hrs.status_event.reporting_unit_id IS 'Set for a reporting-unit event; exactly one status-event subject is required.';
COMMENT ON COLUMN hrs.status_event.block_id IS 'Set for a block event; exactly one status-event subject is required.';
