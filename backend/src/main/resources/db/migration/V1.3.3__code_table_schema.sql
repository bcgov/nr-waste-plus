CREATE TABLE IF NOT EXISTS wasteplus.geographic_code (
    id numeric(10, 0) NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    geo_type text NOT NULL,
    effective_date timestamp without time zone NOT NULL,
    expiry_date timestamp without time zone NOT NULL,
    update_timestamp timestamp without time zone
);

COMMENT ON TABLE wasteplus.geographic_code IS
'Typed geographic codes for HRS; the historical seed contains districts only, '
'not a current authoritative extract.';
COMMENT ON COLUMN wasteplus.geographic_code.id IS
'Stable source identifier retained from ORG_UNIT_NO for seeded districts.';
COMMENT ON COLUMN wasteplus.geographic_code.code IS
'Geographic business code stored by wasteplus.reporting_unit.geographic_code.';
COMMENT ON COLUMN wasteplus.geographic_code.description IS
'Human-readable geographic description.';
COMMENT ON COLUMN wasteplus.geographic_code.geo_type IS
'Geographic taxonomy: REGION, DISTRICT, or AREA. Historical seed records are '
'DISTRICT only; region and area require authoritative source data.';
COMMENT ON COLUMN wasteplus.geographic_code.effective_date IS
'Source effective timestamp, preserving the time component of Oracle DATE.';
COMMENT ON COLUMN wasteplus.geographic_code.expiry_date IS
'Source expiry timestamp, preserving the time component of Oracle DATE.';
COMMENT ON COLUMN wasteplus.geographic_code.update_timestamp IS
'Nullable source update timestamp; Oracle DATE time is preserved.';

CREATE TABLE IF NOT EXISTS wasteplus.sampling_option_code (
    code text NOT NULL,
    description text NOT NULL,
    effective_date timestamp without time zone NOT NULL,
    expiry_date timestamp without time zone NOT NULL,
    update_timestamp timestamp without time zone NOT NULL
);

COMMENT ON TABLE wasteplus.sampling_option_code IS
'Historical Oracle sampling options plus HRS District Average.';
COMMENT ON COLUMN wasteplus.sampling_option_code.code IS
'Sampling option business code.';
COMMENT ON COLUMN wasteplus.sampling_option_code.description IS
'Sampling option description.';
COMMENT ON COLUMN wasteplus.sampling_option_code.effective_date IS
'Source effective value including time; apply active-date rules.';
COMMENT ON COLUMN wasteplus.sampling_option_code.expiry_date IS
'Source expiry value including time; apply active-date rules.';
COMMENT ON COLUMN wasteplus.sampling_option_code.update_timestamp IS
'Oracle UPDATE_TIMESTAMP DATE including time.';

CREATE TABLE IF NOT EXISTS wasteplus.waa_status_code (
    code text NOT NULL,
    description text NOT NULL,
    effective_date timestamp without time zone NOT NULL,
    expiry_date timestamp without time zone NOT NULL,
    update_timestamp timestamp without time zone NOT NULL
);

COMMENT ON TABLE wasteplus.waa_status_code IS
'Oracle WAA codes approved for HRS block status; seed is historical, not '
'current authority.';
COMMENT ON COLUMN wasteplus.waa_status_code.code IS
'Oracle WASTE_ASSESS_AREA_STS_CODE business code.';
COMMENT ON COLUMN wasteplus.waa_status_code.description IS
'Historical Oracle WAA status description.';
COMMENT ON COLUMN wasteplus.waa_status_code.effective_date IS
'Source effective value including time; apply active-date rules.';
COMMENT ON COLUMN wasteplus.waa_status_code.expiry_date IS
'Source expiry value including time; apply active-date rules.';
COMMENT ON COLUMN wasteplus.waa_status_code.update_timestamp IS
'Oracle UPDATE_TIMESTAMP DATE including time.';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'wasteplus'
          AND table_name = 'reporting_unit'
          AND column_name = 'org_unit_no'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'wasteplus'
          AND table_name = 'reporting_unit'
          AND column_name = 'geographic_code'
    ) THEN
        ALTER TABLE wasteplus.reporting_unit RENAME COLUMN org_unit_no TO geographic_code;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'wasteplus'
          AND table_name = 'reporting_unit'
          AND column_name = 'org_unit_no'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'wasteplus'
          AND table_name = 'reporting_unit'
          AND column_name = 'geographic_code'
    ) THEN
        RAISE EXCEPTION
            'Both wasteplus.reporting_unit.org_unit_no and geographic_code exist; reconcile before migration';
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'wasteplus'
          AND table_name = 'reporting_unit'
          AND column_name = 'geographic_code'
    ) THEN
        RAISE EXCEPTION
            'Neither wasteplus.reporting_unit.org_unit_no nor geographic_code exists';
    END IF;
END;
$$;

ALTER TABLE wasteplus.reporting_unit ADD COLUMN IF NOT EXISTS sampling_code text;
ALTER TABLE wasteplus.block ADD COLUMN IF NOT EXISTS status_code text;

COMMENT ON COLUMN wasteplus.reporting_unit.sampling_code IS
'Nullable sampling business code; references sampling_option_code.code.';
COMMENT ON COLUMN wasteplus.reporting_unit.geographic_code IS
'Three-character district code; references geographic_code.code.';
COMMENT ON COLUMN wasteplus.block.status_code IS
'Nullable block status; references approved WAA codes, not status_event '
'history.';

CREATE INDEX IF NOT EXISTS
idx_reporting_unit_geographic_code ON wasteplus.reporting_unit (geographic_code);
CREATE INDEX IF NOT EXISTS
idx_reporting_unit_sampling_code ON wasteplus.reporting_unit (sampling_code);
CREATE INDEX IF NOT EXISTS idx_block_status_code ON wasteplus.block (status_code);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'wasteplus.geographic_code'::regclass
          AND conname = 'geographic_code_pk'
    ) THEN
        ALTER TABLE wasteplus.geographic_code
            ADD CONSTRAINT geographic_code_pk PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'wasteplus.geographic_code'::regclass
          AND conname = 'uq_geographic_code_code'
    ) THEN
        ALTER TABLE wasteplus.geographic_code
            ADD CONSTRAINT uq_geographic_code_code UNIQUE (code);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'wasteplus.geographic_code'::regclass
          AND conname = 'geographic_code_geo_type_ck'
    ) THEN
        ALTER TABLE wasteplus.geographic_code
            ADD CONSTRAINT geographic_code_geo_type_ck
            CHECK (geo_type IN ('REGION', 'DISTRICT', 'AREA'));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'wasteplus.sampling_option_code'::regclass
          AND conname = 'sampling_option_code_pk'
    ) THEN
        ALTER TABLE wasteplus.sampling_option_code
            ADD CONSTRAINT sampling_option_code_pk PRIMARY KEY (code);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'wasteplus.sampling_option_code'::regclass
          AND conname = 'sampling_option_code_lengths_ck'
    ) THEN
        ALTER TABLE wasteplus.sampling_option_code
            ADD CONSTRAINT sampling_option_code_lengths_ck CHECK (
                char_length(code) <= 3
                AND char_length(description) <= 120
            );
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'wasteplus.waa_status_code'::regclass
          AND conname = 'waa_status_code_pk'
    ) THEN
        ALTER TABLE wasteplus.waa_status_code
            ADD CONSTRAINT waa_status_code_pk PRIMARY KEY (code);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'wasteplus.waa_status_code'::regclass
          AND conname = 'waa_status_code_lengths_ck'
    ) THEN
        ALTER TABLE wasteplus.waa_status_code
            ADD CONSTRAINT waa_status_code_lengths_ck CHECK (
                char_length(code) <= 4
                AND char_length(description) <= 120
            );
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'wasteplus.reporting_unit'::regclass
          AND conname = 'fk_reporting_unit_geographic_code'
    ) THEN
        ALTER TABLE wasteplus.reporting_unit
            ADD CONSTRAINT fk_reporting_unit_geographic_code
            FOREIGN KEY (geographic_code) REFERENCES wasteplus.geographic_code (code)
            ON UPDATE RESTRICT ON DELETE RESTRICT NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'wasteplus.reporting_unit'::regclass
          AND conname = 'fk_reporting_unit_sampling_code'
    ) THEN
        ALTER TABLE wasteplus.reporting_unit
            ADD CONSTRAINT fk_reporting_unit_sampling_code
            FOREIGN KEY (sampling_code) REFERENCES wasteplus.sampling_option_code (code)
            ON UPDATE RESTRICT ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'wasteplus.block'::regclass
          AND conname = 'fk_block_waa_status_code'
    ) THEN
        ALTER TABLE wasteplus.block
            ADD CONSTRAINT fk_block_waa_status_code
            FOREIGN KEY (status_code) REFERENCES wasteplus.waa_status_code (code)
            ON UPDATE RESTRICT ON DELETE RESTRICT;
    END IF;
END;
$$;

COMMENT ON CONSTRAINT fk_reporting_unit_geographic_code ON wasteplus.reporting_unit IS
'NOT VALID skips existing rows; new writes are checked. Validate after loading '
'an approved complete geographic-code extract and reconciling all existing '
'district codes.';
