-- Issue #1226: Attachment scanning, quarantine gating, and cleanup.
-- Enforces scan_status check constraint: PENDING, CLEAN, QUARANTINED, FAILED.
-- Adds partial index on (created_at) where status = 'UPLOADING' to support
-- the scheduled cleanup job purging abandoned upload intents.

-- Fail closed: ensure existing NULL or unknown rows default to PENDING before adding constraints
UPDATE hrs.block_attachment
   SET scan_status = 'PENDING'
 WHERE scan_status IS NULL
    OR scan_status NOT IN ('PENDING', 'CLEAN', 'QUARANTINED', 'FAILED');

ALTER TABLE hrs.block_attachment
    ALTER COLUMN scan_status SET DEFAULT 'PENDING',
    ALTER COLUMN scan_status SET NOT NULL;

ALTER TABLE hrs.block_attachment DROP CONSTRAINT IF EXISTS chk_block_attachment_scan_status;
ALTER TABLE hrs.block_attachment
    ADD CONSTRAINT chk_block_attachment_scan_status
    CHECK (scan_status IN ('PENDING', 'CLEAN', 'QUARANTINED', 'FAILED'));

COMMENT ON COLUMN hrs.block_attachment.scan_status IS
    'Malware scan status: PENDING while awaiting verdict, CLEAN if safe, QUARANTINED if malicious/suspicious, FAILED if scanning errored.';

CREATE INDEX IF NOT EXISTS idx_block_attachment_uploading_cleanup
    ON hrs.block_attachment (created_at)
    WHERE status = 'UPLOADING' AND is_deleted = FALSE;
