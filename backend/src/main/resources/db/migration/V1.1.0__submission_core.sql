-- Issue #1215: District Average submission core.
-- Vocabulary columns remain service-validated.  In particular, this migration
-- intentionally does not add checks for external code-table values.

CREATE TABLE IF NOT EXISTS hrs.reporting_unit (
    id BIGSERIAL,
    client_number VARCHAR(8) NOT NULL,
    client_locn_code VARCHAR(32) NOT NULL,
    org_unit_no VARCHAR(3) NOT NULL,
    revision BIGINT NOT NULL DEFAULT 1,
    created_by VARCHAR(128) NOT NULL,
    updated_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT reporting_unit_pk PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reporting_unit_client_district
    ON hrs.reporting_unit (client_number, client_locn_code, org_unit_no)
    WHERE deleted = FALSE;

CREATE TABLE IF NOT EXISTS hrs.block (
    id BIGSERIAL,
    reporting_unit_id BIGINT NOT NULL,
    block_type VARCHAR(32) NOT NULL,
    is_draft BOOLEAN NOT NULL DEFAULT TRUE,
    plc_date DATE,
    revision BIGINT NOT NULL DEFAULT 1,
    created_by VARCHAR(128) NOT NULL,
    updated_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT block_pk PRIMARY KEY (id),
    CONSTRAINT fk_block_reporting_unit
        FOREIGN KEY (reporting_unit_id) REFERENCES hrs.reporting_unit(id)
);

CREATE INDEX IF NOT EXISTS idx_block_reporting_unit_id
    ON hrs.block (reporting_unit_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_block_one_da_per_ru
    ON hrs.block (reporting_unit_id)
    WHERE block_type = 'DISTRICT_AVERAGE' AND deleted = FALSE;

CREATE TABLE IF NOT EXISTS hrs.district_average_block (
    block_id BIGINT NOT NULL,
    benchmark_zone VARCHAR(32),
    maturity VARCHAR(32),
    retention_percentage NUMERIC(5,2),
    criteria INTEGER[],
    coast_ground_based_area_ha NUMERIC(12,3),
    coast_helicopter_area_ha NUMERIC(12,3),
    revision BIGINT NOT NULL DEFAULT 1,
    created_by VARCHAR(128) NOT NULL,
    updated_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT district_average_block_pk PRIMARY KEY (block_id),
    CONSTRAINT fk_district_average_block_block
        FOREIGN KEY (block_id) REFERENCES hrs.block(id)
);

CREATE TABLE IF NOT EXISTS hrs.block_mark (
    id BIGSERIAL,
    block_id BIGINT NOT NULL,
    mark_type VARCHAR(32) NOT NULL,
    sequence_no INTEGER NOT NULL,
    mark VARCHAR(64) NOT NULL,
    validation_status VARCHAR(32),
    created_by VARCHAR(128) NOT NULL,
    updated_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT block_mark_pk PRIMARY KEY (id),
    CONSTRAINT fk_block_mark_block
        FOREIGN KEY (block_id) REFERENCES hrs.block(id),
    CONSTRAINT block_mark_sequence_ck
        CHECK (mark_type <> 'SECONDARY' OR sequence_no BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS idx_block_mark_block_id
    ON hrs.block_mark (block_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_block_mark_live_type_sequence
    ON hrs.block_mark (block_id, mark_type, sequence_no)
    WHERE deleted = FALSE;

CREATE TABLE IF NOT EXISTS hrs.block_area_segment (
    id BIGSERIAL,
    block_id BIGINT NOT NULL,
    source VARCHAR(32) NOT NULL,
    area_ha NUMERIC(12,3),
    road_length_m NUMERIC(12,3),
    road_width_m NUMERIC(12,3),
    created_by VARCHAR(128) NOT NULL,
    updated_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT block_area_segment_pk PRIMARY KEY (id),
    CONSTRAINT fk_block_area_segment_block
        FOREIGN KEY (block_id) REFERENCES hrs.block(id)
);

CREATE INDEX IF NOT EXISTS idx_block_area_segment_block_id
    ON hrs.block_area_segment (block_id);

COMMENT ON TABLE hrs.reporting_unit IS 'Locally-owned reporting unit for a District Average submission.';
COMMENT ON TABLE hrs.block IS 'Submission block belonging to a reporting unit.';
COMMENT ON TABLE hrs.district_average_block IS 'District Average-specific block extension.';
COMMENT ON TABLE hrs.block_mark IS 'Typed forest and road marks associated with a submission block.';
COMMENT ON TABLE hrs.block_area_segment IS 'Area and road segments used by a submission block.';
COMMENT ON COLUMN hrs.reporting_unit.deleted IS 'Soft-delete flag; live uniqueness indexes exclude deleted rows.';
COMMENT ON COLUMN hrs.block.deleted IS 'Soft-delete flag; live uniqueness indexes exclude deleted rows.';
