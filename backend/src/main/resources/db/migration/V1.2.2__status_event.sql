-- ============================================================================
-- V1.2.2__status_event.sql — Issue #1215: append-only status_event history
-- (subject CHECK, block/reporting_unit FKs, block_comment link and the time
-- indexes). Also carries the V1.1.3 (#1272) completion comments, block_mark
-- FK and indexes for sibling tables, plus #1300 documentation.
-- ============================================================================
CREATE TABLE IF NOT EXISTS hrs.status_event(
    status_event_id bigint NOT NULL,
    reporting_unit_id bigint,
    block_id bigint,
    status character varying(32) NOT NULL,
    event_type character varying(64) NOT NULL,
    details jsonb,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT status_event_subject_ck CHECK (((reporting_unit_id IS NOT NULL) <>(block_id IS NOT NULL)))
    );

COMMENT ON TABLE hrs.status_event IS 'Append-only lifecycle events for reporting units and blocks.';

COMMENT ON COLUMN hrs.status_event.reporting_unit_id IS 'Foreign key referencing the target reporting unit, if applicable.';

COMMENT ON COLUMN hrs.status_event.block_id IS 'Foreign key referencing the target block, if applicable.';

COMMENT ON COLUMN hrs.status_event.status IS 'Lifecycle status, e.g. DRAFT or SUBMITTED.';

CREATE SEQUENCE IF NOT EXISTS hrs.status_event_id_seq START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.status_event_id_seq OWNED BY hrs.status_event.status_event_id;

ALTER TABLE ONLY hrs.status_event
    ALTER COLUMN status_event_id SET DEFAULT nextval('hrs.status_event_id_seq'::regclass);

ALTER TABLE ONLY hrs.status_event
    DROP CONSTRAINT IF EXISTS status_event_pk CASCADE;

ALTER TABLE ONLY hrs.status_event
    ADD CONSTRAINT status_event_pk PRIMARY KEY (status_event_id);

CREATE INDEX IF NOT EXISTS idx_block_comment_status_event_id ON hrs.block_comment USING btree(status_event_id);

CREATE INDEX IF NOT EXISTS idx_status_event_block_time ON hrs.status_event USING btree(block_id, created_at DESC, status_event_id DESC)
    WHERE (block_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_status_event_reporting_unit_time ON hrs.status_event USING btree(reporting_unit_id, created_at DESC, status_event_id DESC)
    WHERE (reporting_unit_id IS NOT NULL);

ALTER TABLE ONLY hrs.block_comment
    DROP CONSTRAINT IF EXISTS fk_block_comment_status_event CASCADE;

ALTER TABLE ONLY hrs.block_comment
    ADD CONSTRAINT fk_block_comment_status_event FOREIGN KEY (status_event_id) REFERENCES hrs.status_event(status_event_id);

ALTER TABLE ONLY hrs.status_event
    DROP CONSTRAINT IF EXISTS fk_status_event_block CASCADE;

ALTER TABLE ONLY hrs.status_event
    ADD CONSTRAINT fk_status_event_block FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE ONLY hrs.status_event
    DROP CONSTRAINT IF EXISTS fk_status_event_reporting_unit CASCADE;

ALTER TABLE ONLY hrs.status_event
    ADD CONSTRAINT fk_status_event_reporting_unit FOREIGN KEY (reporting_unit_id) REFERENCES hrs.reporting_unit(reporting_unit_id);

-- ============================================================================
-- V1.1.3__submission_schema_completion.sql — Issue #1272: submission schema
-- completion (column additions folded into the table definitions above;
-- comments, FK and index carried here).
-- ============================================================================
COMMENT ON COLUMN hrs.block_area_segment.block_mark_id IS 'Optional foreign key referencing the associated block mark.';

COMMENT ON COLUMN hrs.block_area_segment.starting_area_ha IS 'Starting area for the segment in hectares.';

COMMENT ON COLUMN hrs.block_area_segment.net_waste_area_ha IS 'Calculated net waste area for the segment in hectares.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.calculated_at IS 'Timestamp at which the calculation was performed.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.rounding_policy IS 'Rounding policy applied during calculation.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.warnings IS 'JSON array of warnings generated during calculation.';

COMMENT ON COLUMN hrs.block_mark.forest_file_id IS 'Forest file identifier associated with the mark.';

COMMENT ON COLUMN hrs.block_mark.timber_mark IS 'Timber mark identifier.';

COMMENT ON COLUMN hrs.block_mark.cutting_permit_id IS 'Cutting permit identifier.';

COMMENT ON COLUMN hrs.block_mark.cut_block_id IS 'Cut block identifier.';

COMMENT ON COLUMN hrs.block_sponsor.first_name IS 'Sponsor first name, entered on the endorsement form (added V1.1.3). Distinct from sponsor_name, which is IDP-sourced.';

COMMENT ON COLUMN hrs.block_sponsor.last_name IS 'Sponsor last name, entered on the endorsement form (added V1.1.3). Distinct from sponsor_name, which is IDP-sourced.';

COMMENT ON COLUMN hrs.block_sponsor.designation IS 'Sponsor professional designation.';

COMMENT ON COLUMN hrs.block_sponsor.licence_no IS 'Professional forester licence number (RPF/RFT designation) — not a general business licence.';

COMMENT ON COLUMN hrs.block_sponsor.email IS 'Sponsor email address.';

COMMENT ON COLUMN hrs.block_sponsor.phone IS 'Sponsor telephone number.';

COMMENT ON COLUMN hrs.block_submitter.first_name IS 'Submitter first name, entered on the endorsement form (added V1.1.3). Distinct from submitter_name, which is IDP-sourced.';

COMMENT ON COLUMN hrs.block_submitter.last_name IS 'Submitter last name, entered on the endorsement form (added V1.1.3). Distinct from submitter_name, which is IDP-sourced.';

COMMENT ON COLUMN hrs.block_submitter.designation IS 'Submitter professional designation.';

COMMENT ON COLUMN hrs.block_submitter.licence_no IS 'Professional forester licence number (RPF/RFT designation) — not a general business licence.';

COMMENT ON COLUMN hrs.block_submitter.email IS 'Submitter email address.';

COMMENT ON COLUMN hrs.block_submitter.phone IS 'Submitter telephone number.';

COMMENT ON COLUMN hrs.district_average_block.coast_ground_based_area_ha IS 'Coast ground-based logging area in hectares.';

COMMENT ON COLUMN hrs.district_average_block.harvest_status_code IS 'Harvest status code supplied for the submission block.';

COMMENT ON COLUMN hrs.district_average_block.bec_zone IS 'Biogeoclimatic ecosystem classification zone for Interior blocks.';

COMMENT ON COLUMN hrs.district_average_block.bec_subvariant IS 'Biogeoclimatic ecosystem classification subvariant for Interior blocks.';

COMMENT ON COLUMN hrs.district_average_block.has_dispersed_retention IS 'Whether dispersed retention applies to the submission block.';

COMMENT ON COLUMN hrs.district_average_block.dispersed_retention_pct IS 'Dispersed retention percentage when dispersed retention applies.';

COMMENT ON COLUMN hrs.district_average_block.primary_logging_complete_date IS 'Date primary logging was completed.';

COMMENT ON COLUMN hrs.district_average_block.cable_yarding_area_ha IS 'Area harvested using cable yarding in hectares.';

COMMENT ON COLUMN hrs.district_average_block.skyline_logging_area_ha IS 'Area harvested using skyline logging in hectares.';

CREATE INDEX IF NOT EXISTS idx_block_area_segment_block_mark_id ON hrs.block_area_segment USING btree(block_mark_id);

CREATE INDEX IF NOT EXISTS idx_block_calculation_snapshot_latest ON hrs.block_calculation_snapshot USING btree(block_id, calculated_at DESC NULLS LAST, block_calculation_snapshot_id DESC);

ALTER TABLE ONLY hrs.block_area_segment
    DROP CONSTRAINT IF EXISTS fk_block_area_segment_block_mark CASCADE;

ALTER TABLE ONLY hrs.block_area_segment
    ADD CONSTRAINT fk_block_area_segment_block_mark FOREIGN KEY (block_mark_id) REFERENCES hrs.block_mark(block_mark_id);

-- ============================================================================
-- V1.1.8__da_schema_standards.sql — Issue #1300: column
-- documentation (and FK constraints) for the tables owned by this file.
-- ============================================================================
COMMENT ON COLUMN hrs.status_event.status_event_id IS 'Unique identifier for the status event.';

COMMENT ON COLUMN hrs.status_event.event_type IS 'Action event type, e.g. SUBMISSION_CREATED.';

COMMENT ON COLUMN hrs.status_event.details IS 'JSON payload containing event metadata.';

COMMENT ON COLUMN hrs.status_event.created_by IS 'Audit actor that generated the event.';

COMMENT ON COLUMN hrs.status_event.updated_by IS 'Audit actor that last updated the event record.';

COMMENT ON COLUMN hrs.status_event.created_at IS 'Timestamp when the status event was created.';

COMMENT ON COLUMN hrs.status_event.updated_at IS 'Timestamp when the status event was last updated.';
