-- Issue #1215: evidence, endorsement, requirements, comments, and
-- calculation snapshots.  Snapshot rows are append-only and therefore have
-- audit timestamps/actors but no soft-delete flag.

CREATE TABLE IF NOT EXISTS hrs.block_attachment (
    id BIGSERIAL,
    block_id BIGINT NOT NULL,
    object_key VARCHAR(512) NOT NULL,
    file_name VARCHAR(255),
    content_type VARCHAR(128),
    file_size_bytes BIGINT,
    scan_status VARCHAR(32) NOT NULL,
    created_by VARCHAR(128) NOT NULL,
    updated_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT block_attachment_pk PRIMARY KEY (id),
    CONSTRAINT fk_block_attachment_block
        FOREIGN KEY (block_id) REFERENCES hrs.block(id)
);

CREATE INDEX IF NOT EXISTS idx_block_attachment_block_id
    ON hrs.block_attachment (block_id);

CREATE TABLE IF NOT EXISTS hrs.block_submitter (
    id BIGSERIAL,
    block_id BIGINT NOT NULL,
    submitter_id VARCHAR(128) NOT NULL,
    submitter_name VARCHAR(255),
    created_by VARCHAR(128) NOT NULL,
    updated_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT block_submitter_pk PRIMARY KEY (id),
    CONSTRAINT fk_block_submitter_block
        FOREIGN KEY (block_id) REFERENCES hrs.block(id)
);

CREATE INDEX IF NOT EXISTS idx_block_submitter_block_id
    ON hrs.block_submitter (block_id);

CREATE TABLE IF NOT EXISTS hrs.block_sponsor (
    id BIGSERIAL,
    block_id BIGINT NOT NULL,
    sponsor_id VARCHAR(128) NOT NULL,
    sponsor_name VARCHAR(255),
    created_by VARCHAR(128) NOT NULL,
    updated_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT block_sponsor_pk PRIMARY KEY (id),
    CONSTRAINT fk_block_sponsor_block
        FOREIGN KEY (block_id) REFERENCES hrs.block(id)
);

CREATE INDEX IF NOT EXISTS idx_block_sponsor_block_id
    ON hrs.block_sponsor (block_id);

CREATE TABLE IF NOT EXISTS hrs.block_requirement (
    id BIGSERIAL,
    block_id BIGINT NOT NULL,
    requirement_code VARCHAR(64) NOT NULL,
    answered_yes BOOLEAN,
    response TEXT,
    linked_attachment_id BIGINT,
    created_by VARCHAR(128) NOT NULL,
    updated_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT block_requirement_pk PRIMARY KEY (id),
    CONSTRAINT fk_block_requirement_block
        FOREIGN KEY (block_id) REFERENCES hrs.block(id),
    CONSTRAINT fk_block_requirement_attachment
        FOREIGN KEY (linked_attachment_id) REFERENCES hrs.block_attachment(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_block_requirement_live
    ON hrs.block_requirement (block_id, requirement_code)
    WHERE deleted = FALSE;

CREATE TABLE IF NOT EXISTS hrs.block_comment (
    id BIGSERIAL,
    block_id BIGINT NOT NULL,
    context VARCHAR(32) NOT NULL,
    comment TEXT NOT NULL,
    status_event_id BIGINT,
    created_by VARCHAR(128) NOT NULL,
    updated_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT block_comment_pk PRIMARY KEY (id),
    CONSTRAINT fk_block_comment_block
        FOREIGN KEY (block_id) REFERENCES hrs.block(id)
);

CREATE INDEX IF NOT EXISTS idx_block_comment_block_id
    ON hrs.block_comment (block_id);

CREATE TABLE IF NOT EXISTS hrs.block_calculation_snapshot (
    id BIGSERIAL,
    block_id BIGINT NOT NULL,
    district_volume_id BIGINT NOT NULL,
    hbs_window_start DATE,
    hbs_window_end DATE,
    inputs JSONB NOT NULL,
    outputs JSONB NOT NULL,
    created_by VARCHAR(128) NOT NULL,
    updated_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT block_calculation_snapshot_pk PRIMARY KEY (id),
    CONSTRAINT fk_block_calculation_snapshot_block
        FOREIGN KEY (block_id) REFERENCES hrs.block(id),
    CONSTRAINT fk_block_calculation_snapshot_district_volume
        FOREIGN KEY (district_volume_id) REFERENCES hrs.district_volume(id)
);

CREATE INDEX IF NOT EXISTS idx_block_calculation_snapshot_block_id
    ON hrs.block_calculation_snapshot (block_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_block_calculation_snapshot_district_volume_id
    ON hrs.block_calculation_snapshot (district_volume_id);

COMMENT ON TABLE hrs.block_attachment IS 'Evidence attachment metadata; object content is stored outside PostgreSQL.';
COMMENT ON TABLE hrs.block_requirement IS 'Requirement responses and optional evidence links for a submission block.';
COMMENT ON TABLE hrs.block_comment IS 'Submission block comments, including status-event context.';
COMMENT ON TABLE hrs.block_calculation_snapshot IS 'Append-only calculation inputs and outputs pinned to a district-volume configuration.';
