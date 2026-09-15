-- Issue #1225: block_attachment upload lifecycle.
-- Adds the columns backing the intent/presign/finalize flow:
--   * document_type - allowlisted evidence category supplied at intent time
--   * status        - upload lifecycle state (UPLOADING -> FINALIZED)
--   * checksum      - object-store ETag captured at finalize, used to detect
--                     object replacement between verification attempts.

ALTER TABLE hrs.block_attachment
    ADD COLUMN IF NOT EXISTS document_type VARCHAR(64),
    ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'UPLOADING',
    ADD COLUMN IF NOT EXISTS checksum VARCHAR(128);

-- Rows that predate the upload lifecycle hold already-uploaded evidence, so
-- they are treated as finalized rather than pending uploads.
UPDATE hrs.block_attachment SET status = 'FINALIZED' WHERE status = 'UPLOADING';

ALTER TABLE hrs.block_attachment DROP CONSTRAINT IF EXISTS chk_block_attachment_status;
ALTER TABLE hrs.block_attachment
    ADD CONSTRAINT chk_block_attachment_status
    CHECK (status IN ('UPLOADING', 'FINALIZED'));

ALTER TABLE hrs.block_attachment DROP CONSTRAINT IF EXISTS chk_block_attachment_document_type;
ALTER TABLE hrs.block_attachment
    ADD CONSTRAINT chk_block_attachment_document_type
    CHECK (document_type IS NULL OR document_type IN (
        'FINAL_MAP',
        'POST_HARVEST_CERTIFICATE',
        'RATIONALE',
        'ENDORSEMENT_LETTER',
        'CALCULATOR_SPREADSHEET',
        'HBS_BILLING_REPORT',
        'REDUCTION_FACTOR_SUPPORT',
        'OTHER'
    ));

COMMENT ON COLUMN hrs.block_attachment.document_type IS
    'Evidence document category: FINAL_MAP, POST_HARVEST_CERTIFICATE, RATIONALE, ENDORSEMENT_LETTER, CALCULATOR_SPREADSHEET, HBS_BILLING_REPORT, REDUCTION_FACTOR_SUPPORT or OTHER.';
COMMENT ON COLUMN hrs.block_attachment.status IS
    'Upload lifecycle state: UPLOADING while the client is expected to upload, FINALIZED once the object has been verified and accepted.';
COMMENT ON COLUMN hrs.block_attachment.checksum IS
    'Object-store ETag/checksum captured at finalize; a later finalize attempt whose object ETag differs is rejected with a conflict.';
