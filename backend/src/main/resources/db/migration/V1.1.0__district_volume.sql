-- ============================================================================
-- V1.1.0__district_volume.sql — Issue #902: district_volume with JSONB
-- table_data, INTERIOR/COASTAL check, soft-delete, id sequence, PK and the
-- area/start_date index; config_type discriminator and its index from #1048;
-- column documentation from #1300. The legacy table_data GIN index is not
-- part of this baseline (#1364).
-- ============================================================================
CREATE TABLE IF NOT EXISTS hrs.district_volume(
    district_volume_id bigint NOT NULL,
    area character varying(10) NOT NULL,
    start_date date NOT NULL,
    end_date date,
    date_of_upload timestamp with time zone DEFAULT now() NOT NULL,
    table_data jsonb NOT NULL,
    table_level_factor numeric(10, 3) NOT NULL,
    heli_multiplier numeric(10, 3),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying(128) NOT NULL,
    config_type character varying(50) DEFAULT 'DISTRICT_VOLUME'::character varying NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    CONSTRAINT chk_area CHECK (area IN ('INTERIOR', 'COASTAL'))
    );

COMMENT ON TABLE hrs.district_volume IS 'Stores district waste volume and species composition data used to estimate waste volume on blocks.';

COMMENT ON COLUMN hrs.district_volume.area IS 'Geographic area associated with the waste policy used for calculating district volume averages.
Currently, two areas are supported: INTERIOR (North Interior and South Interior) and COASTAL (Coast).';

COMMENT ON COLUMN hrs.district_volume.start_date IS 'The date from which this district volume record is used to calculate waste volume for blocks submitted on or after this date.';

COMMENT ON COLUMN hrs.district_volume.end_date IS 'The end date until which this district volume record is used to calculate waste volume for blocks.';

COMMENT ON COLUMN hrs.district_volume.date_of_upload IS 'The timestamp when the spreadsheet file (CSV or Excel) was uploaded.';

COMMENT ON COLUMN hrs.district_volume.table_data IS 'JSON representation of the spreadsheet data uploaded by the user (CSV or Excel).';

COMMENT ON COLUMN hrs.district_volume.table_level_factor IS 'Weighted average of district volumes. Applies to both INTERIOR and COASTAL areas.';

COMMENT ON COLUMN hrs.district_volume.heli_multiplier IS 'A multiplier factor used to calculate waste volume for helicopter-harvested cut blocks.
This currently applies to COASTAL areas only, but it is expected to be applied to INTERIOR areas in the future.
For now, the INTERIOR multiplier is set to 1.';

COMMENT ON COLUMN hrs.district_volume.created_at IS 'The timestamp when the record was created.';

COMMENT ON COLUMN hrs.district_volume.created_by IS 'The user or service account that created the record.';

COMMENT ON COLUMN hrs.district_volume.updated_at IS 'The timestamp when the record was last updated.';

COMMENT ON COLUMN hrs.district_volume.updated_by IS 'The user or service account that last updated the record.';

CREATE SEQUENCE IF NOT EXISTS hrs.district_volume_id_seq START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.district_volume_id_seq OWNED BY hrs.district_volume.district_volume_id;

ALTER TABLE ONLY hrs.district_volume
    ALTER COLUMN district_volume_id SET DEFAULT nextval('hrs.district_volume_id_seq'::regclass);

ALTER TABLE ONLY hrs.district_volume
    DROP CONSTRAINT IF EXISTS district_volume_pkey CASCADE;

ALTER TABLE ONLY hrs.district_volume
    ADD CONSTRAINT district_volume_pkey PRIMARY KEY (district_volume_id);

CREATE INDEX IF NOT EXISTS idx_district_volume_area_start_date ON hrs.district_volume USING btree(area, start_date DESC);

-- ============================================================================
-- V1.0.4__add_config_type_to_district_volume.sql — Issue #1048:
-- district_volume.config_type (column folded into the district_volume
-- definition above).
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_district_volume_config_type ON hrs.district_volume USING btree(config_type);

-- ============================================================================
-- V1.1.8__da_schema_standards.sql — Issue #1300: column
-- documentation (and FK constraints) for the tables owned by this file.
-- ============================================================================
COMMENT ON COLUMN hrs.district_volume.district_volume_id IS 'Unique identifier for the district volume configuration record.';

COMMENT ON COLUMN hrs.district_volume.config_type IS 'Configuration type: DISTRICT_VOLUME or SPECIES_COMPOSITION.';

COMMENT ON COLUMN hrs.district_volume.is_deleted IS 'Soft-delete flag; active queries must filter is_deleted = FALSE.';
