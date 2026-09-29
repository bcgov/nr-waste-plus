-- ============================================================================
-- V1.0.0__hrs_baseline.sql — consolidated hrs schema baseline (issue #1364)
-- ============================================================================
--
-- This single migration replaces the historical sequence V1.0.0..V1.1.10
-- (18 files), rewritten as the final state of that sequence minus the
-- structures removed by issue #1364:
--
--   * hrs.user_identity                        (was V1.0.1)
--   * hrs.district_volume_formula              (was V1.1.5)
--   * hrs.formula_set_row.declared_variables   (was V1.1.7)
--   * hrs.formula_set_row.validation_errors    (was V1.1.7)
--   * idx_district_volume_data_gin on district_volume.table_data
--                                             (was V1.0.3)
--
-- Fresh databases: Flyway applies this baseline first, then V1.1.11
-- (whose guarded drops are no-ops on this already-clean state).
--
-- Databases already migrated through the old sequence (flyway_schema_history
-- holding V1.0.1..V1.1.10) MUST run `flyway repair` once before `flyway
-- migrate` (Flyway CLI — Spring Boot 4.1 has no repair-on-migrate property):
-- repair updates the changed V1.0.0 checksum and marks the now-missing
-- V1.0.1..V1.1.10 history rows deleted, after which migrate applies V1.1.11.
-- Recreating the database is the alternative. Neither hrs.user_identity nor
-- hrs.district_volume_formula was ever populated outside local development,
-- so no data migration is needed.
--
-- Sections below are headed by the original migration file (and issue) they
-- consolidate. DDL from later migrations that altered an earlier table is
-- folded into that table's definition and noted in the section header.
-- All DDL is idempotent (IF NOT EXISTS / IF EXISTS / CREATE OR REPLACE /
-- DROP-then-ADD constraints).


CREATE SCHEMA IF NOT EXISTS hrs;

-- ============================================================================
-- V1.0.0__user_preferences.sql — hrs schema and user_preferences.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hrs.user_preferences (
    user_id character varying(60) NOT NULL,
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    revision bigint DEFAULT 1 NOT NULL
);

COMMENT ON TABLE hrs.user_preferences IS 'Table to store user preferences in JSON format';

COMMENT ON COLUMN hrs.user_preferences.user_id IS 'Unique identifier for the user';

COMMENT ON COLUMN hrs.user_preferences.preferences IS 'User preferences stored in JSON format';

COMMENT ON COLUMN hrs.user_preferences.updated_date IS 'Timestamp of the last update to the user preferences';

COMMENT ON COLUMN hrs.user_preferences.revision IS 'Revision number for optimistic locking';

ALTER TABLE ONLY hrs.user_preferences
    DROP CONSTRAINT IF EXISTS user_preferences_pk CASCADE;
ALTER TABLE ONLY hrs.user_preferences
    ADD CONSTRAINT user_preferences_pk PRIMARY KEY (user_id);

-- ============================================================================
-- V1.0.2__bookmarks.sql — user_bookmarks.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hrs.user_bookmarks (
    user_id character varying(60) NOT NULL,
    reporting_unit_id bigint NOT NULL
);

COMMENT ON TABLE hrs.user_bookmarks IS '
Table to store user bookmarked reporting units.
Users can bookmark multiple reporting units.
Each reporting unit can be bookmarked by multiple users.
Bookmarked reporting units are also used as reference for the offline mode.';

COMMENT ON COLUMN hrs.user_bookmarks.user_id IS 'Unique identifier for the user';

COMMENT ON COLUMN hrs.user_bookmarks.reporting_unit_id IS '
Unique identifier for the reporting unit that the user has bookmarked.
This is a foreign key referencing the reporting unit in the oracle database.';

ALTER TABLE ONLY hrs.user_bookmarks
    DROP CONSTRAINT IF EXISTS user_bookmarks_pk CASCADE;
ALTER TABLE ONLY hrs.user_bookmarks
    ADD CONSTRAINT user_bookmarks_pk PRIMARY KEY (user_id, reporting_unit_id);

CREATE INDEX IF NOT EXISTS idx_user_bookmarks_reporting_unit_id ON hrs.user_bookmarks USING btree (reporting_unit_id);

-- ============================================================================
-- V1.0.3__district_volume.sql — district_volume (composite/generic indexes;
-- the JSONB GIN index idx_district_volume_data_gin is removed by #1364, see
-- V1.1.11).
-- ============================================================================

CREATE TABLE IF NOT EXISTS hrs.district_volume (
    district_volume_id bigint NOT NULL,
    area character varying(10) NOT NULL,
    start_date date NOT NULL,
    end_date date,
    date_of_upload timestamp with time zone DEFAULT now() NOT NULL,
    table_data jsonb NOT NULL,
    table_level_factor numeric(10,3) NOT NULL,
    heli_multiplier numeric(10,3),
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

CREATE SEQUENCE IF NOT EXISTS hrs.district_volume_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.district_volume_id_seq OWNED BY hrs.district_volume.district_volume_id;

ALTER TABLE ONLY hrs.district_volume ALTER COLUMN district_volume_id SET DEFAULT nextval('hrs.district_volume_id_seq'::regclass);

ALTER TABLE ONLY hrs.district_volume
    DROP CONSTRAINT IF EXISTS district_volume_pkey CASCADE;
ALTER TABLE ONLY hrs.district_volume
    ADD CONSTRAINT district_volume_pkey PRIMARY KEY (district_volume_id);

CREATE INDEX IF NOT EXISTS idx_district_volume_area_start_date ON hrs.district_volume USING btree (area, start_date DESC);

-- ============================================================================
-- V1.0.4__add_config_type_to_district_volume.sql —
-- district_volume.config_type (column folded into the district_volume
-- definition in the V1.0.3 section).
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_district_volume_config_type ON hrs.district_volume USING btree (config_type);

-- ============================================================================
-- V1.0.5__audit_and_soft_delete.sql — Issue 1183: database-trigger audit
-- framework (audit_event, audit_change, audit_district_volume_change,
-- district_volume audit trigger). Function body is the final V1.1.8 (#1300)
-- definition.
-- ============================================================================

CREATE OR REPLACE FUNCTION hrs.audit_district_volume_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'hrs'
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

COMMENT ON FUNCTION hrs.audit_district_volume_change() IS 'Writes complete OLD and NEW row-image audit records for all district_volume mutations. The actor comes from row audit columns and falls back to session_user (current_user inside SECURITY DEFINER resolves to the function owner, not the caller). The correlation_id comes from current_setting(''app.correlation_id'', true) and is NULL when unset.';

CREATE TABLE IF NOT EXISTS hrs.audit_change (
    audit_change_id bigint NOT NULL,
    event_id bigint NOT NULL,
    entity_type character varying(64) NOT NULL,
    entity_id bigint NOT NULL,
    action character varying(32) NOT NULL,
    previous_values jsonb,
    current_values jsonb,
    changed_columns text[] DEFAULT '{}'::text[] NOT NULL
);

COMMENT ON TABLE hrs.audit_change IS 'Append-only per-row audit change with JSONB snapshot. No FK on entity_id (polymorphic audit).';

COMMENT ON COLUMN hrs.audit_change.previous_values IS 'Full snapshot before mutation as JSONB.';

COMMENT ON COLUMN hrs.audit_change.current_values IS 'Full snapshot after mutation as JSONB.';

CREATE SEQUENCE IF NOT EXISTS hrs.audit_change_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.audit_change_id_seq OWNED BY hrs.audit_change.audit_change_id;

CREATE TABLE IF NOT EXISTS hrs.audit_event (
    audit_event_id bigint NOT NULL,
    action character varying(32) NOT NULL,
    changed_by character varying(128) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    reason character varying(500),
    correlation_id character varying(128)
);

COMMENT ON TABLE hrs.audit_event IS 'Immutable audit event grouping one temporal mutation operation.';

COMMENT ON COLUMN hrs.audit_event.action IS 'Mutation operation type: CREATE, UPDATE, SOFT_DELETE, DELETE.';

CREATE SEQUENCE IF NOT EXISTS hrs.audit_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.audit_event_id_seq OWNED BY hrs.audit_event.audit_event_id;

ALTER TABLE ONLY hrs.audit_change ALTER COLUMN audit_change_id SET DEFAULT nextval('hrs.audit_change_id_seq'::regclass);

ALTER TABLE ONLY hrs.audit_event ALTER COLUMN audit_event_id SET DEFAULT nextval('hrs.audit_event_id_seq'::regclass);

ALTER TABLE ONLY hrs.audit_change
    DROP CONSTRAINT IF EXISTS audit_change_pkey CASCADE;
ALTER TABLE ONLY hrs.audit_change
    ADD CONSTRAINT audit_change_pkey PRIMARY KEY (audit_change_id);

ALTER TABLE ONLY hrs.audit_event
    DROP CONSTRAINT IF EXISTS audit_event_pkey CASCADE;
ALTER TABLE ONLY hrs.audit_event
    ADD CONSTRAINT audit_event_pkey PRIMARY KEY (audit_event_id);

CREATE INDEX IF NOT EXISTS idx_audit_change_entity_lookup ON hrs.audit_change USING btree (entity_type, entity_id, audit_change_id DESC);

CREATE INDEX IF NOT EXISTS idx_audit_change_entity_type_id ON hrs.audit_change USING btree (entity_type, audit_change_id DESC);

CREATE INDEX IF NOT EXISTS idx_audit_change_event_id ON hrs.audit_change USING btree (event_id);

CREATE INDEX IF NOT EXISTS idx_audit_event_changed_by_time ON hrs.audit_event USING btree (changed_by, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_district_volume_config_type_area_start ON hrs.district_volume USING btree (config_type, area, start_date);

CREATE INDEX IF NOT EXISTS idx_district_volume_live_config_area_start ON hrs.district_volume USING btree (config_type, area, start_date) WHERE (is_deleted = false);

DROP TRIGGER IF EXISTS trg_district_volume_audit ON hrs.district_volume;
CREATE TRIGGER trg_district_volume_audit AFTER INSERT OR DELETE OR UPDATE ON hrs.district_volume FOR EACH ROW EXECUTE FUNCTION hrs.audit_district_volume_change();

-- ============================================================================
-- V1.0.6__audit_correlation_id.sql — SPIKE: B3 correlation id (column
-- folded into audit_event; partial index carried here;
-- audit_district_volume_change body folded per V1.0.5).
-- ============================================================================

COMMENT ON COLUMN hrs.audit_event.correlation_id IS 'Distributed tracing correlation identifier.';

CREATE INDEX IF NOT EXISTS idx_audit_event_correlation_time ON hrs.audit_event USING btree (correlation_id, changed_at DESC) WHERE (correlation_id IS NOT NULL);

-- ============================================================================
-- V1.1.0__submission_core.sql — Issue #1215: District Average submission
-- core. Column additions from V1.1.3 (#1272) and naming-standardization
-- renames from V1.1.8 (#1300) are folded into these table definitions.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hrs.block (
    block_id bigint NOT NULL,
    reporting_unit_id bigint NOT NULL,
    block_type character varying(32) NOT NULL,
    is_draft boolean DEFAULT true NOT NULL,
    plc_date date,
    revision bigint DEFAULT 1 NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL
);

COMMENT ON TABLE hrs.block IS 'Submission block belonging to a reporting unit. Equivalent to a "cut block" in legacy/FTA terminology — renamed for consistency with app-wide usage.';

CREATE TABLE IF NOT EXISTS hrs.block_area_segment (
    block_area_segment_id bigint NOT NULL,
    block_id bigint NOT NULL,
    source character varying(32) NOT NULL,
    area_ha numeric(12,3),
    road_length_m numeric(12,3),
    road_width_m numeric(12,3),
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    block_mark_id bigint,
    starting_area_ha numeric(12,3),
    net_waste_area_ha numeric(12,3)
);

COMMENT ON TABLE hrs.block_area_segment IS 'Area and road segments used by a submission block.';

CREATE SEQUENCE IF NOT EXISTS hrs.block_area_segment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.block_area_segment_id_seq OWNED BY hrs.block_area_segment.block_area_segment_id;

CREATE SEQUENCE IF NOT EXISTS hrs.block_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.block_id_seq OWNED BY hrs.block.block_id;

CREATE TABLE IF NOT EXISTS hrs.block_mark (
    block_mark_id bigint NOT NULL,
    block_id bigint NOT NULL,
    mark_type character varying(32) NOT NULL,
    sequence_no integer NOT NULL,
    mark character varying(64) NOT NULL,
    validation_status character varying(32),
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    forest_file_id character varying(128),
    timber_mark character varying(128),
    cutting_permit_id character varying(128),
    cut_block_id character varying(128),
    CONSTRAINT block_mark_sequence_ck CHECK ((((mark_type)::text <> 'SECONDARY'::text) OR ((sequence_no >= 1) AND (sequence_no <= 5))))
);

COMMENT ON TABLE hrs.block_mark IS 'Typed forest and road marks associated with a submission block. "Block mark" is equivalent to "timber mark" in legacy/FTA terminology — renamed for consistency with app-wide usage.';

CREATE SEQUENCE IF NOT EXISTS hrs.block_mark_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.block_mark_id_seq OWNED BY hrs.block_mark.block_mark_id;

CREATE TABLE IF NOT EXISTS hrs.district_average_block (
    district_average_block_id bigint NOT NULL,
    benchmark_zone character varying(32),
    maturity character varying(32),
    retention_percentage numeric(5,2),
    criteria integer[],
    coast_ground_based_area_ha numeric(12,3),
    coast_helicopter_area_ha numeric(12,3),
    revision bigint DEFAULT 1 NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    harvest_status_code character varying(32),
    bec_zone character varying(32),
    bec_subvariant character varying(32),
    has_dispersed_retention boolean NOT NULL,
    dispersed_retention_pct numeric(5,2),
    primary_logging_complete_date date,
    is_heli_logging boolean NOT NULL,
    cable_yarding_area_ha numeric(12,3),
    skyline_logging_area_ha numeric(12,3)
);

COMMENT ON TABLE hrs.district_average_block IS 'District Average-specific block extension.';

CREATE TABLE IF NOT EXISTS hrs.reporting_unit (
    reporting_unit_id bigint NOT NULL,
    client_number character varying(8) NOT NULL,
    client_locn_code character varying(32) NOT NULL,
    org_unit_no character varying(3) NOT NULL,
    revision bigint DEFAULT 1 NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL
);

COMMENT ON TABLE hrs.reporting_unit IS 'Locally-owned reporting unit for a District Average submission.';

CREATE SEQUENCE IF NOT EXISTS hrs.reporting_unit_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.reporting_unit_id_seq OWNED BY hrs.reporting_unit.reporting_unit_id;

ALTER TABLE ONLY hrs.block ALTER COLUMN block_id SET DEFAULT nextval('hrs.block_id_seq'::regclass);

ALTER TABLE ONLY hrs.block_area_segment ALTER COLUMN block_area_segment_id SET DEFAULT nextval('hrs.block_area_segment_id_seq'::regclass);

ALTER TABLE ONLY hrs.block_mark ALTER COLUMN block_mark_id SET DEFAULT nextval('hrs.block_mark_id_seq'::regclass);

ALTER TABLE ONLY hrs.reporting_unit ALTER COLUMN reporting_unit_id SET DEFAULT nextval('hrs.reporting_unit_id_seq'::regclass);

ALTER TABLE ONLY hrs.block_area_segment
    DROP CONSTRAINT IF EXISTS block_area_segment_pk CASCADE;
ALTER TABLE ONLY hrs.block_area_segment
    ADD CONSTRAINT block_area_segment_pk PRIMARY KEY (block_area_segment_id);

ALTER TABLE ONLY hrs.block_mark
    DROP CONSTRAINT IF EXISTS block_mark_pk CASCADE;
ALTER TABLE ONLY hrs.block_mark
    ADD CONSTRAINT block_mark_pk PRIMARY KEY (block_mark_id);

ALTER TABLE ONLY hrs.block
    DROP CONSTRAINT IF EXISTS block_pk CASCADE;
ALTER TABLE ONLY hrs.block
    ADD CONSTRAINT block_pk PRIMARY KEY (block_id);

ALTER TABLE ONLY hrs.district_average_block
    DROP CONSTRAINT IF EXISTS district_average_block_pk CASCADE;
ALTER TABLE ONLY hrs.district_average_block
    ADD CONSTRAINT district_average_block_pk PRIMARY KEY (district_average_block_id);

ALTER TABLE ONLY hrs.reporting_unit
    DROP CONSTRAINT IF EXISTS reporting_unit_pk CASCADE;
ALTER TABLE ONLY hrs.reporting_unit
    ADD CONSTRAINT reporting_unit_pk PRIMARY KEY (reporting_unit_id);

CREATE INDEX IF NOT EXISTS idx_block_area_segment_block_id ON hrs.block_area_segment USING btree (block_id);

CREATE INDEX IF NOT EXISTS idx_block_mark_block_id ON hrs.block_mark USING btree (block_id);

CREATE INDEX IF NOT EXISTS idx_block_reporting_unit_id ON hrs.block USING btree (reporting_unit_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_block_mark_live_type_sequence ON hrs.block_mark USING btree (block_id, mark_type, sequence_no) WHERE (is_deleted = false);

CREATE UNIQUE INDEX IF NOT EXISTS uq_block_one_da_per_ru ON hrs.block USING btree (reporting_unit_id) WHERE (((block_type)::text = 'DISTRICT_AVERAGE'::text) AND (is_deleted = false));

CREATE UNIQUE INDEX IF NOT EXISTS uq_reporting_unit_client_district ON hrs.reporting_unit USING btree (client_number, client_locn_code, org_unit_no) WHERE (is_deleted = false);

ALTER TABLE ONLY hrs.block_area_segment
    DROP CONSTRAINT IF EXISTS fk_block_area_segment_block CASCADE;
ALTER TABLE ONLY hrs.block_area_segment
    ADD CONSTRAINT fk_block_area_segment_block FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE ONLY hrs.block_mark
    DROP CONSTRAINT IF EXISTS fk_block_mark_block CASCADE;
ALTER TABLE ONLY hrs.block_mark
    ADD CONSTRAINT fk_block_mark_block FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE ONLY hrs.block
    DROP CONSTRAINT IF EXISTS fk_block_reporting_unit CASCADE;
ALTER TABLE ONLY hrs.block
    ADD CONSTRAINT fk_block_reporting_unit FOREIGN KEY (reporting_unit_id) REFERENCES hrs.reporting_unit(reporting_unit_id);

ALTER TABLE ONLY hrs.district_average_block
    DROP CONSTRAINT IF EXISTS fk_district_average_block_block CASCADE;
ALTER TABLE ONLY hrs.district_average_block
    ADD CONSTRAINT fk_district_average_block_block FOREIGN KEY (district_average_block_id) REFERENCES hrs.block(block_id);

-- ============================================================================
-- V1.1.1__submission_evidence_and_endorsement.sql — Issue #1215: evidence,
-- endorsement, requirements, comments, calculation snapshots. Attachment
-- upload-lifecycle columns from V1.1.9 (#1225) and V1.1.10 (#1226) are
-- folded in.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hrs.block_attachment (
    block_attachment_id bigint NOT NULL,
    block_id bigint NOT NULL,
    object_key character varying(512) NOT NULL,
    file_name character varying(255),
    content_type character varying(128),
    file_size_bytes bigint,
    scan_status character varying(32) DEFAULT 'PENDING'::character varying NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    document_type character varying(64),
    status character varying(32) DEFAULT 'UPLOADING'::character varying NOT NULL,
    checksum character varying(128),
    CONSTRAINT chk_block_attachment_document_type CHECK (((document_type IS NULL) OR document_type IN ('FINAL_MAP', 'POST_HARVEST_CERTIFICATE', 'RATIONALE', 'ENDORSEMENT_LETTER', 'CALCULATOR_SPREADSHEET', 'HBS_BILLING_REPORT', 'REDUCTION_FACTOR_SUPPORT', 'OTHER'))),
    CONSTRAINT chk_block_attachment_scan_status CHECK (scan_status IN ('PENDING', 'CLEAN', 'QUARANTINED', 'FAILED')),
    CONSTRAINT chk_block_attachment_status CHECK (status IN ('UPLOADING', 'FINALIZED'))
);

COMMENT ON TABLE hrs.block_attachment IS 'Evidence attachment metadata; object content is stored outside PostgreSQL.';

CREATE SEQUENCE IF NOT EXISTS hrs.block_attachment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.block_attachment_id_seq OWNED BY hrs.block_attachment.block_attachment_id;

CREATE TABLE IF NOT EXISTS hrs.block_calculation_snapshot (
    block_calculation_snapshot_id bigint NOT NULL,
    block_id bigint NOT NULL,
    district_volume_id bigint NOT NULL,
    hbs_window_start date,
    hbs_window_end date,
    inputs jsonb NOT NULL,
    outputs jsonb NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    calculated_at timestamp with time zone,
    rounding_policy character varying(64),
    warnings jsonb
);

COMMENT ON TABLE hrs.block_calculation_snapshot IS 'Append-only calculation inputs and outputs pinned to a district-volume configuration.';

CREATE SEQUENCE IF NOT EXISTS hrs.block_calculation_snapshot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.block_calculation_snapshot_id_seq OWNED BY hrs.block_calculation_snapshot.block_calculation_snapshot_id;

CREATE TABLE IF NOT EXISTS hrs.block_comment (
    block_comment_id bigint NOT NULL,
    block_id bigint NOT NULL,
    context character varying(32) NOT NULL,
    comment character varying(4000) NOT NULL,
    status_event_id bigint,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL
);

COMMENT ON TABLE hrs.block_comment IS 'Submission block comments, including status-event context.';

CREATE SEQUENCE IF NOT EXISTS hrs.block_comment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.block_comment_id_seq OWNED BY hrs.block_comment.block_comment_id;

CREATE TABLE IF NOT EXISTS hrs.block_requirement (
    block_requirement_id bigint NOT NULL,
    block_id bigint NOT NULL,
    requirement_code character varying(64) NOT NULL,
    is_answered_yes boolean,
    response character varying(4000),
    linked_attachment_id bigint,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL
);

COMMENT ON TABLE hrs.block_requirement IS 'Requirement responses and optional evidence links for a submission block.';

CREATE SEQUENCE IF NOT EXISTS hrs.block_requirement_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.block_requirement_id_seq OWNED BY hrs.block_requirement.block_requirement_id;

CREATE TABLE IF NOT EXISTS hrs.block_sponsor (
    block_sponsor_id bigint NOT NULL,
    block_id bigint NOT NULL,
    sponsor_id character varying(128) NOT NULL,
    sponsor_name character varying(255),
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    first_name character varying(128) NOT NULL,
    last_name character varying(128) NOT NULL,
    designation character varying(128),
    licence_no character varying(128),
    email character varying(320),
    phone character varying(64)
);

CREATE SEQUENCE IF NOT EXISTS hrs.block_sponsor_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.block_sponsor_id_seq OWNED BY hrs.block_sponsor.block_sponsor_id;

CREATE TABLE IF NOT EXISTS hrs.block_submitter (
    block_submitter_id bigint NOT NULL,
    block_id bigint NOT NULL,
    submitter_id character varying(128) NOT NULL,
    submitter_name character varying(255),
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    first_name character varying(128) NOT NULL,
    last_name character varying(128) NOT NULL,
    designation character varying(128),
    licence_no character varying(128),
    email character varying(320),
    phone character varying(64)
);

CREATE SEQUENCE IF NOT EXISTS hrs.block_submitter_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.block_submitter_id_seq OWNED BY hrs.block_submitter.block_submitter_id;

ALTER TABLE ONLY hrs.block_attachment ALTER COLUMN block_attachment_id SET DEFAULT nextval('hrs.block_attachment_id_seq'::regclass);

ALTER TABLE ONLY hrs.block_calculation_snapshot ALTER COLUMN block_calculation_snapshot_id SET DEFAULT nextval('hrs.block_calculation_snapshot_id_seq'::regclass);

ALTER TABLE ONLY hrs.block_comment ALTER COLUMN block_comment_id SET DEFAULT nextval('hrs.block_comment_id_seq'::regclass);

ALTER TABLE ONLY hrs.block_requirement ALTER COLUMN block_requirement_id SET DEFAULT nextval('hrs.block_requirement_id_seq'::regclass);

ALTER TABLE ONLY hrs.block_sponsor ALTER COLUMN block_sponsor_id SET DEFAULT nextval('hrs.block_sponsor_id_seq'::regclass);

ALTER TABLE ONLY hrs.block_submitter ALTER COLUMN block_submitter_id SET DEFAULT nextval('hrs.block_submitter_id_seq'::regclass);

ALTER TABLE ONLY hrs.block_attachment
    DROP CONSTRAINT IF EXISTS block_attachment_pk CASCADE;
ALTER TABLE ONLY hrs.block_attachment
    ADD CONSTRAINT block_attachment_pk PRIMARY KEY (block_attachment_id);

ALTER TABLE ONLY hrs.block_calculation_snapshot
    DROP CONSTRAINT IF EXISTS block_calculation_snapshot_pk CASCADE;
ALTER TABLE ONLY hrs.block_calculation_snapshot
    ADD CONSTRAINT block_calculation_snapshot_pk PRIMARY KEY (block_calculation_snapshot_id);

ALTER TABLE ONLY hrs.block_comment
    DROP CONSTRAINT IF EXISTS block_comment_pk CASCADE;
ALTER TABLE ONLY hrs.block_comment
    ADD CONSTRAINT block_comment_pk PRIMARY KEY (block_comment_id);

ALTER TABLE ONLY hrs.block_requirement
    DROP CONSTRAINT IF EXISTS block_requirement_pk CASCADE;
ALTER TABLE ONLY hrs.block_requirement
    ADD CONSTRAINT block_requirement_pk PRIMARY KEY (block_requirement_id);

ALTER TABLE ONLY hrs.block_sponsor
    DROP CONSTRAINT IF EXISTS block_sponsor_pk CASCADE;
ALTER TABLE ONLY hrs.block_sponsor
    ADD CONSTRAINT block_sponsor_pk PRIMARY KEY (block_sponsor_id);

ALTER TABLE ONLY hrs.block_submitter
    DROP CONSTRAINT IF EXISTS block_submitter_pk CASCADE;
ALTER TABLE ONLY hrs.block_submitter
    ADD CONSTRAINT block_submitter_pk PRIMARY KEY (block_submitter_id);

CREATE INDEX IF NOT EXISTS idx_block_attachment_block_id ON hrs.block_attachment USING btree (block_id);

CREATE INDEX IF NOT EXISTS idx_block_calculation_snapshot_block_id ON hrs.block_calculation_snapshot USING btree (block_id, block_calculation_snapshot_id DESC);

CREATE INDEX IF NOT EXISTS idx_block_calculation_snapshot_district_volume_id ON hrs.block_calculation_snapshot USING btree (district_volume_id);

CREATE INDEX IF NOT EXISTS idx_block_comment_block_id ON hrs.block_comment USING btree (block_id);

CREATE INDEX IF NOT EXISTS idx_block_sponsor_block_id ON hrs.block_sponsor USING btree (block_id);

CREATE INDEX IF NOT EXISTS idx_block_submitter_block_id ON hrs.block_submitter USING btree (block_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_block_requirement_live ON hrs.block_requirement USING btree (block_id, requirement_code) WHERE (is_deleted = false);

ALTER TABLE ONLY hrs.block_attachment
    DROP CONSTRAINT IF EXISTS fk_block_attachment_block CASCADE;
ALTER TABLE ONLY hrs.block_attachment
    ADD CONSTRAINT fk_block_attachment_block FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE ONLY hrs.block_calculation_snapshot
    DROP CONSTRAINT IF EXISTS fk_block_calculation_snapshot_block CASCADE;
ALTER TABLE ONLY hrs.block_calculation_snapshot
    ADD CONSTRAINT fk_block_calculation_snapshot_block FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE ONLY hrs.block_calculation_snapshot
    DROP CONSTRAINT IF EXISTS fk_block_calculation_snapshot_district_volume CASCADE;
ALTER TABLE ONLY hrs.block_calculation_snapshot
    ADD CONSTRAINT fk_block_calculation_snapshot_district_volume FOREIGN KEY (district_volume_id) REFERENCES hrs.district_volume(district_volume_id);

ALTER TABLE ONLY hrs.block_comment
    DROP CONSTRAINT IF EXISTS fk_block_comment_block CASCADE;
ALTER TABLE ONLY hrs.block_comment
    ADD CONSTRAINT fk_block_comment_block FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE ONLY hrs.block_requirement
    DROP CONSTRAINT IF EXISTS fk_block_requirement_attachment CASCADE;
ALTER TABLE ONLY hrs.block_requirement
    ADD CONSTRAINT fk_block_requirement_attachment FOREIGN KEY (linked_attachment_id) REFERENCES hrs.block_attachment(block_attachment_id);

ALTER TABLE ONLY hrs.block_requirement
    DROP CONSTRAINT IF EXISTS fk_block_requirement_block CASCADE;
ALTER TABLE ONLY hrs.block_requirement
    ADD CONSTRAINT fk_block_requirement_block FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE ONLY hrs.block_sponsor
    DROP CONSTRAINT IF EXISTS fk_block_sponsor_block CASCADE;
ALTER TABLE ONLY hrs.block_sponsor
    ADD CONSTRAINT fk_block_sponsor_block FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE ONLY hrs.block_submitter
    DROP CONSTRAINT IF EXISTS fk_block_submitter_block CASCADE;
ALTER TABLE ONLY hrs.block_submitter
    ADD CONSTRAINT fk_block_submitter_block FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

-- ============================================================================
-- V1.1.2__status_event.sql — Issue #1215: shared append-only status_event
-- history.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hrs.status_event (
    status_event_id bigint NOT NULL,
    reporting_unit_id bigint,
    block_id bigint,
    status character varying(32) NOT NULL,
    event_type character varying(64) NOT NULL,
    details jsonb,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT status_event_subject_ck CHECK (((reporting_unit_id IS NOT NULL) <> (block_id IS NOT NULL)))
);

COMMENT ON TABLE hrs.status_event IS 'Append-only lifecycle events for reporting units and blocks.';

COMMENT ON COLUMN hrs.status_event.reporting_unit_id IS 'Foreign key referencing the target reporting unit, if applicable.';

COMMENT ON COLUMN hrs.status_event.block_id IS 'Foreign key referencing the target block, if applicable.';

COMMENT ON COLUMN hrs.status_event.status IS 'Lifecycle status, e.g. DRAFT or SUBMITTED.';

CREATE SEQUENCE IF NOT EXISTS hrs.status_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.status_event_id_seq OWNED BY hrs.status_event.status_event_id;

ALTER TABLE ONLY hrs.status_event ALTER COLUMN status_event_id SET DEFAULT nextval('hrs.status_event_id_seq'::regclass);

ALTER TABLE ONLY hrs.status_event
    DROP CONSTRAINT IF EXISTS status_event_pk CASCADE;
ALTER TABLE ONLY hrs.status_event
    ADD CONSTRAINT status_event_pk PRIMARY KEY (status_event_id);

CREATE INDEX IF NOT EXISTS idx_block_comment_status_event_id ON hrs.block_comment USING btree (status_event_id);

CREATE INDEX IF NOT EXISTS idx_status_event_block_time ON hrs.status_event USING btree (block_id, created_at DESC, status_event_id DESC) WHERE (block_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_status_event_reporting_unit_time ON hrs.status_event USING btree (reporting_unit_id, created_at DESC, status_event_id DESC) WHERE (reporting_unit_id IS NOT NULL);

ALTER TABLE ONLY hrs.block_comment
    DROP CONSTRAINT IF EXISTS fk_block_comment_status_event CASCADE;
ALTER TABLE ONLY hrs.block_comment
    ADD CONSTRAINT fk_block_comment_status_event FOREIGN KEY (status_event_id) REFERENCES hrs.status_event(status_event_id);

ALTER TABLE ONLY hrs.status_event
    DROP CONSTRAINT IF EXISTS fk_status_event_block CASCADE;
ALTER TABLE ONLY hrs.status_event
    ADD CONSTRAINT fk_status_event_block FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE ONLY hrs.status_event
    DROP CONSTRAINT IF EXISTS fk_status_event_reporting_unit CASCADE;
ALTER TABLE ONLY hrs.status_event
    ADD CONSTRAINT fk_status_event_reporting_unit FOREIGN KEY (reporting_unit_id) REFERENCES hrs.reporting_unit(reporting_unit_id);

-- ============================================================================
-- V1.1.3__submission_schema_completion.sql — Issue #1272: submission schema
-- completion (column additions folded into the table definitions above;
-- comments, FK and index carried here).
-- ============================================================================

COMMENT ON COLUMN hrs.block_area_segment.block_mark_id IS 'Optional foreign key referencing the associated block mark.';

COMMENT ON COLUMN hrs.block_area_segment.starting_area_ha IS 'Starting area for the segment in hectares.';

COMMENT ON COLUMN hrs.block_area_segment.net_waste_area_ha IS 'Calculated net waste area for the segment in hectares.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.calculated_at IS 'Timestamp at which the calculation was performed.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.rounding_policy IS 'Rounding policy applied during calculation.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.warnings IS 'JSON array of warnings generated during calculation.';

COMMENT ON COLUMN hrs.block_mark.forest_file_id IS 'Forest file identifier associated with the mark.';

COMMENT ON COLUMN hrs.block_mark.timber_mark IS 'Timber mark identifier.';

COMMENT ON COLUMN hrs.block_mark.cutting_permit_id IS 'Cutting permit identifier.';

COMMENT ON COLUMN hrs.block_mark.cut_block_id IS 'Cut block identifier.';

COMMENT ON COLUMN hrs.block_sponsor.first_name IS 'Sponsor first name, entered on the endorsement form (added V1.1.3). Distinct from sponsor_name, which is IDP-sourced.';

COMMENT ON COLUMN hrs.block_sponsor.last_name IS 'Sponsor last name, entered on the endorsement form (added V1.1.3). Distinct from sponsor_name, which is IDP-sourced.';

COMMENT ON COLUMN hrs.block_sponsor.designation IS 'Sponsor professional designation.';

COMMENT ON COLUMN hrs.block_sponsor.licence_no IS 'Professional forester licence number (RPF/RFT designation) — not a general business licence.';

COMMENT ON COLUMN hrs.block_sponsor.email IS 'Sponsor email address.';

COMMENT ON COLUMN hrs.block_sponsor.phone IS 'Sponsor telephone number.';

COMMENT ON COLUMN hrs.block_submitter.first_name IS 'Submitter first name, entered on the endorsement form (added V1.1.3). Distinct from submitter_name, which is IDP-sourced.';

COMMENT ON COLUMN hrs.block_submitter.last_name IS 'Submitter last name, entered on the endorsement form (added V1.1.3). Distinct from submitter_name, which is IDP-sourced.';

COMMENT ON COLUMN hrs.block_submitter.designation IS 'Submitter professional designation.';

COMMENT ON COLUMN hrs.block_submitter.licence_no IS 'Professional forester licence number (RPF/RFT designation) — not a general business licence.';

COMMENT ON COLUMN hrs.block_submitter.email IS 'Submitter email address.';

COMMENT ON COLUMN hrs.block_submitter.phone IS 'Submitter telephone number.';

COMMENT ON COLUMN hrs.district_average_block.coast_ground_based_area_ha IS 'Coast ground-based logging area in hectares.';

COMMENT ON COLUMN hrs.district_average_block.harvest_status_code IS 'Harvest status code supplied for the submission block.';

COMMENT ON COLUMN hrs.district_average_block.bec_zone IS 'Biogeoclimatic ecosystem classification zone for Interior blocks.';

COMMENT ON COLUMN hrs.district_average_block.bec_subvariant IS 'Biogeoclimatic ecosystem classification subvariant for Interior blocks.';

COMMENT ON COLUMN hrs.district_average_block.has_dispersed_retention IS 'Whether dispersed retention applies to the submission block.';

COMMENT ON COLUMN hrs.district_average_block.dispersed_retention_pct IS 'Dispersed retention percentage when dispersed retention applies.';

COMMENT ON COLUMN hrs.district_average_block.primary_logging_complete_date IS 'Date primary logging was completed.';

COMMENT ON COLUMN hrs.district_average_block.cable_yarding_area_ha IS 'Area harvested using cable yarding in hectares.';

COMMENT ON COLUMN hrs.district_average_block.skyline_logging_area_ha IS 'Area harvested using skyline logging in hectares.';

CREATE INDEX IF NOT EXISTS idx_block_area_segment_block_mark_id ON hrs.block_area_segment USING btree (block_mark_id);

CREATE INDEX IF NOT EXISTS idx_block_calculation_snapshot_latest ON hrs.block_calculation_snapshot USING btree (block_id, calculated_at DESC NULLS LAST, block_calculation_snapshot_id DESC);

ALTER TABLE ONLY hrs.block_area_segment
    DROP CONSTRAINT IF EXISTS fk_block_area_segment_block_mark CASCADE;
ALTER TABLE ONLY hrs.block_area_segment
    ADD CONSTRAINT fk_block_area_segment_block_mark FOREIGN KEY (block_mark_id) REFERENCES hrs.block_mark(block_mark_id);

-- ============================================================================
-- V1.1.4__reliability_infrastructure.sql — Issue #1216: transactional
-- outbox and request idempotency (outbox_event, idempotency_record).
-- ============================================================================

CREATE TABLE IF NOT EXISTS hrs.idempotency_record (
    idempotency_record_id bigint NOT NULL,
    idempotency_key character varying(256) NOT NULL,
    request_fingerprint character varying(128) NOT NULL,
    status character varying(32) DEFAULT 'IN_PROGRESS'::character varying NOT NULL,
    response_status integer,
    response_snapshot jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying(128) NOT NULL,
    CONSTRAINT idempotency_record_status_ck CHECK (status IN ('IN_PROGRESS', 'COMPLETED'))
);

COMMENT ON TABLE hrs.idempotency_record IS 'Request fingerprints and completed responses used to make retried commands idempotent.';

COMMENT ON COLUMN hrs.idempotency_record.request_fingerprint IS 'Digest of request payload and route.';

COMMENT ON COLUMN hrs.idempotency_record.status IS 'Processing status: IN_PROGRESS or COMPLETED.';

COMMENT ON COLUMN hrs.idempotency_record.response_status IS 'HTTP status code captured from completed response.';

COMMENT ON COLUMN hrs.idempotency_record.response_snapshot IS 'JSONB snapshot of response returned on retry.';

CREATE SEQUENCE IF NOT EXISTS hrs.idempotency_record_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.idempotency_record_id_seq OWNED BY hrs.idempotency_record.idempotency_record_id;

CREATE TABLE IF NOT EXISTS hrs.outbox_event (
    outbox_event_id bigint NOT NULL,
    event_id uuid NOT NULL,
    aggregate_type character varying(64) NOT NULL,
    aggregate_id bigint NOT NULL,
    event_type character varying(128) NOT NULL,
    payload jsonb NOT NULL,
    status character varying(32) DEFAULT 'PENDING'::character varying NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    attempt_history jsonb DEFAULT '[]'::jsonb NOT NULL,
    next_retry_at timestamp with time zone DEFAULT now() NOT NULL,
    locked_until timestamp with time zone,
    locked_by character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying(128) NOT NULL,
    CONSTRAINT outbox_event_attempt_count_ck CHECK ((attempt_count >= 0)),
    CONSTRAINT outbox_event_status_ck CHECK (status IN ('PENDING', 'IN_FLIGHT', 'RETRYING', 'CONFIRMED', 'RECONCILIATION_REQUIRED', 'PERMANENT_FAILURE'))
);

COMMENT ON TABLE hrs.outbox_event IS 'Transactional outbox events pending reliable delivery and reconciliation.';

COMMENT ON COLUMN hrs.outbox_event.event_id IS 'Stable UUID identifying this event across delivery attempts.';

COMMENT ON COLUMN hrs.outbox_event.status IS 'Delivery state: PENDING, IN_FLIGHT, RETRYING, CONFIRMED, etc.';

COMMENT ON COLUMN hrs.outbox_event.attempt_history IS 'JSON array of delivery attempts with outcome timestamps.';

COMMENT ON COLUMN hrs.outbox_event.next_retry_at IS 'Earliest timestamp for next delivery retry.';

COMMENT ON COLUMN hrs.outbox_event.locked_until IS 'Lease expiration timestamp for in-flight processing.';

COMMENT ON COLUMN hrs.outbox_event.locked_by IS 'Worker node identifier holding the lease.';

CREATE SEQUENCE IF NOT EXISTS hrs.outbox_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.outbox_event_id_seq OWNED BY hrs.outbox_event.outbox_event_id;

ALTER TABLE ONLY hrs.idempotency_record ALTER COLUMN idempotency_record_id SET DEFAULT nextval('hrs.idempotency_record_id_seq'::regclass);

ALTER TABLE ONLY hrs.outbox_event ALTER COLUMN outbox_event_id SET DEFAULT nextval('hrs.outbox_event_id_seq'::regclass);

ALTER TABLE ONLY hrs.idempotency_record
    DROP CONSTRAINT IF EXISTS idempotency_record_key_uq CASCADE;
ALTER TABLE ONLY hrs.idempotency_record
    ADD CONSTRAINT idempotency_record_key_uq UNIQUE (idempotency_key);

ALTER TABLE ONLY hrs.idempotency_record
    DROP CONSTRAINT IF EXISTS idempotency_record_pk CASCADE;
ALTER TABLE ONLY hrs.idempotency_record
    ADD CONSTRAINT idempotency_record_pk PRIMARY KEY (idempotency_record_id);

ALTER TABLE ONLY hrs.outbox_event
    DROP CONSTRAINT IF EXISTS outbox_event_event_uq CASCADE;
ALTER TABLE ONLY hrs.outbox_event
    ADD CONSTRAINT outbox_event_event_uq UNIQUE (event_id);

ALTER TABLE ONLY hrs.outbox_event
    DROP CONSTRAINT IF EXISTS outbox_event_pk CASCADE;
ALTER TABLE ONLY hrs.outbox_event
    ADD CONSTRAINT outbox_event_pk PRIMARY KEY (outbox_event_id);

CREATE INDEX IF NOT EXISTS idx_outbox_actionable ON hrs.outbox_event USING btree (next_retry_at) WHERE status IN ('PENDING', 'RETRYING');

CREATE INDEX IF NOT EXISTS idx_outbox_lease ON hrs.outbox_event USING btree (locked_until) WHERE (locked_until IS NOT NULL);

-- ============================================================================
-- V1.1.5__formula_config_and_lifecycle_settings.sql — Issue #1216:
-- lifecycle timers (lifecycle_setting + seed rows).
-- hrs.district_volume_formula is NOT part of this baseline — superseded by
-- formula_set and removed by #1364 (see V1.1.11).
-- ============================================================================

CREATE TABLE IF NOT EXISTS hrs.lifecycle_setting (
    lifecycle_setting_id bigint NOT NULL,
    setting_key character varying(128) NOT NULL,
    setting_value character varying(256) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying(128) NOT NULL
);

COMMENT ON TABLE hrs.lifecycle_setting IS 'Configurable lifecycle timing values stored as key/value settings.';

CREATE SEQUENCE IF NOT EXISTS hrs.lifecycle_setting_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.lifecycle_setting_id_seq OWNED BY hrs.lifecycle_setting.lifecycle_setting_id;

ALTER TABLE ONLY hrs.lifecycle_setting ALTER COLUMN lifecycle_setting_id SET DEFAULT nextval('hrs.lifecycle_setting_id_seq'::regclass);

ALTER TABLE ONLY hrs.lifecycle_setting
    DROP CONSTRAINT IF EXISTS lifecycle_setting_key_uq CASCADE;
ALTER TABLE ONLY hrs.lifecycle_setting
    ADD CONSTRAINT lifecycle_setting_key_uq UNIQUE (setting_key);

ALTER TABLE ONLY hrs.lifecycle_setting
    DROP CONSTRAINT IF EXISTS lifecycle_setting_pk CASCADE;
ALTER TABLE ONLY hrs.lifecycle_setting
    ADD CONSTRAINT lifecycle_setting_pk PRIMARY KEY (lifecycle_setting_id);


-- Seed rows (V1.1.5): configurable lifecycle timing values.
INSERT INTO hrs.lifecycle_setting (
    setting_key, setting_value, created_by, updated_by
)
VALUES
    ('AUTO_APPROVE_MONTHS', '12', current_user, current_user),
    ('BILLING_DELAY_MONTHS', '1', current_user, current_user)
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================================
-- V1.1.6__shared_audit_trigger.sql — Issue #1216: generic
-- audit_row_change() trigger function. Body is the final V1.1.8 (#1300)
-- definition; trigger bindings for the V1.1 tables are carried in the
-- V1.1.8 section.
-- ============================================================================

CREATE OR REPLACE FUNCTION hrs.audit_row_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'hrs'
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

COMMENT ON FUNCTION hrs.audit_row_change() IS 'Writes one generic full-row audit event/change pair per row mutation. Entity type is the table name; soft deletion is identified from is_deleted=false to is_deleted=true.';

DROP TRIGGER IF EXISTS trg_block_area_segment_shared_audit ON hrs.block_area_segment;
CREATE TRIGGER trg_block_area_segment_shared_audit AFTER INSERT OR DELETE OR UPDATE ON hrs.block_area_segment FOR EACH ROW EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_block_attachment_shared_audit ON hrs.block_attachment;
CREATE TRIGGER trg_block_attachment_shared_audit AFTER INSERT OR DELETE OR UPDATE ON hrs.block_attachment FOR EACH ROW EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_block_calculation_snapshot_shared_audit ON hrs.block_calculation_snapshot;
CREATE TRIGGER trg_block_calculation_snapshot_shared_audit AFTER INSERT OR DELETE OR UPDATE ON hrs.block_calculation_snapshot FOR EACH ROW EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_block_comment_shared_audit ON hrs.block_comment;
CREATE TRIGGER trg_block_comment_shared_audit AFTER INSERT OR DELETE OR UPDATE ON hrs.block_comment FOR EACH ROW EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_block_mark_shared_audit ON hrs.block_mark;
CREATE TRIGGER trg_block_mark_shared_audit AFTER INSERT OR DELETE OR UPDATE ON hrs.block_mark FOR EACH ROW EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_block_requirement_shared_audit ON hrs.block_requirement;
CREATE TRIGGER trg_block_requirement_shared_audit AFTER INSERT OR DELETE OR UPDATE ON hrs.block_requirement FOR EACH ROW EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_block_shared_audit ON hrs.block;
CREATE TRIGGER trg_block_shared_audit AFTER INSERT OR DELETE OR UPDATE ON hrs.block FOR EACH ROW EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_block_sponsor_shared_audit ON hrs.block_sponsor;
CREATE TRIGGER trg_block_sponsor_shared_audit AFTER INSERT OR DELETE OR UPDATE ON hrs.block_sponsor FOR EACH ROW EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_block_submitter_shared_audit ON hrs.block_submitter;
CREATE TRIGGER trg_block_submitter_shared_audit AFTER INSERT OR DELETE OR UPDATE ON hrs.block_submitter FOR EACH ROW EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_district_average_block_shared_audit ON hrs.district_average_block;
CREATE TRIGGER trg_district_average_block_shared_audit AFTER INSERT OR DELETE OR UPDATE ON hrs.district_average_block FOR EACH ROW EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_idempotency_record_shared_audit ON hrs.idempotency_record;
CREATE TRIGGER trg_idempotency_record_shared_audit AFTER INSERT OR DELETE OR UPDATE ON hrs.idempotency_record FOR EACH ROW EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_lifecycle_setting_shared_audit ON hrs.lifecycle_setting;
CREATE TRIGGER trg_lifecycle_setting_shared_audit AFTER INSERT OR DELETE OR UPDATE ON hrs.lifecycle_setting FOR EACH ROW EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_outbox_event_shared_audit ON hrs.outbox_event;
CREATE TRIGGER trg_outbox_event_shared_audit AFTER INSERT OR DELETE OR UPDATE ON hrs.outbox_event FOR EACH ROW EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_reporting_unit_shared_audit ON hrs.reporting_unit;
CREATE TRIGGER trg_reporting_unit_shared_audit AFTER INSERT OR DELETE OR UPDATE ON hrs.reporting_unit FOR EACH ROW EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_status_event_shared_audit ON hrs.status_event;
CREATE TRIGGER trg_status_event_shared_audit AFTER INSERT OR DELETE OR UPDATE ON hrs.status_event FOR EACH ROW EXECUTE FUNCTION hrs.audit_row_change();

-- ============================================================================
-- V1.1.7__independent_formula_sets.sql — independent formula configuration
-- (formula_set, formula_set_row). The formula_set_row.declared_variables
-- and validation_errors columns are excluded per #1364 (see V1.1.11).
-- ============================================================================

CREATE TABLE IF NOT EXISTS hrs.formula_set (
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

CREATE SEQUENCE IF NOT EXISTS hrs.formula_set_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.formula_set_id_seq OWNED BY hrs.formula_set.formula_set_id;

CREATE TABLE IF NOT EXISTS hrs.formula_set_row (
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

CREATE SEQUENCE IF NOT EXISTS hrs.formula_set_row_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.formula_set_row_id_seq OWNED BY hrs.formula_set_row.formula_set_row_id;

ALTER TABLE ONLY hrs.formula_set ALTER COLUMN formula_set_id SET DEFAULT nextval('hrs.formula_set_id_seq'::regclass);

ALTER TABLE ONLY hrs.formula_set_row ALTER COLUMN formula_set_row_id SET DEFAULT nextval('hrs.formula_set_row_id_seq'::regclass);

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

CREATE INDEX IF NOT EXISTS formula_set_effective_ix ON hrs.formula_set USING btree (area, start_date, end_date) WHERE (is_deleted = false);

CREATE INDEX IF NOT EXISTS formula_set_row_set_ix ON hrs.formula_set_row USING btree (formula_set_id, sort_order, formula_set_row_id);

DROP TRIGGER IF EXISTS trg_formula_set_row_shared_audit ON hrs.formula_set_row;
CREATE TRIGGER trg_formula_set_row_shared_audit AFTER INSERT OR DELETE OR UPDATE ON hrs.formula_set_row FOR EACH ROW EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_formula_set_shared_audit ON hrs.formula_set;
CREATE TRIGGER trg_formula_set_shared_audit AFTER INSERT OR DELETE OR UPDATE ON hrs.formula_set FOR EACH ROW EXECUTE FUNCTION hrs.audit_row_change();

-- ============================================================================
-- V1.1.8__da_schema_standards.sql — Issue #1300: DA schema standards
-- (renamed PK/unique constraints, recreated indexes, final shared audit-
-- trigger bindings).
-- ============================================================================

COMMENT ON COLUMN hrs.audit_change.audit_change_id IS 'Unique identifier for the individual row audit record.';

COMMENT ON COLUMN hrs.audit_change.event_id IS 'Foreign key referencing the owning audit event.';

COMMENT ON COLUMN hrs.audit_change.entity_type IS 'Target database table name.';

COMMENT ON COLUMN hrs.audit_change.entity_id IS 'Primary key value of the mutated row.';

COMMENT ON COLUMN hrs.audit_change.action IS 'Mutation action: CREATE, UPDATE, SOFT_DELETE, DELETE.';

COMMENT ON COLUMN hrs.audit_change.changed_columns IS 'Array of column names that changed.';

COMMENT ON COLUMN hrs.audit_event.audit_event_id IS 'Unique identifier for the audit event.';

COMMENT ON COLUMN hrs.audit_event.changed_by IS 'Actor identity responsible for the change.';

COMMENT ON COLUMN hrs.audit_event.changed_at IS 'Timestamp when the mutation took place.';

COMMENT ON COLUMN hrs.audit_event.reason IS 'Optional rationale provided for the change.';

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

COMMENT ON COLUMN hrs.block_area_segment.block_area_segment_id IS 'Unique identifier for the area segment.';

COMMENT ON COLUMN hrs.block_area_segment.block_id IS 'Foreign key referencing the parent block.';

COMMENT ON COLUMN hrs.block_area_segment.source IS 'Segment derivation source: e.g. MANUAL or FTA.';

COMMENT ON COLUMN hrs.block_area_segment.area_ha IS 'Segment area in hectares.';

COMMENT ON COLUMN hrs.block_area_segment.road_length_m IS 'Road length in meters.';

COMMENT ON COLUMN hrs.block_area_segment.road_width_m IS 'Road width in meters.';

COMMENT ON COLUMN hrs.block_area_segment.created_by IS 'Audit actor that created this segment.';

COMMENT ON COLUMN hrs.block_area_segment.updated_by IS 'Audit actor that last updated this segment.';

COMMENT ON COLUMN hrs.block_area_segment.created_at IS 'Timestamp when this segment was created.';

COMMENT ON COLUMN hrs.block_area_segment.updated_at IS 'Timestamp when this segment was last updated.';

COMMENT ON COLUMN hrs.block_area_segment.is_deleted IS 'Soft-delete flag.';

COMMENT ON COLUMN hrs.block_attachment.block_attachment_id IS 'Unique identifier for the attachment record.';

COMMENT ON COLUMN hrs.block_attachment.block_id IS 'Foreign key referencing the parent block.';

COMMENT ON COLUMN hrs.block_attachment.object_key IS 'Object storage S3 key for the uploaded file.';

COMMENT ON COLUMN hrs.block_attachment.file_name IS 'Original file name.';

COMMENT ON COLUMN hrs.block_attachment.content_type IS 'MIME media type of the attachment.';

COMMENT ON COLUMN hrs.block_attachment.file_size_bytes IS 'Attachment size in bytes.';

COMMENT ON COLUMN hrs.block_attachment.scan_status IS 'Malware scan status: PENDING while awaiting verdict, CLEAN if safe, QUARANTINED if malicious/suspicious, FAILED if scanning errored.';

COMMENT ON COLUMN hrs.block_attachment.created_by IS 'Audit actor that uploaded the attachment.';

COMMENT ON COLUMN hrs.block_attachment.updated_by IS 'Audit actor that last updated the attachment metadata.';

COMMENT ON COLUMN hrs.block_attachment.created_at IS 'Timestamp when the attachment was created.';

COMMENT ON COLUMN hrs.block_attachment.updated_at IS 'Timestamp when the attachment was last updated.';

COMMENT ON COLUMN hrs.block_attachment.is_deleted IS 'Soft-delete flag.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.block_calculation_snapshot_id IS 'Unique identifier for the calculation snapshot.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.block_id IS 'Foreign key referencing the parent block.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.district_volume_id IS 'Foreign key referencing the district volume configuration version.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.hbs_window_start IS 'Harvest Billing System window start date.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.hbs_window_end IS 'Harvest Billing System window end date.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.inputs IS 'JSON snapshot of calculation input parameters.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.outputs IS 'JSON snapshot of calculation output results.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.created_by IS 'Audit actor that produced the snapshot.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.updated_by IS 'Audit actor that last updated the snapshot record.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.created_at IS 'Timestamp when the snapshot was recorded.';

COMMENT ON COLUMN hrs.block_calculation_snapshot.updated_at IS 'Timestamp when the snapshot was last updated.';

COMMENT ON COLUMN hrs.block_comment.block_comment_id IS 'Unique identifier for the comment.';

COMMENT ON COLUMN hrs.block_comment.block_id IS 'Foreign key referencing the parent block.';

COMMENT ON COLUMN hrs.block_comment.context IS 'Comment type: GENERAL (standalone block comment), SUBMISSION (endorsement-tab comment), or accompanies a lifecycle transition when status_event_id is populated.';

COMMENT ON COLUMN hrs.block_comment.comment IS 'Body text of the comment (max 4000 chars).';

COMMENT ON COLUMN hrs.block_comment.status_event_id IS 'Optional foreign key referencing the triggering status event.';

COMMENT ON COLUMN hrs.block_comment.created_by IS 'Audit actor that created this comment.';

COMMENT ON COLUMN hrs.block_comment.updated_by IS 'Audit actor that last updated this comment.';

COMMENT ON COLUMN hrs.block_comment.created_at IS 'Timestamp when this comment was created.';

COMMENT ON COLUMN hrs.block_comment.updated_at IS 'Timestamp when this comment was last updated.';

COMMENT ON COLUMN hrs.block_comment.is_deleted IS 'Soft-delete flag.';

COMMENT ON COLUMN hrs.block_mark.block_mark_id IS 'Unique identifier for the block mark.';

COMMENT ON COLUMN hrs.block_mark.block_id IS 'Foreign key referencing the parent block.';

COMMENT ON COLUMN hrs.block_mark.mark_type IS 'Mark type: PRIMARY or SECONDARY.';

COMMENT ON COLUMN hrs.block_mark.sequence_no IS 'Sequential order number for secondary marks.';

COMMENT ON COLUMN hrs.block_mark.mark IS 'Timber mark or identifier string.';

COMMENT ON COLUMN hrs.block_mark.validation_status IS 'External mark validation state.';

COMMENT ON COLUMN hrs.block_mark.created_by IS 'Audit actor that created this mark.';

COMMENT ON COLUMN hrs.block_mark.updated_by IS 'Audit actor that last updated this mark.';

COMMENT ON COLUMN hrs.block_mark.created_at IS 'Timestamp when this mark was created.';

COMMENT ON COLUMN hrs.block_mark.updated_at IS 'Timestamp when this mark was last updated.';

COMMENT ON COLUMN hrs.block_mark.is_deleted IS 'Soft-delete flag.';

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

COMMENT ON TABLE hrs.block_sponsor IS 'Sponsor endorsement details for a block.';

COMMENT ON COLUMN hrs.block_sponsor.block_sponsor_id IS 'Unique identifier for the sponsor endorsement record.';

COMMENT ON COLUMN hrs.block_sponsor.block_id IS 'Foreign key referencing the parent block.';

COMMENT ON COLUMN hrs.block_sponsor.sponsor_id IS 'Business identifier of the sponsor.';

COMMENT ON COLUMN hrs.block_sponsor.sponsor_name IS 'Read-only display name from the identity provider (BCeID/IDIR), captured at submission time.';

COMMENT ON COLUMN hrs.block_sponsor.created_by IS 'Audit actor that created this sponsor record.';

COMMENT ON COLUMN hrs.block_sponsor.updated_by IS 'Audit actor that last updated this sponsor record.';

COMMENT ON COLUMN hrs.block_sponsor.created_at IS 'Timestamp when this sponsor record was created.';

COMMENT ON COLUMN hrs.block_sponsor.updated_at IS 'Timestamp when this sponsor record was last updated.';

COMMENT ON COLUMN hrs.block_sponsor.is_deleted IS 'Soft-delete flag.';

COMMENT ON TABLE hrs.block_submitter IS 'Submitter endorsement details for a block.';

COMMENT ON COLUMN hrs.block_submitter.block_submitter_id IS 'Unique identifier for the submitter endorsement record.';

COMMENT ON COLUMN hrs.block_submitter.block_id IS 'Foreign key referencing the parent block.';

COMMENT ON COLUMN hrs.block_submitter.submitter_id IS 'Business identifier of the submitter.';

COMMENT ON COLUMN hrs.block_submitter.submitter_name IS 'Read-only display name from the identity provider (BCeID/IDIR), captured at submission time.';

COMMENT ON COLUMN hrs.block_submitter.created_by IS 'Audit actor that created this submitter record.';

COMMENT ON COLUMN hrs.block_submitter.updated_by IS 'Audit actor that last updated this submitter record.';

COMMENT ON COLUMN hrs.block_submitter.created_at IS 'Timestamp when this submitter record was created.';

COMMENT ON COLUMN hrs.block_submitter.updated_at IS 'Timestamp when this submitter record was last updated.';

COMMENT ON COLUMN hrs.block_submitter.is_deleted IS 'Soft-delete flag.';

COMMENT ON COLUMN hrs.district_average_block.district_average_block_id IS 'Primary key and foreign key referencing the parent block.';

COMMENT ON COLUMN hrs.district_average_block.benchmark_zone IS 'Benchmark pricing zone.';

COMMENT ON COLUMN hrs.district_average_block.maturity IS 'Timber maturity: MATURE or IMMATURE.';

COMMENT ON COLUMN hrs.district_average_block.retention_percentage IS 'Stand retention percentage.';

COMMENT ON COLUMN hrs.district_average_block.criteria IS 'Integer array of applicable District Average qualifying criteria.';

COMMENT ON COLUMN hrs.district_average_block.coast_helicopter_area_ha IS 'Coast helicopter logging area in hectares.';

COMMENT ON COLUMN hrs.district_average_block.revision IS 'Optimistic locking revision counter.';

COMMENT ON COLUMN hrs.district_average_block.created_by IS 'Audit actor that created this DA extension.';

COMMENT ON COLUMN hrs.district_average_block.updated_by IS 'Audit actor that last updated this DA extension.';

COMMENT ON COLUMN hrs.district_average_block.created_at IS 'Timestamp when this DA extension was created.';

COMMENT ON COLUMN hrs.district_average_block.updated_at IS 'Timestamp when this DA extension was last updated.';

COMMENT ON COLUMN hrs.district_average_block.is_deleted IS 'Soft-delete flag.';

COMMENT ON COLUMN hrs.district_average_block.is_heli_logging IS 'Whether helicopter logging applies to the submission block.';

COMMENT ON COLUMN hrs.district_volume.district_volume_id IS 'Unique identifier for the district volume configuration record.';

COMMENT ON COLUMN hrs.district_volume.config_type IS 'Configuration type: DISTRICT_VOLUME or SPECIES_COMPOSITION.';

COMMENT ON COLUMN hrs.district_volume.is_deleted IS 'Soft-delete flag; active queries must filter is_deleted = FALSE.';

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

COMMENT ON COLUMN hrs.idempotency_record.idempotency_record_id IS 'Unique identifier for the idempotency record.';

COMMENT ON COLUMN hrs.idempotency_record.idempotency_key IS 'Unique idempotency key supplied by the client.';

COMMENT ON COLUMN hrs.idempotency_record.created_at IS 'Timestamp when the request was first accepted.';

COMMENT ON COLUMN hrs.idempotency_record.created_by IS 'Actor that initiated the request.';

COMMENT ON COLUMN hrs.idempotency_record.updated_at IS 'Timestamp when the idempotency record was last updated.';

COMMENT ON COLUMN hrs.idempotency_record.updated_by IS 'Actor that last updated the idempotency record.';

COMMENT ON COLUMN hrs.lifecycle_setting.lifecycle_setting_id IS 'Unique identifier for the lifecycle setting.';

COMMENT ON COLUMN hrs.lifecycle_setting.setting_key IS 'Unique setting key identifier.';

COMMENT ON COLUMN hrs.lifecycle_setting.setting_value IS 'Setting value string.';

COMMENT ON COLUMN hrs.lifecycle_setting.created_at IS 'Timestamp when the setting was created.';

COMMENT ON COLUMN hrs.lifecycle_setting.created_by IS 'Actor that created the setting.';

COMMENT ON COLUMN hrs.lifecycle_setting.updated_at IS 'Timestamp when the setting was last modified.';

COMMENT ON COLUMN hrs.lifecycle_setting.updated_by IS 'Actor that last modified the setting.';

COMMENT ON COLUMN hrs.outbox_event.outbox_event_id IS 'Unique identifier for the outbox event record.';

COMMENT ON COLUMN hrs.outbox_event.aggregate_type IS 'Domain aggregate type, e.g. SUBMISSION.';

COMMENT ON COLUMN hrs.outbox_event.aggregate_id IS 'Identifier of the owning aggregate.';

COMMENT ON COLUMN hrs.outbox_event.event_type IS 'Domain event type name.';

COMMENT ON COLUMN hrs.outbox_event.payload IS 'Serialized event payload as JSONB.';

COMMENT ON COLUMN hrs.outbox_event.attempt_count IS 'Number of transmission attempts performed.';

COMMENT ON COLUMN hrs.outbox_event.created_at IS 'Timestamp when the event was enqueued.';

COMMENT ON COLUMN hrs.outbox_event.created_by IS 'Actor that enqueued the outbox event.';

COMMENT ON COLUMN hrs.outbox_event.updated_at IS 'Timestamp when the outbox record was last modified.';

COMMENT ON COLUMN hrs.outbox_event.updated_by IS 'Actor that last updated the outbox event.';

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

COMMENT ON COLUMN hrs.status_event.status_event_id IS 'Unique identifier for the status event.';

COMMENT ON COLUMN hrs.status_event.event_type IS 'Action event type, e.g. SUBMISSION_CREATED.';

COMMENT ON COLUMN hrs.status_event.details IS 'JSON payload containing event metadata.';

COMMENT ON COLUMN hrs.status_event.created_by IS 'Audit actor that generated the event.';

COMMENT ON COLUMN hrs.status_event.updated_by IS 'Audit actor that last updated the event record.';

COMMENT ON COLUMN hrs.status_event.created_at IS 'Timestamp when the status event was created.';

COMMENT ON COLUMN hrs.status_event.updated_at IS 'Timestamp when the status event was last updated.';

ALTER TABLE ONLY hrs.audit_change
    DROP CONSTRAINT IF EXISTS fk_audit_change_event CASCADE;
ALTER TABLE ONLY hrs.audit_change
    ADD CONSTRAINT fk_audit_change_event FOREIGN KEY (event_id) REFERENCES hrs.audit_event(audit_event_id);

ALTER TABLE ONLY hrs.formula_set_row
    DROP CONSTRAINT IF EXISTS fk_formula_set_row_formula_set CASCADE;
ALTER TABLE ONLY hrs.formula_set_row
    ADD CONSTRAINT fk_formula_set_row_formula_set FOREIGN KEY (formula_set_id) REFERENCES hrs.formula_set(formula_set_id);

-- ============================================================================
-- V1.1.9__block_attachment_upload_lifecycle.sql — Issue #1225:
-- block_attachment upload lifecycle (columns and CHECK constraints folded
-- into the block_attachment definition in the V1.1.1 section; column
-- comments carried here).
-- ============================================================================

COMMENT ON COLUMN hrs.block_attachment.document_type IS 'Evidence document category: FINAL_MAP, POST_HARVEST_CERTIFICATE, RATIONALE, ENDORSEMENT_LETTER, CALCULATOR_SPREADSHEET, HBS_BILLING_REPORT, REDUCTION_FACTOR_SUPPORT or OTHER.';

COMMENT ON COLUMN hrs.block_attachment.status IS 'Upload lifecycle state: UPLOADING while the client is expected to upload, FINALIZED once the object has been verified and accepted.';

COMMENT ON COLUMN hrs.block_attachment.checksum IS 'Object-store ETag/checksum captured at finalize; a later finalize attempt whose object ETag differs is rejected with a conflict.';

-- ============================================================================
-- V1.1.10__block_attachment_scan_status_and_cleanup.sql — Issue #1226:
-- attachment scan status (column default, NOT NULL and CHECK folded into
-- the block_attachment definition in the V1.1.1 section; cleanup index
-- carried here).
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_block_attachment_uploading_cleanup ON hrs.block_attachment USING btree (created_at) WHERE (((status)::text = 'UPLOADING'::text) AND (is_deleted = false));
