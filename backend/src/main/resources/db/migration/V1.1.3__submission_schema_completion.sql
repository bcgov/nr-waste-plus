-- Issue #1272: complete the District Average submission schema.
-- All additions are nullable so this migration remains safe for existing rows.

ALTER TABLE hrs.district_average_block
    ADD COLUMN IF NOT EXISTS harvest_status_code VARCHAR(32),
    ADD COLUMN IF NOT EXISTS bec_zone VARCHAR(32),
    ADD COLUMN IF NOT EXISTS bec_subvariant VARCHAR(32),
    ADD COLUMN IF NOT EXISTS has_dispersed_retention BOOLEAN,
    ADD COLUMN IF NOT EXISTS dispersed_retention_pct NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS primary_logging_complete_date DATE,
    ADD COLUMN IF NOT EXISTS heli_logging BOOLEAN,
    ADD COLUMN IF NOT EXISTS cable_yarding_area_ha NUMERIC(12,3),
    ADD COLUMN IF NOT EXISTS skyline_logging_area_ha NUMERIC(12,3),
    ADD COLUMN IF NOT EXISTS applicable_criteria INTEGER[];

ALTER TABLE hrs.block_mark
    ADD COLUMN IF NOT EXISTS forest_file_id VARCHAR(128),
    ADD COLUMN IF NOT EXISTS timber_mark VARCHAR(128),
    ADD COLUMN IF NOT EXISTS cutting_permit_id VARCHAR(128),
    ADD COLUMN IF NOT EXISTS cut_block_id VARCHAR(128);

ALTER TABLE hrs.block_area_segment
    ADD COLUMN IF NOT EXISTS block_mark_id BIGINT,
    ADD COLUMN IF NOT EXISTS starting_area_ha NUMERIC(12,3),
    ADD COLUMN IF NOT EXISTS net_waste_area_ha NUMERIC(12,3);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_block_area_segment_block_mark'
          AND conrelid = 'hrs.block_area_segment'::regclass
    ) THEN
        ALTER TABLE hrs.block_area_segment
            ADD CONSTRAINT fk_block_area_segment_block_mark
            FOREIGN KEY (block_mark_id) REFERENCES hrs.block_mark(id);
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_block_area_segment_block_mark_id
    ON hrs.block_area_segment (block_mark_id);

ALTER TABLE hrs.block_submitter
    ADD COLUMN IF NOT EXISTS first_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS last_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS designation VARCHAR(128),
    ADD COLUMN IF NOT EXISTS licence_no VARCHAR(128),
    ADD COLUMN IF NOT EXISTS email VARCHAR(320),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(64);

ALTER TABLE hrs.block_sponsor
    ADD COLUMN IF NOT EXISTS first_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS last_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS designation VARCHAR(128),
    ADD COLUMN IF NOT EXISTS licence_no VARCHAR(128),
    ADD COLUMN IF NOT EXISTS email VARCHAR(320),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(64);

ALTER TABLE hrs.block_calculation_snapshot
    ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rounding_policy VARCHAR(64),
    ADD COLUMN IF NOT EXISTS warnings JSONB;

CREATE INDEX IF NOT EXISTS idx_block_calculation_snapshot_latest
    ON hrs.block_calculation_snapshot (block_id, calculated_at DESC NULLS LAST, id DESC);

COMMENT ON COLUMN hrs.district_average_block.harvest_status_code IS 'Harvest status code supplied for the submission block.';
COMMENT ON COLUMN hrs.district_average_block.bec_zone IS 'Biogeoclimatic ecosystem classification zone for Interior blocks.';
COMMENT ON COLUMN hrs.district_average_block.bec_subvariant IS 'Biogeoclimatic ecosystem classification subvariant for Interior blocks.';
COMMENT ON COLUMN hrs.district_average_block.has_dispersed_retention IS 'Whether dispersed retention applies to the submission block.';
COMMENT ON COLUMN hrs.district_average_block.dispersed_retention_pct IS 'Dispersed retention percentage when dispersed retention applies.';
COMMENT ON COLUMN hrs.district_average_block.primary_logging_complete_date IS 'Date primary logging was completed.';
COMMENT ON COLUMN hrs.district_average_block.heli_logging IS 'Whether helicopter logging applies to the submission block.';
COMMENT ON COLUMN hrs.district_average_block.cable_yarding_area_ha IS 'Area harvested using cable yarding, in hectares.';
COMMENT ON COLUMN hrs.district_average_block.skyline_logging_area_ha IS 'Area harvested using skyline logging, in hectares.';
COMMENT ON COLUMN hrs.district_average_block.applicable_criteria IS 'Eligibility criteria applicable to the submission block.';
COMMENT ON COLUMN hrs.district_average_block.coast_ground_based_area_ha IS 'Coast ground-based logging area, in hectares; exposed as groundBasedAreaHa for Coast blocks.';

COMMENT ON COLUMN hrs.block_mark.forest_file_id IS 'Forest file identifier associated with the mark.';
COMMENT ON COLUMN hrs.block_mark.timber_mark IS 'Timber mark identifier.';
COMMENT ON COLUMN hrs.block_mark.cutting_permit_id IS 'Cutting permit identifier.';
COMMENT ON COLUMN hrs.block_mark.cut_block_id IS 'Cut block identifier.';

COMMENT ON COLUMN hrs.block_area_segment.block_mark_id IS 'Optional mark associated with this area segment.';
COMMENT ON COLUMN hrs.block_area_segment.starting_area_ha IS 'Starting area for the segment, in hectares.';
COMMENT ON COLUMN hrs.block_area_segment.net_waste_area_ha IS 'Calculated net waste area for the segment, in hectares.';

COMMENT ON COLUMN hrs.block_submitter.first_name IS 'Submitter first name.';
COMMENT ON COLUMN hrs.block_submitter.last_name IS 'Submitter last name.';
COMMENT ON COLUMN hrs.block_submitter.designation IS 'Submitter professional designation.';
COMMENT ON COLUMN hrs.block_submitter.licence_no IS 'Submitter licence number.';
COMMENT ON COLUMN hrs.block_submitter.email IS 'Submitter email address.';
COMMENT ON COLUMN hrs.block_submitter.phone IS 'Submitter phone number.';

COMMENT ON COLUMN hrs.block_sponsor.first_name IS 'Sponsor first name.';
COMMENT ON COLUMN hrs.block_sponsor.last_name IS 'Sponsor last name.';
COMMENT ON COLUMN hrs.block_sponsor.designation IS 'Sponsor professional designation.';
COMMENT ON COLUMN hrs.block_sponsor.licence_no IS 'Sponsor licence number.';
COMMENT ON COLUMN hrs.block_sponsor.email IS 'Sponsor email address.';
COMMENT ON COLUMN hrs.block_sponsor.phone IS 'Sponsor phone number.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.calculated_at IS 'Timestamp at which the calculation snapshot was produced.';
COMMENT ON COLUMN hrs.block_calculation_snapshot.rounding_policy IS 'Rounding policy used to produce the snapshot outputs.';
COMMENT ON COLUMN hrs.block_calculation_snapshot.warnings IS 'Non-fatal warnings produced during calculation.';
