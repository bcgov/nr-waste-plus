-- ============================================================================
-- V1.3.0__formula_config_and_lifecycle_settings.sql — Issue #1216: lifecycle
-- timers (lifecycle_setting + seed rows) and Issue #1219: independent
-- formula sets (formula_set, formula_set_row with sequences, FK, effective
-- and row-ordering indexes). Column documentation from #1300.
-- hrs.district_volume_formula is not part of this baseline (superseded by
-- formula_set, dropped by #1364). Audit trigger bindings for the formula_set
-- tables live in V1.3.1, after hrs.audit_row_change() exists.
-- ============================================================================
CREATE TABLE IF NOT EXISTS hrs.lifecycle_setting(
    lifecycle_setting_id bigint NOT NULL,
    setting_key character varying(128) NOT NULL,
    setting_value character varying(256) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying(128) NOT NULL
    );

COMMENT ON TABLE hrs.lifecycle_setting IS 'Configurable lifecycle timing values stored as key/value settings.';

CREATE SEQUENCE IF NOT EXISTS hrs.lifecycle_setting_id_seq START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.lifecycle_setting_id_seq OWNED BY hrs.lifecycle_setting.lifecycle_setting_id;

ALTER TABLE ONLY hrs.lifecycle_setting
    ALTER COLUMN lifecycle_setting_id SET DEFAULT nextval('hrs.lifecycle_setting_id_seq'::regclass);

ALTER TABLE ONLY hrs.lifecycle_setting
    DROP CONSTRAINT IF EXISTS lifecycle_setting_key_uq CASCADE;

ALTER TABLE ONLY hrs.lifecycle_setting
    ADD CONSTRAINT lifecycle_setting_key_uq UNIQUE (setting_key);

ALTER TABLE ONLY hrs.lifecycle_setting
    DROP CONSTRAINT IF EXISTS lifecycle_setting_pk CASCADE;

ALTER TABLE ONLY hrs.lifecycle_setting
    ADD CONSTRAINT lifecycle_setting_pk PRIMARY KEY (lifecycle_setting_id);

-- Seed rows (V1.1.5): configurable lifecycle timing values.
INSERT INTO hrs.lifecycle_setting(setting_key, setting_value, created_by, updated_by)
    VALUES
    ('AUTO_APPROVE_MONTHS', '12', current_user, current_user),
    ('BILLING_DELAY_MONTHS', '1', current_user, current_user)
    ON CONFLICT (setting_key)
    DO NOTHING;

-- ============================================================================
-- V1.1.7__independent_formula_sets.sql — Issue #1219: independent formula
-- configuration (formula_set, formula_set_row) + column documentation. The
-- formula_set_row .declared_variables and .validation_errors columns are
-- excluded per #1364. Their audit trigger bindings are carried in V1.3.1,
-- after hrs.audit_row_change() exists.
-- ============================================================================
CREATE TABLE IF NOT EXISTS hrs.formula_set(
    formula_set_id bigint NOT NULL,
    area character varying(10) NOT NULL,
    start_date date NOT NULL,
    end_date date,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying(128) NOT NULL,
    CONSTRAINT formula_set_dates_ck CHECK (((end_date IS NULL) OR (end_date >= start_date)))
    );

CREATE SEQUENCE IF NOT EXISTS hrs.formula_set_id_seq START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.formula_set_id_seq OWNED BY hrs.formula_set.formula_set_id;

CREATE TABLE IF NOT EXISTS hrs.formula_set_row(
    formula_set_row_id bigint NOT NULL,
    formula_set_id bigint NOT NULL,
    formula_key character varying(128) NOT NULL,
    expression character varying(4000) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying(128) NOT NULL,
    CONSTRAINT formula_set_row_order_ck CHECK ((sort_order >= 0))
    );

CREATE SEQUENCE IF NOT EXISTS hrs.formula_set_row_id_seq START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.formula_set_row_id_seq OWNED BY hrs.formula_set_row.formula_set_row_id;

ALTER TABLE ONLY hrs.formula_set
    ALTER COLUMN formula_set_id SET DEFAULT nextval('hrs.formula_set_id_seq'::regclass);

ALTER TABLE ONLY hrs.formula_set_row
    ALTER COLUMN formula_set_row_id SET DEFAULT nextval('hrs.formula_set_row_id_seq'::regclass);

ALTER TABLE ONLY hrs.formula_set
    DROP CONSTRAINT IF EXISTS formula_set_pkey CASCADE;

ALTER TABLE ONLY hrs.formula_set
    ADD CONSTRAINT formula_set_pkey PRIMARY KEY (formula_set_id);

ALTER TABLE ONLY hrs.formula_set_row
    DROP CONSTRAINT IF EXISTS formula_set_row_key_uq CASCADE;

ALTER TABLE ONLY hrs.formula_set_row
    ADD CONSTRAINT formula_set_row_key_uq UNIQUE (formula_set_id, formula_key);

ALTER TABLE ONLY hrs.formula_set_row
    DROP CONSTRAINT IF EXISTS formula_set_row_pkey CASCADE;

ALTER TABLE ONLY hrs.formula_set_row
    ADD CONSTRAINT formula_set_row_pkey PRIMARY KEY (formula_set_row_id);

CREATE INDEX IF NOT EXISTS formula_set_effective_ix ON hrs.formula_set USING btree(area, start_date, end_date)
    WHERE (is_deleted = false);

CREATE INDEX IF NOT EXISTS formula_set_row_set_ix ON hrs.formula_set_row USING btree(formula_set_id, sort_order, formula_set_row_id);

-- ============================================================================
-- V1.1.8__da_schema_standards.sql — Issue #1300: column
-- documentation (and FK constraints) for the tables owned by this file.
-- ============================================================================
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

COMMENT ON COLUMN hrs.formula_set_row.sort_order IS 'Display and evaluation sort order index.';

COMMENT ON COLUMN hrs.formula_set_row.is_deleted IS 'Soft-delete flag.';

COMMENT ON COLUMN hrs.formula_set_row.created_at IS 'Timestamp when the formula row was created.';

COMMENT ON COLUMN hrs.formula_set_row.created_by IS 'Actor that created the formula row.';

COMMENT ON COLUMN hrs.formula_set_row.updated_at IS 'Timestamp when the formula row was last modified.';

COMMENT ON COLUMN hrs.formula_set_row.updated_by IS 'Actor that last modified the formula row.';

COMMENT ON COLUMN hrs.lifecycle_setting.lifecycle_setting_id IS 'Unique identifier for the lifecycle setting.';

COMMENT ON COLUMN hrs.lifecycle_setting.setting_key IS 'Unique setting key identifier.';

COMMENT ON COLUMN hrs.lifecycle_setting.setting_value IS 'Setting value string.';

COMMENT ON COLUMN hrs.lifecycle_setting.created_at IS 'Timestamp when the setting was created.';

COMMENT ON COLUMN hrs.lifecycle_setting.created_by IS 'Actor that created the setting.';

COMMENT ON COLUMN hrs.lifecycle_setting.updated_at IS 'Timestamp when the setting was last modified.';

COMMENT ON COLUMN hrs.lifecycle_setting.updated_by IS 'Actor that last modified the setting.';

ALTER TABLE ONLY hrs.formula_set_row
    DROP CONSTRAINT IF EXISTS fk_formula_set_row_formula_set CASCADE;

ALTER TABLE ONLY hrs.formula_set_row
    ADD CONSTRAINT fk_formula_set_row_formula_set FOREIGN KEY (formula_set_id) REFERENCES hrs.formula_set(formula_set_id);
