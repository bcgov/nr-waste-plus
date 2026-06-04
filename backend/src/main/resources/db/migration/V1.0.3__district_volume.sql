-- Ensure schema exists for multi-schema deployments
create schema if not exists hrs;

CREATE TABLE IF NOT EXISTS hrs.district_volume
(
    id                 BIGSERIAL     PRIMARY KEY,
    area               VARCHAR(10)   NOT NULL,
    start_date         DATE          NOT NULL,
    end_date           DATE,
    date_of_upload     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    table_data         JSONB         NOT NULL,
    table_level_factor NUMERIC(10,3) NOT NULL,
    heli_multiplier    NUMERIC(10,3),                         -- nullable; COASTAL only
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    created_by         VARCHAR(128)  NOT NULL,
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_by         VARCHAR(128)  NOT NULL,
    version            INT           NOT NULL DEFAULT 0,

    CONSTRAINT chk_area CHECK (area IN ('INTERIOR', 'COASTAL'))
);

-- GIN index for future JSONB query support
CREATE INDEX IF NOT EXISTS idx_district_volume_data_gin
    ON hrs.district_volume USING gin(table_data);

-- Composite index for efficient "latest by area" queries
CREATE INDEX IF NOT EXISTS idx_district_volume_area_start_date
    ON hrs.district_volume (area, start_date DESC);