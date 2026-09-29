-- ============================================================================
-- V1.2.1__submission_evidence_and_endorsement.sql — Issue #1215: evidence
-- and endorsement tables (block_attachment, block_comment, block_requirement,
-- block_sponsor, block_submitter, block_calculation_snapshot) with sequences,
-- FKs and indexes. Attachment upload-lifecycle columns from #1225, the
-- upload cleanup index from #1226 and column documentation from #1300 are
-- folded in.
-- ============================================================================
CREATE TABLE IF NOT EXISTS hrs.block_attachment(
    block_attachment_id bigint NOT NULL,
    block_id bigint NOT NULL,
    object_key character varying(512) NOT NULL,
    file_name character varying(255),
    content_type character varying(128),
    file_size_bytes bigint,
    scan_status character varying(32) DEFAULT 'PENDING'::character varying NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    document_type character varying(64),
    status character varying(32) DEFAULT 'UPLOADING'::character varying NOT NULL,
    checksum character varying(128),
    CONSTRAINT chk_block_attachment_document_type CHECK (((document_type IS NULL) OR document_type IN ('FINAL_MAP', 'POST_HARVEST_CERTIFICATE', 'RATIONALE', 'ENDORSEMENT_LETTER', 'CALCULATOR_SPREADSHEET', 'HBS_BILLING_REPORT', 'REDUCTION_FACTOR_SUPPORT', 'OTHER'))),
    CONSTRAINT chk_block_attachment_scan_status CHECK (scan_status IN ('PENDING', 'CLEAN', 'QUARANTINED', 'FAILED')),
    CONSTRAINT chk_block_attachment_status CHECK (status IN ('UPLOADING', 'FINALIZED'))
    );

COMMENT ON TABLE hrs.block_attachment IS 'Evidence attachment metadata; object content is stored outside PostgreSQL.';

CREATE SEQUENCE IF NOT EXISTS hrs.block_attachment_id_seq START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.block_attachment_id_seq OWNED BY hrs.block_attachment.block_attachment_id;

CREATE TABLE IF NOT EXISTS hrs.block_calculation_snapshot(
    block_calculation_snapshot_id bigint NOT NULL,
    block_id bigint NOT NULL,
    district_volume_id bigint NOT NULL,
    hbs_window_start date,
    hbs_window_end date,
    inputs jsonb NOT NULL,
    outputs jsonb NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    calculated_at timestamp with time zone,
    rounding_policy character varying(64),
    warnings jsonb
    );

COMMENT ON TABLE hrs.block_calculation_snapshot IS 'Append-only calculation inputs and outputs pinned to a district-volume configuration.';

CREATE SEQUENCE IF NOT EXISTS hrs.block_calculation_snapshot_id_seq START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.block_calculation_snapshot_id_seq OWNED BY hrs.block_calculation_snapshot.block_calculation_snapshot_id;

CREATE TABLE IF NOT EXISTS hrs.block_comment(
    block_comment_id bigint NOT NULL,
    block_id bigint NOT NULL,
    context character varying(32) NOT NULL,
    comment character varying(4000) NOT NULL,
    status_event_id bigint,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL
    );

COMMENT ON TABLE hrs.block_comment IS 'Submission block comments, including status-event context.';

CREATE SEQUENCE IF NOT EXISTS hrs.block_comment_id_seq START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.block_comment_id_seq OWNED BY hrs.block_comment.block_comment_id;

CREATE TABLE IF NOT EXISTS hrs.block_requirement(
    block_requirement_id bigint NOT NULL,
    block_id bigint NOT NULL,
    requirement_code character varying(64) NOT NULL,
    is_answered_yes boolean,
    response character varying(4000),
    linked_attachment_id bigint,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL
    );

COMMENT ON TABLE hrs.block_requirement IS 'Requirement responses and optional evidence links for a submission block.';

CREATE SEQUENCE IF NOT EXISTS hrs.block_requirement_id_seq START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.block_requirement_id_seq OWNED BY hrs.block_requirement.block_requirement_id;

CREATE TABLE IF NOT EXISTS hrs.block_sponsor(
    block_sponsor_id bigint NOT NULL,
    block_id bigint NOT NULL,
    sponsor_id character varying(128) NOT NULL,
    sponsor_name character varying(255),
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    first_name character varying(128) NOT NULL,
    last_name character varying(128) NOT NULL,
    designation character varying(128),
    licence_no character varying(128),
    email character varying(320),
    phone character varying(64)
    );

CREATE SEQUENCE IF NOT EXISTS hrs.block_sponsor_id_seq START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.block_sponsor_id_seq OWNED BY hrs.block_sponsor.block_sponsor_id;

CREATE TABLE IF NOT EXISTS hrs.block_submitter(
    block_submitter_id bigint NOT NULL,
    block_id bigint NOT NULL,
    submitter_id character varying(128) NOT NULL,
    submitter_name character varying(255),
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    first_name character varying(128) NOT NULL,
    last_name character varying(128) NOT NULL,
    designation character varying(128),
    licence_no character varying(128),
    email character varying(320),
    phone character varying(64)
    );

CREATE SEQUENCE IF NOT EXISTS hrs.block_submitter_id_seq START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.block_submitter_id_seq OWNED BY hrs.block_submitter.block_submitter_id;

ALTER TABLE ONLY hrs.block_attachment
    ALTER COLUMN block_attachment_id SET DEFAULT nextval('hrs.block_attachment_id_seq'::regclass);

ALTER TABLE ONLY hrs.block_calculation_snapshot
    ALTER COLUMN block_calculation_snapshot_id SET DEFAULT nextval('hrs.block_calculation_snapshot_id_seq'::regclass);

ALTER TABLE ONLY hrs.block_comment
    ALTER COLUMN block_comment_id SET DEFAULT nextval('hrs.block_comment_id_seq'::regclass);

ALTER TABLE ONLY hrs.block_requirement
    ALTER COLUMN block_requirement_id SET DEFAULT nextval('hrs.block_requirement_id_seq'::regclass);

ALTER TABLE ONLY hrs.block_sponsor
    ALTER COLUMN block_sponsor_id SET DEFAULT nextval('hrs.block_sponsor_id_seq'::regclass);

ALTER TABLE ONLY hrs.block_submitter
    ALTER COLUMN block_submitter_id SET DEFAULT nextval('hrs.block_submitter_id_seq'::regclass);

ALTER TABLE ONLY hrs.block_attachment
    DROP CONSTRAINT IF EXISTS block_attachment_pk CASCADE;

ALTER TABLE ONLY hrs.block_attachment
    ADD CONSTRAINT block_attachment_pk PRIMARY KEY (block_attachment_id);

ALTER TABLE ONLY hrs.block_calculation_snapshot
    DROP CONSTRAINT IF EXISTS block_calculation_snapshot_pk CASCADE;

ALTER TABLE ONLY hrs.block_calculation_snapshot
    ADD CONSTRAINT block_calculation_snapshot_pk PRIMARY KEY (block_calculation_snapshot_id);

ALTER TABLE ONLY hrs.block_comment
    DROP CONSTRAINT IF EXISTS block_comment_pk CASCADE;

ALTER TABLE ONLY hrs.block_comment
    ADD CONSTRAINT block_comment_pk PRIMARY KEY (block_comment_id);

ALTER TABLE ONLY hrs.block_requirement
    DROP CONSTRAINT IF EXISTS block_requirement_pk CASCADE;

ALTER TABLE ONLY hrs.block_requirement
    ADD CONSTRAINT block_requirement_pk PRIMARY KEY (block_requirement_id);

ALTER TABLE ONLY hrs.block_sponsor
    DROP CONSTRAINT IF EXISTS block_sponsor_pk CASCADE;

ALTER TABLE ONLY hrs.block_sponsor
    ADD CONSTRAINT block_sponsor_pk PRIMARY KEY (block_sponsor_id);

ALTER TABLE ONLY hrs.block_submitter
    DROP CONSTRAINT IF EXISTS block_submitter_pk CASCADE;

ALTER TABLE ONLY hrs.block_submitter
    ADD CONSTRAINT block_submitter_pk PRIMARY KEY (block_submitter_id);

CREATE INDEX IF NOT EXISTS idx_block_attachment_block_id ON hrs.block_attachment USING btree(block_id);

CREATE INDEX IF NOT EXISTS idx_block_calculation_snapshot_block_id ON hrs.block_calculation_snapshot USING btree(block_id, block_calculation_snapshot_id DESC);

CREATE INDEX IF NOT EXISTS idx_block_calculation_snapshot_district_volume_id ON hrs.block_calculation_snapshot USING btree(district_volume_id);

CREATE INDEX IF NOT EXISTS idx_block_comment_block_id ON hrs.block_comment USING btree(block_id);

CREATE INDEX IF NOT EXISTS idx_block_sponsor_block_id ON hrs.block_sponsor USING btree(block_id);

CREATE INDEX IF NOT EXISTS idx_block_submitter_block_id ON hrs.block_submitter USING btree(block_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_block_requirement_live ON hrs.block_requirement USING btree(block_id, requirement_code)
    WHERE (is_deleted = false);

ALTER TABLE ONLY hrs.block_attachment
    DROP CONSTRAINT IF EXISTS fk_block_attachment_block CASCADE;

ALTER TABLE ONLY hrs.block_attachment
    ADD CONSTRAINT fk_block_attachment_block FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE ONLY hrs.block_calculation_snapshot
    DROP CONSTRAINT IF EXISTS fk_block_calculation_snapshot_block CASCADE;

ALTER TABLE ONLY hrs.block_calculation_snapshot
    ADD CONSTRAINT fk_block_calculation_snapshot_block FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE ONLY hrs.block_calculation_snapshot
    DROP CONSTRAINT IF EXISTS fk_block_calculation_snapshot_district_volume CASCADE;

ALTER TABLE ONLY hrs.block_calculation_snapshot
    ADD CONSTRAINT fk_block_calculation_snapshot_district_volume FOREIGN KEY (district_volume_id) REFERENCES hrs.district_volume(district_volume_id);

ALTER TABLE ONLY hrs.block_comment
    DROP CONSTRAINT IF EXISTS fk_block_comment_block CASCADE;

ALTER TABLE ONLY hrs.block_comment
    ADD CONSTRAINT fk_block_comment_block FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE ONLY hrs.block_requirement
    DROP CONSTRAINT IF EXISTS fk_block_requirement_attachment CASCADE;

ALTER TABLE ONLY hrs.block_requirement
    ADD CONSTRAINT fk_block_requirement_attachment FOREIGN KEY (linked_attachment_id) REFERENCES hrs.block_attachment(block_attachment_id);

ALTER TABLE ONLY hrs.block_requirement
    DROP CONSTRAINT IF EXISTS fk_block_requirement_block CASCADE;

ALTER TABLE ONLY hrs.block_requirement
    ADD CONSTRAINT fk_block_requirement_block FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE ONLY hrs.block_sponsor
    DROP CONSTRAINT IF EXISTS fk_block_sponsor_block CASCADE;

ALTER TABLE ONLY hrs.block_sponsor
    ADD CONSTRAINT fk_block_sponsor_block FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE ONLY hrs.block_submitter
    DROP CONSTRAINT IF EXISTS fk_block_submitter_block CASCADE;

ALTER TABLE ONLY hrs.block_submitter
    ADD CONSTRAINT fk_block_submitter_block FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

-- ============================================================================
-- V1.1.8__da_schema_standards.sql — Issue #1300: column
-- documentation (and FK constraints) for the tables owned by this file.
-- ============================================================================
COMMENT ON COLUMN hrs.block_attachment.block_attachment_id IS 'Unique identifier for the attachment record.';

COMMENT ON COLUMN hrs.block_attachment.block_id IS 'Foreign key referencing the parent block.';

COMMENT ON COLUMN hrs.block_attachment.object_key IS 'Object storage S3 key for the uploaded file.';

COMMENT ON COLUMN hrs.block_attachment.file_name IS 'Original file name.';

COMMENT ON COLUMN hrs.block_attachment.content_type IS 'MIME media type of the attachment.';

COMMENT ON COLUMN hrs.block_attachment.file_size_bytes IS 'Attachment size in bytes.';

COMMENT ON COLUMN hrs.block_attachment.scan_status IS 'Malware scan status: PENDING while awaiting verdict, CLEAN if safe, QUARANTINED if malicious/suspicious, FAILED if scanning errored.';

COMMENT ON COLUMN hrs.block_attachment.created_by IS 'Audit actor that uploaded the attachment.';

COMMENT ON COLUMN hrs.block_attachment.updated_by IS 'Audit actor that last updated the attachment metadata.';

COMMENT ON COLUMN hrs.block_attachment.created_at IS 'Timestamp when the attachment was created.';

COMMENT ON COLUMN hrs.block_attachment.updated_at IS 'Timestamp when the attachment was last updated.';

COMMENT ON COLUMN hrs.block_attachment.is_deleted IS 'Soft-delete flag.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.block_calculation_snapshot_id IS 'Unique identifier for the calculation snapshot.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.block_id IS 'Foreign key referencing the parent block.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.district_volume_id IS 'Foreign key referencing the district volume configuration version.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.hbs_window_start IS 'Harvest Billing System window start date.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.hbs_window_end IS 'Harvest Billing System window end date.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.inputs IS 'JSON snapshot of calculation input parameters.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.outputs IS 'JSON snapshot of calculation output results.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.created_by IS 'Audit actor that produced the snapshot.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.updated_by IS 'Audit actor that last updated the snapshot record.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.created_at IS 'Timestamp when the snapshot was recorded.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.updated_at IS 'Timestamp when the snapshot was last updated.';

COMMENT ON COLUMN hrs.block_comment.block_comment_id IS 'Unique identifier for the comment.';

COMMENT ON COLUMN hrs.block_comment.block_id IS 'Foreign key referencing the parent block.';

COMMENT ON COLUMN hrs.block_comment.context IS 'Comment type: GENERAL (standalone block comment), SUBMISSION (endorsement-tab comment), or accompanies a lifecycle transition when status_event_id is populated.';

COMMENT ON COLUMN hrs.block_comment.comment IS 'Body text of the comment (max 4000 chars).';

COMMENT ON COLUMN hrs.block_comment.status_event_id IS 'Optional foreign key referencing the triggering status event.';

COMMENT ON COLUMN hrs.block_comment.created_by IS 'Audit actor that created this comment.';

COMMENT ON COLUMN hrs.block_comment.updated_by IS 'Audit actor that last updated this comment.';

COMMENT ON COLUMN hrs.block_comment.created_at IS 'Timestamp when this comment was created.';

COMMENT ON COLUMN hrs.block_comment.updated_at IS 'Timestamp when this comment was last updated.';

COMMENT ON COLUMN hrs.block_comment.is_deleted IS 'Soft-delete flag.';

COMMENT ON COLUMN hrs.block_requirement.block_requirement_id IS 'Unique identifier for the requirement response.';

COMMENT ON COLUMN hrs.block_requirement.block_id IS 'Foreign key referencing the parent block.';

COMMENT ON COLUMN hrs.block_requirement.requirement_code IS 'Stable requirement code.';

COMMENT ON COLUMN hrs.block_requirement.is_answered_yes IS 'Whether the requirement question was answered affirmatively.';

COMMENT ON COLUMN hrs.block_requirement.response IS 'Textual requirement response explanation (max 4000 chars).';

COMMENT ON COLUMN hrs.block_requirement.linked_attachment_id IS 'Optional foreign key referencing an evidence attachment.';

COMMENT ON COLUMN hrs.block_requirement.created_by IS 'Audit actor that created this requirement response.';

COMMENT ON COLUMN hrs.block_requirement.updated_by IS 'Audit actor that last updated this requirement response.';

COMMENT ON COLUMN hrs.block_requirement.created_at IS 'Timestamp when this requirement response was created.';

COMMENT ON COLUMN hrs.block_requirement.updated_at IS 'Timestamp when this requirement response was last updated.';

COMMENT ON COLUMN hrs.block_requirement.is_deleted IS 'Soft-delete flag.';

COMMENT ON TABLE hrs.block_sponsor IS 'Sponsor endorsement details for a block.';

COMMENT ON COLUMN hrs.block_sponsor.block_sponsor_id IS 'Unique identifier for the sponsor endorsement record.';

COMMENT ON COLUMN hrs.block_sponsor.block_id IS 'Foreign key referencing the parent block.';

COMMENT ON COLUMN hrs.block_sponsor.sponsor_id IS 'Business identifier of the sponsor.';

COMMENT ON COLUMN hrs.block_sponsor.sponsor_name IS 'Read-only display name from the identity provider (BCeID/IDIR), captured at submission time.';

COMMENT ON COLUMN hrs.block_sponsor.created_by IS 'Audit actor that created this sponsor record.';

COMMENT ON COLUMN hrs.block_sponsor.updated_by IS 'Audit actor that last updated this sponsor record.';

COMMENT ON COLUMN hrs.block_sponsor.created_at IS 'Timestamp when this sponsor record was created.';

COMMENT ON COLUMN hrs.block_sponsor.updated_at IS 'Timestamp when this sponsor record was last updated.';

COMMENT ON COLUMN hrs.block_sponsor.is_deleted IS 'Soft-delete flag.';

COMMENT ON TABLE hrs.block_submitter IS 'Submitter endorsement details for a block.';

COMMENT ON COLUMN hrs.block_submitter.block_submitter_id IS 'Unique identifier for the submitter endorsement record.';

COMMENT ON COLUMN hrs.block_submitter.block_id IS 'Foreign key referencing the parent block.';

COMMENT ON COLUMN hrs.block_submitter.submitter_id IS 'Business identifier of the submitter.';

COMMENT ON COLUMN hrs.block_submitter.submitter_name IS 'Read-only display name from the identity provider (BCeID/IDIR), captured at submission time.';

COMMENT ON COLUMN hrs.block_submitter.created_by IS 'Audit actor that created this submitter record.';

COMMENT ON COLUMN hrs.block_submitter.updated_by IS 'Audit actor that last updated this submitter record.';

COMMENT ON COLUMN hrs.block_submitter.created_at IS 'Timestamp when this submitter record was created.';

COMMENT ON COLUMN hrs.block_submitter.updated_at IS 'Timestamp when this submitter record was last updated.';

COMMENT ON COLUMN hrs.block_submitter.is_deleted IS 'Soft-delete flag.';

-- ============================================================================
-- V1.1.9__block_attachment_upload_lifecycle.sql — Issue #1225: column
-- comments for the upload-lifecycle columns folded into the block_attachment
-- definition above.
-- ============================================================================
COMMENT ON COLUMN hrs.block_attachment.document_type IS 'Evidence document category: FINAL_MAP, POST_HARVEST_CERTIFICATE, RATIONALE, ENDORSEMENT_LETTER, CALCULATOR_SPREADSHEET, HBS_BILLING_REPORT, REDUCTION_FACTOR_SUPPORT or OTHER.';

COMMENT ON COLUMN hrs.block_attachment.status IS 'Upload lifecycle state: UPLOADING while the client is expected to upload, FINALIZED once the object has been verified and accepted.';

COMMENT ON COLUMN hrs.block_attachment.checksum IS 'Object-store ETag/checksum captured at finalize; a later finalize attempt whose object ETag differs is rejected with a conflict.';

-- ============================================================================
-- V1.1.10__block_attachment_scan_status_and_cleanup.sql — Issue #1226:
-- cleanup index for rows stuck in UPLOADING (column default, NOT NULL and
-- CHECK folded into the block_attachment definition above).
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_block_attachment_uploading_cleanup ON hrs.block_attachment USING btree(created_at)
    WHERE (((status)::text = 'UPLOADING'::text) AND (is_deleted = false));
