-- ============================================================================
-- V1.4.0__block_mark_road_permit_sequence_check.sql
-- Align road permit timber marks with secondary timber marks sequencing rules
-- (1..5) in block_mark, fitting legacy "R*" road marks into the new model.
-- ============================================================================
ALTER TABLE wasteplus.block_mark
    DROP CONSTRAINT IF EXISTS block_mark_sequence_ck;

ALTER TABLE wasteplus.block_mark
    ADD CONSTRAINT block_mark_sequence_ck
        CHECK (
            (
                (mark_type)::text NOT IN ('SECONDARY', 'ROAD_PERMIT')
            )
            OR (
                sequence_no >= 1 AND sequence_no <= 5
            )
        );

COMMENT ON COLUMN wasteplus.block_mark.mark_type IS
    'Mark type: PRIMARY, SECONDARY, or ROAD_PERMIT.';
