CREATE TABLE IF NOT EXISTS hrs.district_volume (
    id                  BIGSERIAL     PRIMARY KEY,
    area                VARCHAR(10)   NOT NULL,
    start_date          DATE          NOT NULL,
    end_date            DATE,
    date_of_upload      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    table_data          JSONB         NOT NULL,
    table_level_factor  NUMERIC(10,3) NOT NULL,
    heli_multiplier     NUMERIC(10,3),
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(128)  NOT NULL,
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_by          VARCHAR(128)  NOT NULL,

    CONSTRAINT chk_area CHECK (area IN ('INTERIOR', 'COASTAL'))
);

COMMENT ON TABLE hrs.district_volume IS
'This table stores district waste volume data used to estimate waste volume on blocks.';

COMMENT ON COLUMN hrs.district_volume.area IS
'Geographic area associated with the waste policy used for calculating district volume averages.
Currently, two areas are supported: INTERIOR (North Interior and South Interior) and COASTAL (Coast).';

COMMENT ON COLUMN hrs.district_volume.start_date IS
'The date from which this district volume record is used to calculate waste volume for blocks submitted on or after this date.';

COMMENT ON COLUMN hrs.district_volume.end_date IS
'The end date until which this district volume record is used to calculate waste volume for blocks.';

COMMENT ON COLUMN hrs.district_volume.date_of_upload IS
'The timestamp when the spreadsheet file (CSV or Excel) was uploaded.';

COMMENT ON COLUMN hrs.district_volume.table_data IS
'JSON representation of the spreadsheet data uploaded by the user (CSV or Excel).';

COMMENT ON COLUMN hrs.district_volume.table_level_factor IS
'Weighted average of district volumes. Applies to both INTERIOR and COASTAL areas.';

COMMENT ON COLUMN hrs.district_volume.heli_multiplier IS
'A multiplier factor used to calculate waste volume for helicopter-harvested cut blocks.
This currently applies to COASTAL areas only, but it is expected to be applied to INTERIOR areas in the future.
For now, the INTERIOR multiplier is set to 1.';

COMMENT ON COLUMN hrs.district_volume.created_at IS
'The timestamp when the record was created.';

COMMENT ON COLUMN hrs.district_volume.created_by IS
'The user or service account that created the record.';

COMMENT ON COLUMN hrs.district_volume.updated_at IS
'The timestamp when the record was last updated.';

COMMENT ON COLUMN hrs.district_volume.updated_by IS
'The user or service account that last updated the record.';

-- GIN index for future JSONB query support
CREATE INDEX IF NOT EXISTS idx_district_volume_data_gin
ON hrs.district_volume USING gin(table_data);

-- Composite index for efficient "latest by area" queries
CREATE INDEX IF NOT EXISTS idx_district_volume_area_start_date
ON hrs.district_volume (area, start_date DESC);