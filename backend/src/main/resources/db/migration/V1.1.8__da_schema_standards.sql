-- Issue #1300: DA Schema Standards Migration — V1.1.8
-- Aligns District Average feature schema with organizational data modeling standards.

-- ============================================================================
-- Phase 1: DROP old FK constraints (order: child -> parent)
-- ============================================================================

ALTER TABLE hrs.block_comment DROP CONSTRAINT IF EXISTS fk_block_comment_status_event;
ALTER TABLE hrs.block_comment DROP CONSTRAINT IF EXISTS fk_block_comment_block;
ALTER TABLE hrs.block_requirement DROP CONSTRAINT IF EXISTS fk_block_requirement_attachment;
ALTER TABLE hrs.block_requirement DROP CONSTRAINT IF EXISTS fk_block_requirement_block;
ALTER TABLE hrs.block_area_segment DROP CONSTRAINT IF EXISTS fk_block_area_segment_block_mark;
ALTER TABLE hrs.block_area_segment DROP CONSTRAINT IF EXISTS fk_block_area_segment_block;
ALTER TABLE hrs.block_calculation_snapshot DROP CONSTRAINT IF EXISTS fk_block_calculation_snapshot_district_volume;
ALTER TABLE hrs.block_calculation_snapshot DROP CONSTRAINT IF EXISTS fk_block_calculation_snapshot_block;
ALTER TABLE hrs.district_average_block DROP CONSTRAINT IF EXISTS fk_district_average_block_block;
ALTER TABLE hrs.block_attachment DROP CONSTRAINT IF EXISTS fk_block_attachment_block;
ALTER TABLE hrs.block_submitter DROP CONSTRAINT IF EXISTS fk_block_submitter_block;
ALTER TABLE hrs.block_sponsor DROP CONSTRAINT IF EXISTS fk_block_sponsor_block;
ALTER TABLE hrs.block_mark DROP CONSTRAINT IF EXISTS fk_block_mark_block;
ALTER TABLE hrs.status_event DROP CONSTRAINT IF EXISTS fk_status_event_reporting_unit;
ALTER TABLE hrs.status_event DROP CONSTRAINT IF EXISTS fk_status_event_block;
ALTER TABLE hrs.block DROP CONSTRAINT IF EXISTS fk_block_reporting_unit;
ALTER TABLE hrs.audit_change DROP CONSTRAINT IF EXISTS audit_change_event_id_fkey;
ALTER TABLE hrs.audit_change DROP CONSTRAINT IF EXISTS fk_audit_change_event;
ALTER TABLE hrs.district_volume_formula DROP CONSTRAINT IF EXISTS fk_district_volume_formula_district_volume;
ALTER TABLE hrs.formula_set_row DROP CONSTRAINT IF EXISTS formula_set_row_formula_set_id_fkey;
ALTER TABLE hrs.formula_set_row DROP CONSTRAINT IF EXISTS fk_formula_set_row_formula_set;

-- ============================================================================
-- Phase 2: PK renames (id -> table_name_id) — tables with an id primary key column
-- ============================================================================

DO $$
DECLARE
    tbl text;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'district_volume',
        'reporting_unit',
        'block',
        'block_mark',
        'block_area_segment',
        'block_attachment',
        'block_submitter',
        'block_sponsor',
        'block_requirement',
        'block_comment',
        'block_calculation_snapshot',
        'status_event',
        'audit_event',
        'audit_change',
        'outbox_event',
        'idempotency_record',
        'district_volume_formula',
        'lifecycle_setting',
        'formula_set',
        'formula_set_row'
    ]
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'hrs' AND table_name = tbl AND column_name = 'id'
        ) THEN
            EXECUTE format('ALTER TABLE hrs.%I RENAME COLUMN id TO %I', tbl, tbl || '_id');
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- Phase 3: Ensure FK column names are descriptive and non-abbreviated
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'hrs' AND table_name = 'block' AND column_name = 'ru_id'
    ) THEN
        ALTER TABLE hrs.block RENAME COLUMN ru_id TO reporting_unit_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'hrs' AND table_name = 'district_average_block' AND column_name = 'block_id'
    ) THEN
        ALTER TABLE hrs.district_average_block RENAME COLUMN block_id TO district_average_block_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'hrs' AND table_name = 'district_average_block' AND column_name = 'dab_id'
    ) THEN
        ALTER TABLE hrs.district_average_block RENAME COLUMN dab_id TO district_average_block_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'hrs' AND table_name = 'block_area_segment' AND column_name = 'bm_id'
    ) THEN
        ALTER TABLE hrs.block_area_segment RENAME COLUMN bm_id TO block_mark_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'hrs' AND table_name = 'block_calculation_snapshot' AND column_name = 'dv_id'
    ) THEN
        ALTER TABLE hrs.block_calculation_snapshot RENAME COLUMN dv_id TO district_volume_id;
    END IF;
END $$;

-- ============================================================================
-- Phase 4: Boolean column renames (14 columns)
-- ============================================================================

DO $$
DECLARE
    tbl text;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'hrs' AND table_name = 'district_average_block' AND column_name = 'heli_logging'
    ) THEN
        ALTER TABLE hrs.district_average_block RENAME COLUMN heli_logging TO is_heli_logging;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'hrs' AND table_name = 'block_requirement' AND column_name = 'answered_yes'
    ) THEN
        ALTER TABLE hrs.block_requirement RENAME COLUMN answered_yes TO is_answered_yes;
    END IF;

    FOREACH tbl IN ARRAY ARRAY[
        'district_volume',
        'reporting_unit',
        'block',
        'district_average_block',
        'block_mark',
        'block_area_segment',
        'block_attachment',
        'block_submitter',
        'block_sponsor',
        'block_requirement',
        'block_comment',
        'formula_set',
        'formula_set_row'
    ]
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'hrs' AND table_name = tbl AND column_name = 'deleted'
        ) THEN
            EXECUTE format('ALTER TABLE hrs.%I RENAME COLUMN deleted TO is_deleted', tbl);
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- Phase 5: TEXT -> VARCHAR conversions (4 columns)
-- ============================================================================

DO $$
DECLARE
    offending_req_count INT;
    offending_form_count INT;
    offending_comment_count INT;
    offending_fs_row_count INT;
    max_req_len INT;
    max_form_len INT;
    max_comment_len INT;
    max_fs_row_len INT;
BEGIN
    -- Pre-check: Verify no existing rows exceed 4000 characters in block_requirement.response
    SELECT COUNT(*), COALESCE(MAX(LENGTH(response)), 0)
    INTO offending_req_count, max_req_len
    FROM hrs.block_requirement
    WHERE LENGTH(response) > 4000;

    IF offending_req_count > 0 THEN
        RAISE EXCEPTION 'Migration V1.1.8 aborted: hrs.block_requirement contains % row(s) where response exceeds 4000 characters (max length: %). Please clean up or truncate data before applying this migration.',
            offending_req_count, max_req_len;
    END IF;

    -- Pre-check: Verify no existing rows exceed 4000 characters in district_volume_formula.expression
    SELECT COUNT(*), COALESCE(MAX(LENGTH(expression)), 0)
    INTO offending_form_count, max_form_len
    FROM hrs.district_volume_formula
    WHERE LENGTH(expression) > 4000;

    IF offending_form_count > 0 THEN
        RAISE EXCEPTION 'Migration V1.1.8 aborted: hrs.district_volume_formula contains % row(s) where expression exceeds 4000 characters (max length: %). Please clean up or truncate data before applying this migration.',
            offending_form_count, max_form_len;
    END IF;

    -- Pre-check: Verify no existing rows exceed 4000 characters in block_comment.comment
    SELECT COUNT(*), COALESCE(MAX(LENGTH(comment)), 0)
    INTO offending_comment_count, max_comment_len
    FROM hrs.block_comment
    WHERE LENGTH(comment) > 4000;

    IF offending_comment_count > 0 THEN
        RAISE EXCEPTION 'Migration V1.1.8 aborted: hrs.block_comment contains % row(s) where comment exceeds 4000 characters (max length: %). Please clean up or truncate data before applying this migration.',
            offending_comment_count, max_comment_len;
    END IF;

    -- Pre-check: Verify no existing rows exceed 4000 characters in formula_set_row.expression
    SELECT COUNT(*), COALESCE(MAX(LENGTH(expression)), 0)
    INTO offending_fs_row_count, max_fs_row_len
    FROM hrs.formula_set_row
    WHERE LENGTH(expression) > 4000;

    IF offending_fs_row_count > 0 THEN
        RAISE EXCEPTION 'Migration V1.1.8 aborted: hrs.formula_set_row contains % row(s) where expression exceeds 4000 characters (max length: %). Please clean up or truncate data before applying this migration.',
            offending_fs_row_count, max_fs_row_len;
    END IF;

    ALTER TABLE hrs.block_requirement ALTER COLUMN response TYPE VARCHAR(4000);
    ALTER TABLE hrs.district_volume_formula ALTER COLUMN expression TYPE VARCHAR(4000);
    ALTER TABLE hrs.block_comment ALTER COLUMN comment TYPE VARCHAR(4000);
    ALTER TABLE hrs.formula_set_row ALTER COLUMN expression TYPE VARCHAR(4000);
END $$;

-- ============================================================================
-- Phase 6: NOT NULL constraints (6 columns)
-- ============================================================================

UPDATE hrs.block_submitter SET first_name = '' WHERE first_name IS NULL;
UPDATE hrs.block_submitter SET last_name = '' WHERE last_name IS NULL;
UPDATE hrs.block_sponsor SET first_name = '' WHERE first_name IS NULL;
UPDATE hrs.block_sponsor SET last_name = '' WHERE last_name IS NULL;
UPDATE hrs.district_average_block SET has_dispersed_retention = FALSE WHERE has_dispersed_retention IS NULL;
UPDATE hrs.district_average_block SET is_heli_logging = FALSE WHERE is_heli_logging IS NULL;

ALTER TABLE hrs.block_submitter ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE hrs.block_submitter ALTER COLUMN last_name SET NOT NULL;
ALTER TABLE hrs.block_sponsor ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE hrs.block_sponsor ALTER COLUMN last_name SET NOT NULL;
ALTER TABLE hrs.district_average_block ALTER COLUMN has_dispersed_retention SET NOT NULL;
ALTER TABLE hrs.district_average_block ALTER COLUMN is_heli_logging SET NOT NULL;

-- ============================================================================
-- Phase 7: Recreate FK constraints with new names
-- ============================================================================

ALTER TABLE hrs.block
    ADD CONSTRAINT fk_block_reporting_unit
    FOREIGN KEY (reporting_unit_id) REFERENCES hrs.reporting_unit(reporting_unit_id);

ALTER TABLE hrs.district_average_block
    ADD CONSTRAINT fk_district_average_block_block
    FOREIGN KEY (district_average_block_id) REFERENCES hrs.block(block_id);

ALTER TABLE hrs.block_mark
    ADD CONSTRAINT fk_block_mark_block
    FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE hrs.block_area_segment
    ADD CONSTRAINT fk_block_area_segment_block
    FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE hrs.block_area_segment
    ADD CONSTRAINT fk_block_area_segment_block_mark
    FOREIGN KEY (block_mark_id) REFERENCES hrs.block_mark(block_mark_id);

ALTER TABLE hrs.block_attachment
    ADD CONSTRAINT fk_block_attachment_block
    FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE hrs.block_submitter
    ADD CONSTRAINT fk_block_submitter_block
    FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE hrs.block_sponsor
    ADD CONSTRAINT fk_block_sponsor_block
    FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE hrs.block_requirement
    ADD CONSTRAINT fk_block_requirement_block
    FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE hrs.block_requirement
    ADD CONSTRAINT fk_block_requirement_attachment
    FOREIGN KEY (linked_attachment_id) REFERENCES hrs.block_attachment(block_attachment_id);

ALTER TABLE hrs.block_comment
    ADD CONSTRAINT fk_block_comment_block
    FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE hrs.block_comment
    ADD CONSTRAINT fk_block_comment_status_event
    FOREIGN KEY (status_event_id) REFERENCES hrs.status_event(status_event_id);

ALTER TABLE hrs.block_calculation_snapshot
    ADD CONSTRAINT fk_block_calculation_snapshot_block
    FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE hrs.block_calculation_snapshot
    ADD CONSTRAINT fk_block_calculation_snapshot_district_volume
    FOREIGN KEY (district_volume_id) REFERENCES hrs.district_volume(district_volume_id);

ALTER TABLE hrs.status_event
    ADD CONSTRAINT fk_status_event_reporting_unit
    FOREIGN KEY (reporting_unit_id) REFERENCES hrs.reporting_unit(reporting_unit_id);

ALTER TABLE hrs.status_event
    ADD CONSTRAINT fk_status_event_block
    FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE hrs.audit_change
    ADD CONSTRAINT fk_audit_change_event
    FOREIGN KEY (event_id) REFERENCES hrs.audit_event(audit_event_id);

ALTER TABLE hrs.district_volume_formula
    ADD CONSTRAINT fk_district_volume_formula_district_volume
    FOREIGN KEY (district_volume_id) REFERENCES hrs.district_volume(district_volume_id);

ALTER TABLE hrs.formula_set_row
    ADD CONSTRAINT fk_formula_set_row_formula_set
    FOREIGN KEY (formula_set_id) REFERENCES hrs.formula_set(formula_set_id);

-- ============================================================================
-- Phase 8: COMMENT ON TABLE/COLUMN for all tables and columns
-- ============================================================================

COMMENT ON TABLE hrs.district_volume IS 'Stores district waste volume and species composition data used to estimate waste volume on blocks.';
COMMENT ON COLUMN hrs.district_volume.district_volume_id IS 'Unique identifier for the district volume configuration record.';
COMMENT ON COLUMN hrs.district_volume.config_type IS 'Configuration type: DISTRICT_VOLUME or SPECIES_COMPOSITION.';
COMMENT ON COLUMN hrs.district_volume.is_deleted IS 'Soft-delete flag; active queries must filter is_deleted = FALSE.';

COMMENT ON TABLE hrs.reporting_unit IS 'Locally-owned reporting unit for a District Average submission.';
COMMENT ON COLUMN hrs.reporting_unit.reporting_unit_id IS 'Unique identifier for the reporting unit.';
COMMENT ON COLUMN hrs.reporting_unit.client_number IS 'Forest client number.';
COMMENT ON COLUMN hrs.reporting_unit.client_locn_code IS 'Forest client location code.';
COMMENT ON COLUMN hrs.reporting_unit.org_unit_no IS 'Ministry organizational unit number.';
COMMENT ON COLUMN hrs.reporting_unit.revision IS 'Optimistic locking revision counter.';
COMMENT ON COLUMN hrs.reporting_unit.created_by IS 'Audit actor that created this reporting unit.';
COMMENT ON COLUMN hrs.reporting_unit.updated_by IS 'Audit actor that last updated this reporting unit.';
COMMENT ON COLUMN hrs.reporting_unit.created_at IS 'Timestamp when this reporting unit was created.';
COMMENT ON COLUMN hrs.reporting_unit.updated_at IS 'Timestamp when this reporting unit was last updated.';
COMMENT ON COLUMN hrs.reporting_unit.is_deleted IS 'Soft-delete flag; live uniqueness indexes exclude deleted rows.';

COMMENT ON TABLE hrs.block IS 'Submission block belonging to a reporting unit.';
COMMENT ON COLUMN hrs.block.block_id IS 'Unique identifier for the submission block.';
COMMENT ON COLUMN hrs.block.reporting_unit_id IS 'Foreign key referencing the parent reporting unit.';
COMMENT ON COLUMN hrs.block.block_type IS 'Block category, e.g. DISTRICT_AVERAGE.';
COMMENT ON COLUMN hrs.block.is_draft IS 'Whether this block is still an uncommitted draft.';
COMMENT ON COLUMN hrs.block.plc_date IS 'Primary logging complete date.';
COMMENT ON COLUMN hrs.block.revision IS 'Optimistic locking revision counter.';
COMMENT ON COLUMN hrs.block.created_by IS 'Audit actor that created this block.';
COMMENT ON COLUMN hrs.block.updated_by IS 'Audit actor that last updated this block.';
COMMENT ON COLUMN hrs.block.created_at IS 'Timestamp when this block was created.';
COMMENT ON COLUMN hrs.block.updated_at IS 'Timestamp when this block was last updated.';
COMMENT ON COLUMN hrs.block.is_deleted IS 'Soft-delete flag; live uniqueness indexes exclude deleted rows.';

COMMENT ON TABLE hrs.district_average_block IS 'District Average-specific block extension.';
COMMENT ON COLUMN hrs.district_average_block.district_average_block_id IS 'Primary key and foreign key referencing the parent block.';
COMMENT ON COLUMN hrs.district_average_block.benchmark_zone IS 'Benchmark pricing zone.';
COMMENT ON COLUMN hrs.district_average_block.maturity IS 'Timber maturity: MATURE or IMMATURE.';
COMMENT ON COLUMN hrs.district_average_block.retention_percentage IS 'Stand retention percentage.';
COMMENT ON COLUMN hrs.district_average_block.criteria IS 'Integer array of applicable District Average qualifying criteria.';
COMMENT ON COLUMN hrs.district_average_block.coast_ground_based_area_ha IS 'Coast ground-based logging area in hectares.';
COMMENT ON COLUMN hrs.district_average_block.coast_helicopter_area_ha IS 'Coast helicopter logging area in hectares.';
COMMENT ON COLUMN hrs.district_average_block.harvest_status_code IS 'Harvest status code supplied for the submission block.';
COMMENT ON COLUMN hrs.district_average_block.bec_zone IS 'Biogeoclimatic ecosystem classification zone for Interior blocks.';
COMMENT ON COLUMN hrs.district_average_block.bec_subvariant IS 'Biogeoclimatic ecosystem classification subvariant for Interior blocks.';
COMMENT ON COLUMN hrs.district_average_block.has_dispersed_retention IS 'Whether dispersed retention applies to the submission block.';
COMMENT ON COLUMN hrs.district_average_block.dispersed_retention_pct IS 'Dispersed retention percentage when dispersed retention applies.';
COMMENT ON COLUMN hrs.district_average_block.primary_logging_complete_date IS 'Date primary logging was completed.';
COMMENT ON COLUMN hrs.district_average_block.is_heli_logging IS 'Whether helicopter logging applies to the submission block.';
COMMENT ON COLUMN hrs.district_average_block.cable_yarding_area_ha IS 'Area harvested using cable yarding in hectares.';
COMMENT ON COLUMN hrs.district_average_block.skyline_logging_area_ha IS 'Area harvested using skyline logging in hectares.';
COMMENT ON COLUMN hrs.district_average_block.revision IS 'Optimistic locking revision counter.';
COMMENT ON COLUMN hrs.district_average_block.created_by IS 'Audit actor that created this DA extension.';
COMMENT ON COLUMN hrs.district_average_block.updated_by IS 'Audit actor that last updated this DA extension.';
COMMENT ON COLUMN hrs.district_average_block.created_at IS 'Timestamp when this DA extension was created.';
COMMENT ON COLUMN hrs.district_average_block.updated_at IS 'Timestamp when this DA extension was last updated.';
COMMENT ON COLUMN hrs.district_average_block.is_deleted IS 'Soft-delete flag.';

COMMENT ON TABLE hrs.block_mark IS 'Typed forest and road marks associated with a submission block.';
COMMENT ON COLUMN hrs.block_mark.block_mark_id IS 'Unique identifier for the block mark.';
COMMENT ON COLUMN hrs.block_mark.block_id IS 'Foreign key referencing the parent block.';
COMMENT ON COLUMN hrs.block_mark.mark_type IS 'Mark type: PRIMARY or SECONDARY.';
COMMENT ON COLUMN hrs.block_mark.sequence_no IS 'Sequential order number for secondary marks.';
COMMENT ON COLUMN hrs.block_mark.mark IS 'Timber mark or identifier string.';
COMMENT ON COLUMN hrs.block_mark.validation_status IS 'External mark validation state.';
COMMENT ON COLUMN hrs.block_mark.forest_file_id IS 'Forest file identifier associated with the mark.';
COMMENT ON COLUMN hrs.block_mark.timber_mark IS 'Timber mark identifier.';
COMMENT ON COLUMN hrs.block_mark.cutting_permit_id IS 'Cutting permit identifier.';
COMMENT ON COLUMN hrs.block_mark.cut_block_id IS 'Cut block identifier.';
COMMENT ON COLUMN hrs.block_mark.created_by IS 'Audit actor that created this mark.';
COMMENT ON COLUMN hrs.block_mark.updated_by IS 'Audit actor that last updated this mark.';
COMMENT ON COLUMN hrs.block_mark.created_at IS 'Timestamp when this mark was created.';
COMMENT ON COLUMN hrs.block_mark.updated_at IS 'Timestamp when this mark was last updated.';
COMMENT ON COLUMN hrs.block_mark.is_deleted IS 'Soft-delete flag.';

COMMENT ON TABLE hrs.block_area_segment IS 'Area and road segments used by a submission block.';
COMMENT ON COLUMN hrs.block_area_segment.block_area_segment_id IS 'Unique identifier for the area segment.';
COMMENT ON COLUMN hrs.block_area_segment.block_id IS 'Foreign key referencing the parent block.';
COMMENT ON COLUMN hrs.block_area_segment.block_mark_id IS 'Optional foreign key referencing the associated block mark.';
COMMENT ON COLUMN hrs.block_area_segment.source IS 'Segment derivation source: e.g. MANUAL or FTA.';
COMMENT ON COLUMN hrs.block_area_segment.area_ha IS 'Segment area in hectares.';
COMMENT ON COLUMN hrs.block_area_segment.road_length_m IS 'Road length in meters.';
COMMENT ON COLUMN hrs.block_area_segment.road_width_m IS 'Road width in meters.';
COMMENT ON COLUMN hrs.block_area_segment.starting_area_ha IS 'Starting area for the segment in hectares.';
COMMENT ON COLUMN hrs.block_area_segment.net_waste_area_ha IS 'Calculated net waste area for the segment in hectares.';
COMMENT ON COLUMN hrs.block_area_segment.created_by IS 'Audit actor that created this segment.';
COMMENT ON COLUMN hrs.block_area_segment.updated_by IS 'Audit actor that last updated this segment.';
COMMENT ON COLUMN hrs.block_area_segment.created_at IS 'Timestamp when this segment was created.';
COMMENT ON COLUMN hrs.block_area_segment.updated_at IS 'Timestamp when this segment was last updated.';
COMMENT ON COLUMN hrs.block_area_segment.is_deleted IS 'Soft-delete flag.';

COMMENT ON TABLE hrs.block_attachment IS 'Evidence attachment metadata; object content is stored outside PostgreSQL.';
COMMENT ON COLUMN hrs.block_attachment.block_attachment_id IS 'Unique identifier for the attachment record.';
COMMENT ON COLUMN hrs.block_attachment.block_id IS 'Foreign key referencing the parent block.';
COMMENT ON COLUMN hrs.block_attachment.object_key IS 'Object storage S3 key for the uploaded file.';
COMMENT ON COLUMN hrs.block_attachment.file_name IS 'Original file name.';
COMMENT ON COLUMN hrs.block_attachment.content_type IS 'MIME media type of the attachment.';
COMMENT ON COLUMN hrs.block_attachment.file_size_bytes IS 'Attachment size in bytes.';
COMMENT ON COLUMN hrs.block_attachment.scan_status IS 'Virus scan verdict, e.g. CLEAN or INFECTED.';
COMMENT ON COLUMN hrs.block_attachment.created_by IS 'Audit actor that uploaded the attachment.';
COMMENT ON COLUMN hrs.block_attachment.updated_by IS 'Audit actor that last updated the attachment metadata.';
COMMENT ON COLUMN hrs.block_attachment.created_at IS 'Timestamp when the attachment was created.';
COMMENT ON COLUMN hrs.block_attachment.updated_at IS 'Timestamp when the attachment was last updated.';
COMMENT ON COLUMN hrs.block_attachment.is_deleted IS 'Soft-delete flag.';

COMMENT ON TABLE hrs.block_submitter IS 'Submitter endorsement details for a block.';
COMMENT ON COLUMN hrs.block_submitter.block_submitter_id IS 'Unique identifier for the submitter endorsement record.';
COMMENT ON COLUMN hrs.block_submitter.block_id IS 'Foreign key referencing the parent block.';
COMMENT ON COLUMN hrs.block_submitter.submitter_id IS 'Business identifier of the submitter.';
COMMENT ON COLUMN hrs.block_submitter.submitter_name IS 'Full name of the submitter.';
COMMENT ON COLUMN hrs.block_submitter.first_name IS 'Submitter first name.';
COMMENT ON COLUMN hrs.block_submitter.last_name IS 'Submitter last name.';
COMMENT ON COLUMN hrs.block_submitter.designation IS 'Submitter professional designation.';
COMMENT ON COLUMN hrs.block_submitter.licence_no IS 'Submitter professional licence number.';
COMMENT ON COLUMN hrs.block_submitter.email IS 'Submitter email address.';
COMMENT ON COLUMN hrs.block_submitter.phone IS 'Submitter telephone number.';
COMMENT ON COLUMN hrs.block_submitter.created_by IS 'Audit actor that created this submitter record.';
COMMENT ON COLUMN hrs.block_submitter.updated_by IS 'Audit actor that last updated this submitter record.';
COMMENT ON COLUMN hrs.block_submitter.created_at IS 'Timestamp when this submitter record was created.';
COMMENT ON COLUMN hrs.block_submitter.updated_at IS 'Timestamp when this submitter record was last updated.';
COMMENT ON COLUMN hrs.block_submitter.is_deleted IS 'Soft-delete flag.';

COMMENT ON TABLE hrs.block_sponsor IS 'Sponsor endorsement details for a block.';
COMMENT ON COLUMN hrs.block_sponsor.block_sponsor_id IS 'Unique identifier for the sponsor endorsement record.';
COMMENT ON COLUMN hrs.block_sponsor.block_id IS 'Foreign key referencing the parent block.';
COMMENT ON COLUMN hrs.block_sponsor.sponsor_id IS 'Business identifier of the sponsor.';
COMMENT ON COLUMN hrs.block_sponsor.sponsor_name IS 'Full name of the sponsor.';
COMMENT ON COLUMN hrs.block_sponsor.first_name IS 'Sponsor first name.';
COMMENT ON COLUMN hrs.block_sponsor.last_name IS 'Sponsor last name.';
COMMENT ON COLUMN hrs.block_sponsor.designation IS 'Sponsor professional designation.';
COMMENT ON COLUMN hrs.block_sponsor.licence_no IS 'Sponsor professional licence number.';
COMMENT ON COLUMN hrs.block_sponsor.email IS 'Sponsor email address.';
COMMENT ON COLUMN hrs.block_sponsor.phone IS 'Sponsor telephone number.';
COMMENT ON COLUMN hrs.block_sponsor.created_by IS 'Audit actor that created this sponsor record.';
COMMENT ON COLUMN hrs.block_sponsor.updated_by IS 'Audit actor that last updated this sponsor record.';
COMMENT ON COLUMN hrs.block_sponsor.created_at IS 'Timestamp when this sponsor record was created.';
COMMENT ON COLUMN hrs.block_sponsor.updated_at IS 'Timestamp when this sponsor record was last updated.';
COMMENT ON COLUMN hrs.block_sponsor.is_deleted IS 'Soft-delete flag.';

COMMENT ON TABLE hrs.block_requirement IS 'Requirement responses and optional evidence links for a submission block.';
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

COMMENT ON TABLE hrs.block_comment IS 'Submission block comments, including status-event context.';
COMMENT ON COLUMN hrs.block_comment.block_comment_id IS 'Unique identifier for the comment.';
COMMENT ON COLUMN hrs.block_comment.block_id IS 'Foreign key referencing the parent block.';
COMMENT ON COLUMN hrs.block_comment.context IS 'Functional context in which the comment was entered.';
COMMENT ON COLUMN hrs.block_comment.comment IS 'Body text of the comment (max 4000 chars).';
COMMENT ON COLUMN hrs.block_comment.status_event_id IS 'Optional foreign key referencing the triggering status event.';
COMMENT ON COLUMN hrs.block_comment.created_by IS 'Audit actor that created this comment.';
COMMENT ON COLUMN hrs.block_comment.updated_by IS 'Audit actor that last updated this comment.';
COMMENT ON COLUMN hrs.block_comment.created_at IS 'Timestamp when this comment was created.';
COMMENT ON COLUMN hrs.block_comment.updated_at IS 'Timestamp when this comment was last updated.';
COMMENT ON COLUMN hrs.block_comment.is_deleted IS 'Soft-delete flag.';

COMMENT ON TABLE hrs.block_calculation_snapshot IS 'Append-only calculation inputs and outputs pinned to a district-volume configuration.';
COMMENT ON COLUMN hrs.block_calculation_snapshot.block_calculation_snapshot_id IS 'Unique identifier for the calculation snapshot.';
COMMENT ON COLUMN hrs.block_calculation_snapshot.block_id IS 'Foreign key referencing the parent block.';
COMMENT ON COLUMN hrs.block_calculation_snapshot.district_volume_id IS 'Foreign key referencing the district volume configuration version.';
COMMENT ON COLUMN hrs.block_calculation_snapshot.hbs_window_start IS 'Harvest Billing System window start date.';
COMMENT ON COLUMN hrs.block_calculation_snapshot.hbs_window_end IS 'Harvest Billing System window end date.';
COMMENT ON COLUMN hrs.block_calculation_snapshot.inputs IS 'JSON snapshot of calculation input parameters.';
COMMENT ON COLUMN hrs.block_calculation_snapshot.outputs IS 'JSON snapshot of calculation output results.';
COMMENT ON COLUMN hrs.block_calculation_snapshot.calculated_at IS 'Timestamp at which the calculation was performed.';
COMMENT ON COLUMN hrs.block_calculation_snapshot.rounding_policy IS 'Rounding policy applied during calculation.';
COMMENT ON COLUMN hrs.block_calculation_snapshot.warnings IS 'JSON array of warnings generated during calculation.';
COMMENT ON COLUMN hrs.block_calculation_snapshot.created_by IS 'Audit actor that produced the snapshot.';
COMMENT ON COLUMN hrs.block_calculation_snapshot.updated_by IS 'Audit actor that last updated the snapshot record.';
COMMENT ON COLUMN hrs.block_calculation_snapshot.created_at IS 'Timestamp when the snapshot was recorded.';
COMMENT ON COLUMN hrs.block_calculation_snapshot.updated_at IS 'Timestamp when the snapshot was last updated.';

COMMENT ON TABLE hrs.status_event IS 'Append-only lifecycle events for reporting units and blocks.';
COMMENT ON COLUMN hrs.status_event.status_event_id IS 'Unique identifier for the status event.';
COMMENT ON COLUMN hrs.status_event.reporting_unit_id IS 'Foreign key referencing the target reporting unit, if applicable.';
COMMENT ON COLUMN hrs.status_event.block_id IS 'Foreign key referencing the target block, if applicable.';
COMMENT ON COLUMN hrs.status_event.status IS 'Lifecycle status, e.g. DRAFT or SUBMITTED.';
COMMENT ON COLUMN hrs.status_event.event_type IS 'Action event type, e.g. SUBMISSION_CREATED.';
COMMENT ON COLUMN hrs.status_event.details IS 'JSON payload containing event metadata.';
COMMENT ON COLUMN hrs.status_event.created_by IS 'Audit actor that generated the event.';
COMMENT ON COLUMN hrs.status_event.updated_by IS 'Audit actor that last updated the event record.';
COMMENT ON COLUMN hrs.status_event.created_at IS 'Timestamp when the status event was created.';
COMMENT ON COLUMN hrs.status_event.updated_at IS 'Timestamp when the status event was last updated.';

COMMENT ON TABLE hrs.audit_event IS 'Immutable audit event grouping one temporal mutation operation.';
COMMENT ON COLUMN hrs.audit_event.audit_event_id IS 'Unique identifier for the audit event.';
COMMENT ON COLUMN hrs.audit_event.action IS 'Mutation operation type: CREATE, UPDATE, SOFT_DELETE, DELETE.';
COMMENT ON COLUMN hrs.audit_event.changed_by IS 'Actor identity responsible for the change.';
COMMENT ON COLUMN hrs.audit_event.changed_at IS 'Timestamp when the mutation took place.';
COMMENT ON COLUMN hrs.audit_event.reason IS 'Optional rationale provided for the change.';
COMMENT ON COLUMN hrs.audit_event.correlation_id IS 'Distributed tracing correlation identifier.';

COMMENT ON TABLE hrs.audit_change IS 'Append-only per-row audit change with JSONB snapshot. No FK on entity_id (polymorphic audit).';
COMMENT ON COLUMN hrs.audit_change.audit_change_id IS 'Unique identifier for the individual row audit record.';
COMMENT ON COLUMN hrs.audit_change.event_id IS 'Foreign key referencing the owning audit event.';
COMMENT ON COLUMN hrs.audit_change.entity_type IS 'Target database table name.';
COMMENT ON COLUMN hrs.audit_change.entity_id IS 'Primary key value of the mutated row.';
COMMENT ON COLUMN hrs.audit_change.action IS 'Mutation action: CREATE, UPDATE, SOFT_DELETE, DELETE.';
COMMENT ON COLUMN hrs.audit_change.previous_values IS 'Full snapshot before mutation as JSONB.';
COMMENT ON COLUMN hrs.audit_change.current_values IS 'Full snapshot after mutation as JSONB.';
COMMENT ON COLUMN hrs.audit_change.changed_columns IS 'Array of column names that changed.';

COMMENT ON TABLE hrs.outbox_event IS 'Transactional outbox events pending reliable delivery and reconciliation.';
COMMENT ON COLUMN hrs.outbox_event.outbox_event_id IS 'Unique identifier for the outbox event record.';
COMMENT ON COLUMN hrs.outbox_event.event_id IS 'Stable UUID identifying this event across delivery attempts.';
COMMENT ON COLUMN hrs.outbox_event.aggregate_type IS 'Domain aggregate type, e.g. SUBMISSION.';
COMMENT ON COLUMN hrs.outbox_event.aggregate_id IS 'Identifier of the owning aggregate.';
COMMENT ON COLUMN hrs.outbox_event.event_type IS 'Domain event type name.';
COMMENT ON COLUMN hrs.outbox_event.payload IS 'Serialized event payload as JSONB.';
COMMENT ON COLUMN hrs.outbox_event.status IS 'Delivery state: PENDING, IN_FLIGHT, RETRYING, CONFIRMED, etc.';
COMMENT ON COLUMN hrs.outbox_event.attempt_count IS 'Number of transmission attempts performed.';
COMMENT ON COLUMN hrs.outbox_event.attempt_history IS 'JSON array of delivery attempts with outcome timestamps.';
COMMENT ON COLUMN hrs.outbox_event.next_retry_at IS 'Earliest timestamp for next delivery retry.';
COMMENT ON COLUMN hrs.outbox_event.locked_until IS 'Lease expiration timestamp for in-flight processing.';
COMMENT ON COLUMN hrs.outbox_event.locked_by IS 'Worker node identifier holding the lease.';
COMMENT ON COLUMN hrs.outbox_event.created_at IS 'Timestamp when the event was enqueued.';
COMMENT ON COLUMN hrs.outbox_event.created_by IS 'Actor that enqueued the outbox event.';
COMMENT ON COLUMN hrs.outbox_event.updated_at IS 'Timestamp when the outbox record was last modified.';
COMMENT ON COLUMN hrs.outbox_event.updated_by IS 'Actor that last updated the outbox event.';

COMMENT ON TABLE hrs.idempotency_record IS 'Request fingerprints and completed responses used to make retried commands idempotent.';
COMMENT ON COLUMN hrs.idempotency_record.idempotency_record_id IS 'Unique identifier for the idempotency record.';
COMMENT ON COLUMN hrs.idempotency_record.idempotency_key IS 'Unique idempotency key supplied by the client.';
COMMENT ON COLUMN hrs.idempotency_record.request_fingerprint IS 'Digest of request payload and route.';
COMMENT ON COLUMN hrs.idempotency_record.status IS 'Processing status: IN_PROGRESS or COMPLETED.';
COMMENT ON COLUMN hrs.idempotency_record.response_status IS 'HTTP status code captured from completed response.';
COMMENT ON COLUMN hrs.idempotency_record.response_snapshot IS 'JSONB snapshot of response returned on retry.';
COMMENT ON COLUMN hrs.idempotency_record.created_at IS 'Timestamp when the request was first accepted.';
COMMENT ON COLUMN hrs.idempotency_record.created_by IS 'Actor that initiated the request.';
COMMENT ON COLUMN hrs.idempotency_record.updated_at IS 'Timestamp when the idempotency record was last updated.';
COMMENT ON COLUMN hrs.idempotency_record.updated_by IS 'Actor that last updated the idempotency record.';

COMMENT ON TABLE hrs.district_volume_formula IS 'Administrator-managed formula definitions associated with a district-volume version.';
COMMENT ON COLUMN hrs.district_volume_formula.district_volume_formula_id IS 'Unique identifier for the formula row.';
COMMENT ON COLUMN hrs.district_volume_formula.district_volume_id IS 'Foreign key referencing the associated district volume version.';
COMMENT ON COLUMN hrs.district_volume_formula.formula_key IS 'Namespaced formula identifier.';
COMMENT ON COLUMN hrs.district_volume_formula.expression IS 'Mathematical formula expression (max 4000 chars).';
COMMENT ON COLUMN hrs.district_volume_formula.declared_variables IS 'JSON object defining input variables.';
COMMENT ON COLUMN hrs.district_volume_formula.validation_errors IS 'JSON array of formula validation issues.';
COMMENT ON COLUMN hrs.district_volume_formula.sort_order IS 'Display and evaluation sort order index.';
COMMENT ON COLUMN hrs.district_volume_formula.created_at IS 'Timestamp when the formula was created.';
COMMENT ON COLUMN hrs.district_volume_formula.created_by IS 'Actor that created the formula.';
COMMENT ON COLUMN hrs.district_volume_formula.updated_at IS 'Timestamp when the formula was last modified.';
COMMENT ON COLUMN hrs.district_volume_formula.updated_by IS 'Actor that last modified the formula.';

COMMENT ON TABLE hrs.lifecycle_setting IS 'Configurable lifecycle timing values stored as key/value settings.';
COMMENT ON COLUMN hrs.lifecycle_setting.lifecycle_setting_id IS 'Unique identifier for the lifecycle setting.';
COMMENT ON COLUMN hrs.lifecycle_setting.setting_key IS 'Unique setting key identifier.';
COMMENT ON COLUMN hrs.lifecycle_setting.setting_value IS 'Setting value string.';
COMMENT ON COLUMN hrs.lifecycle_setting.created_at IS 'Timestamp when the setting was created.';
COMMENT ON COLUMN hrs.lifecycle_setting.created_by IS 'Actor that created the setting.';
COMMENT ON COLUMN hrs.lifecycle_setting.updated_at IS 'Timestamp when the setting was last modified.';
COMMENT ON COLUMN hrs.lifecycle_setting.updated_by IS 'Actor that last modified the setting.';

COMMENT ON TABLE hrs.formula_set IS 'Independently versioned, date-effective formula configuration sets.';
COMMENT ON COLUMN hrs.formula_set.formula_set_id IS 'Unique identifier for the formula set.';
COMMENT ON COLUMN hrs.formula_set.area IS 'Geographic policy area: INTERIOR or COASTAL.';
COMMENT ON COLUMN hrs.formula_set.start_date IS 'Effective start date of this formula set.';
COMMENT ON COLUMN hrs.formula_set.end_date IS 'Effective end date of this formula set, or null if open-ended.';
COMMENT ON COLUMN hrs.formula_set.is_deleted IS 'Soft-delete flag.';
COMMENT ON COLUMN hrs.formula_set.created_at IS 'Timestamp when the formula set was created.';
COMMENT ON COLUMN hrs.formula_set.created_by IS 'Actor that created the formula set.';
COMMENT ON COLUMN hrs.formula_set.updated_at IS 'Timestamp when the formula set was last modified.';
COMMENT ON COLUMN hrs.formula_set.updated_by IS 'Actor that last modified the formula set.';

COMMENT ON TABLE hrs.formula_set_row IS 'Formula expressions belonging to an independently versioned formula set.';
COMMENT ON COLUMN hrs.formula_set_row.formula_set_row_id IS 'Unique identifier for the formula set row.';
COMMENT ON COLUMN hrs.formula_set_row.formula_set_id IS 'Foreign key referencing the parent formula set.';
COMMENT ON COLUMN hrs.formula_set_row.formula_key IS 'Namespaced formula identifier.';
COMMENT ON COLUMN hrs.formula_set_row.expression IS 'Mathematical formula expression (max 4000 chars).';
COMMENT ON COLUMN hrs.formula_set_row.declared_variables IS 'JSON object of declared variable bindings.';
COMMENT ON COLUMN hrs.formula_set_row.validation_errors IS 'JSON array of syntax/reference errors.';
COMMENT ON COLUMN hrs.formula_set_row.sort_order IS 'Display and evaluation sort order index.';
COMMENT ON COLUMN hrs.formula_set_row.is_deleted IS 'Soft-delete flag.';
COMMENT ON COLUMN hrs.formula_set_row.created_at IS 'Timestamp when the formula row was created.';
COMMENT ON COLUMN hrs.formula_set_row.created_by IS 'Actor that created the formula row.';
COMMENT ON COLUMN hrs.formula_set_row.updated_at IS 'Timestamp when the formula row was last modified.';
COMMENT ON COLUMN hrs.formula_set_row.updated_by IS 'Actor that last modified the formula row.';

-- ============================================================================
-- Phase 9: Recreate unique indexes that reference renamed columns
-- ============================================================================

DROP INDEX IF EXISTS hrs.idx_district_volume_live_config_area_start;
CREATE INDEX IF NOT EXISTS idx_district_volume_live_config_area_start
    ON hrs.district_volume(config_type, area, start_date)
    WHERE is_deleted = FALSE;

DROP INDEX IF EXISTS hrs.uq_reporting_unit_client_district;
CREATE UNIQUE INDEX IF NOT EXISTS uq_reporting_unit_client_district
    ON hrs.reporting_unit (client_number, client_locn_code, org_unit_no)
    WHERE is_deleted = FALSE;

DROP INDEX IF EXISTS hrs.idx_block_reporting_unit_id;
DROP INDEX IF EXISTS hrs.idx_block_ru_id;
CREATE INDEX IF NOT EXISTS idx_block_reporting_unit_id
    ON hrs.block (reporting_unit_id);

DROP INDEX IF EXISTS hrs.uq_block_one_da_per_ru;
CREATE UNIQUE INDEX IF NOT EXISTS uq_block_one_da_per_ru
    ON hrs.block (reporting_unit_id)
    WHERE block_type = 'DISTRICT_AVERAGE' AND is_deleted = FALSE;

DROP INDEX IF EXISTS hrs.uq_block_mark_live_type_sequence;
CREATE UNIQUE INDEX IF NOT EXISTS uq_block_mark_live_type_sequence
    ON hrs.block_mark (block_id, mark_type, sequence_no)
    WHERE is_deleted = FALSE;

DROP INDEX IF EXISTS hrs.idx_block_area_segment_block_mark_id;
DROP INDEX IF EXISTS hrs.idx_block_area_segment_bm_id;
CREATE INDEX IF NOT EXISTS idx_block_area_segment_block_mark_id
    ON hrs.block_area_segment (block_mark_id);

DROP INDEX IF EXISTS hrs.uq_block_requirement_live;
CREATE UNIQUE INDEX IF NOT EXISTS uq_block_requirement_live
    ON hrs.block_requirement (block_id, requirement_code)
    WHERE is_deleted = FALSE;

DROP INDEX IF EXISTS hrs.idx_block_calculation_snapshot_district_volume_id;
DROP INDEX IF EXISTS hrs.idx_block_calculation_snapshot_dv_id;
CREATE INDEX IF NOT EXISTS idx_block_calculation_snapshot_district_volume_id
    ON hrs.block_calculation_snapshot (district_volume_id);

DROP INDEX IF EXISTS hrs.idx_block_calculation_snapshot_block_id;
CREATE INDEX IF NOT EXISTS idx_block_calculation_snapshot_block_id
    ON hrs.block_calculation_snapshot (block_id, block_calculation_snapshot_id DESC);

DROP INDEX IF EXISTS hrs.idx_block_calculation_snapshot_latest;
CREATE INDEX IF NOT EXISTS idx_block_calculation_snapshot_latest
    ON hrs.block_calculation_snapshot (block_id, calculated_at DESC NULLS LAST, block_calculation_snapshot_id DESC);

DROP INDEX IF EXISTS hrs.idx_status_event_reporting_unit_time;
CREATE INDEX IF NOT EXISTS idx_status_event_reporting_unit_time
    ON hrs.status_event (reporting_unit_id, created_at DESC, status_event_id DESC)
    WHERE reporting_unit_id IS NOT NULL;

DROP INDEX IF EXISTS hrs.idx_status_event_block_time;
CREATE INDEX IF NOT EXISTS idx_status_event_block_time
    ON hrs.status_event (block_id, created_at DESC, status_event_id DESC)
    WHERE block_id IS NOT NULL;

DROP INDEX IF EXISTS hrs.idx_audit_change_entity_lookup;
CREATE INDEX IF NOT EXISTS idx_audit_change_entity_lookup
    ON hrs.audit_change(entity_type, entity_id, audit_change_id DESC);

DROP INDEX IF EXISTS hrs.idx_audit_change_entity_type_id;
CREATE INDEX IF NOT EXISTS idx_audit_change_entity_type_id
    ON hrs.audit_change(entity_type, audit_change_id DESC);

DROP INDEX IF EXISTS hrs.idx_district_volume_formula_district_volume_id;
CREATE INDEX IF NOT EXISTS idx_district_volume_formula_district_volume_id
    ON hrs.district_volume_formula (district_volume_id, sort_order, district_volume_formula_id);

DROP INDEX IF EXISTS hrs.formula_set_effective_ix;
CREATE INDEX IF NOT EXISTS formula_set_effective_ix
    ON hrs.formula_set(area, start_date, end_date)
    WHERE is_deleted = FALSE;

DROP INDEX IF EXISTS hrs.formula_set_row_set_ix;
CREATE INDEX IF NOT EXISTS formula_set_row_set_ix
    ON hrs.formula_set_row(formula_set_id, sort_order, formula_set_row_id);

-- ============================================================================
-- Phase 10: Recreate triggers that reference renamed columns
-- ============================================================================

CREATE OR REPLACE FUNCTION hrs.audit_row_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, hrs
AS $$
DECLARE
    old_image JSONB;
    new_image JSONB;
    actor VARCHAR(128);
    corr_id VARCHAR(128);
    operation VARCHAR(32);
    changed TEXT[];
    audit_entity_id BIGINT;
    event_id BIGINT;
BEGIN
    old_image := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END;
    new_image := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END;

    actor := COALESCE(
        NULLIF(new_image ->> 'updated_by', ''),
        NULLIF(old_image ->> 'updated_by', ''),
        session_user
    );

    corr_id := NULLIF(current_setting('app.correlation_id', true), '');

    operation := CASE
        WHEN TG_OP = 'INSERT' THEN 'CREATE'
        WHEN TG_OP = 'DELETE' THEN 'DELETE'
        WHEN (COALESCE(old_image ->> 'is_deleted', old_image ->> 'deleted', 'false') = 'false'
              AND COALESCE(new_image ->> 'is_deleted', new_image ->> 'deleted', 'false') = 'true')
            THEN 'SOFT_DELETE'
        ELSE 'UPDATE'
    END;

    audit_entity_id := NULLIF(COALESCE(new_image, old_image) ->> (TG_TABLE_NAME || '_id'), '')::BIGINT;
    IF audit_entity_id IS NULL THEN
        audit_entity_id := NULLIF(COALESCE(new_image, old_image) ->> 'id', '')::BIGINT;
    END IF;
    IF audit_entity_id IS NULL THEN
        audit_entity_id := NULLIF(COALESCE(new_image, old_image) ->> 'block_id', '')::BIGINT;
    END IF;
    IF audit_entity_id IS NULL THEN
        audit_entity_id := NULLIF(COALESCE(new_image, old_image) ->> 'district_volume_id', '')::BIGINT;
    END IF;
    IF audit_entity_id IS NULL THEN
        audit_entity_id := NULLIF(COALESCE(new_image, old_image) ->> 'reporting_unit_id', '')::BIGINT;
    END IF;

    changed := CASE
        WHEN TG_OP = 'INSERT' THEN ARRAY(SELECT jsonb_object_keys(new_image) ORDER BY 1)
        WHEN TG_OP = 'DELETE' THEN ARRAY(SELECT jsonb_object_keys(old_image) ORDER BY 1)
        ELSE ARRAY(
            SELECT key
            FROM jsonb_object_keys(old_image || new_image) AS keys(key)
            WHERE old_image -> key IS DISTINCT FROM new_image -> key
            ORDER BY key
        )
    END;

    INSERT INTO hrs.audit_event (action, changed_by, correlation_id)
    VALUES (operation, actor, corr_id)
    RETURNING audit_event_id INTO event_id;

    INSERT INTO hrs.audit_change (
        event_id, entity_type, entity_id, action,
        previous_values, current_values, changed_columns
    )
    VALUES (
        event_id, TG_TABLE_NAME, audit_entity_id, operation,
        old_image, new_image, COALESCE(changed, ARRAY[]::TEXT[])
    );

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

COMMENT ON FUNCTION hrs.audit_row_change() IS
    'Writes one generic full-row audit event/change pair per row mutation. Entity type is the table name; soft deletion is identified from is_deleted=false to is_deleted=true.';

CREATE OR REPLACE FUNCTION hrs.audit_district_volume_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, hrs
AS $$
DECLARE
    old_image JSONB;
    new_image JSONB;
    old_row JSONB;
    new_row JSONB;
    actor VARCHAR(128);
    corr_id VARCHAR(128);
    operation VARCHAR(32);
    entity_kind VARCHAR(64);
    changed TEXT[];
    event_id BIGINT;
    row_id BIGINT;
BEGIN
    old_row := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END;
    new_row := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END;
    old_image := old_row;
    new_image := new_row;
    row_id := COALESCE(
        (new_image ->> 'district_volume_id')::BIGINT,
        (old_image ->> 'district_volume_id')::BIGINT,
        (new_image ->> 'id')::BIGINT,
        (old_image ->> 'id')::BIGINT
    );
    entity_kind := CASE
        WHEN COALESCE(new_image ->> 'config_type', old_image ->> 'config_type')
            = 'SPECIES_COMPOSITION' THEN 'SPECIES_COMPOSITION'
        ELSE 'DISTRICT_VOLUME'
    END;

    actor := COALESCE(
        NULLIF(CASE WHEN TG_OP = 'INSERT' THEN new_image ->> 'created_by'
                    WHEN TG_OP = 'DELETE' THEN old_image ->> 'updated_by'
                    ELSE new_image ->> 'updated_by' END, ''),
        NULLIF(CASE WHEN TG_OP = 'DELETE' THEN old_image ->> 'created_by'
                    ELSE new_image ->> 'created_by' END, ''),
        session_user
    );

    corr_id := NULLIF(current_setting('app.correlation_id', true), '');

    operation := CASE
        WHEN TG_OP = 'INSERT' THEN 'CREATE'
        WHEN TG_OP = 'DELETE' THEN 'DELETE'
        WHEN (COALESCE(old_image ->> 'is_deleted', old_image ->> 'deleted', 'false') = 'false'
              AND COALESCE(new_image ->> 'is_deleted', new_image ->> 'deleted', 'false') = 'true')
            THEN 'SOFT_DELETE'
        ELSE 'UPDATE'
    END;

    changed := CASE
        WHEN TG_OP = 'INSERT' THEN ARRAY(SELECT jsonb_object_keys(new_image) ORDER BY 1)
        WHEN TG_OP = 'DELETE' THEN ARRAY(SELECT jsonb_object_keys(old_image) ORDER BY 1)
        ELSE ARRAY(
            SELECT key
            FROM (
                SELECT jsonb_object_keys(old_image || new_image) AS key
            ) keys
            WHERE old_image -> key IS DISTINCT FROM new_image -> key
            ORDER BY key
        )
    END;

    -- reason is intentionally omitted: district_volume has no such column, so
    -- any extraction here would always yield NULL. Revisit when a source exists.
    INSERT INTO hrs.audit_event(action, changed_by, correlation_id)
    VALUES (operation, actor, corr_id)
    RETURNING audit_event_id INTO event_id;

    INSERT INTO hrs.audit_change(
        event_id, entity_type, entity_id, action,
        previous_values, current_values, changed_columns
    )
    VALUES (
        event_id, entity_kind, row_id, operation,
        old_image, new_image, COALESCE(changed, ARRAY[]::TEXT[])
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION hrs.audit_district_volume_change() IS
'Writes complete OLD and NEW row-image audit records for all district_volume mutations. The actor comes from row audit columns and falls back to session_user (current_user inside SECURITY DEFINER resolves to the function owner, not the caller). The correlation_id comes from current_setting(''app.correlation_id'', true) and is NULL when unset.';

-- Re-bind shared audit trigger across relevant DA tables
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'reporting_unit',
        'block',
        'district_average_block',
        'block_mark',
        'block_area_segment',
        'block_attachment',
        'block_submitter',
        'block_sponsor',
        'block_requirement',
        'block_comment',
        'block_calculation_snapshot',
        'status_event',
        'outbox_event',
        'idempotency_record',
        'district_volume_formula',
        'lifecycle_setting',
        'formula_set',
        'formula_set_row'
    ]
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON hrs.%I',
            'trg_' || table_name || '_shared_audit', table_name);
        EXECUTE format(
            'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON hrs.%I '
            'FOR EACH ROW EXECUTE FUNCTION hrs.audit_row_change()',
            'trg_' || table_name || '_shared_audit', table_name);
    END LOOP;

    DROP TRIGGER IF EXISTS trg_district_volume_audit ON hrs.district_volume;
    CREATE TRIGGER trg_district_volume_audit
    AFTER INSERT OR UPDATE OR DELETE ON hrs.district_volume
    FOR EACH ROW
    EXECUTE FUNCTION hrs.audit_district_volume_change();
END;
$$;
