-- ============================================================================
-- V1.1.1__audit_and_soft_delete.sql — Issue #1191: database-trigger audit
-- framework (audit_event, audit_change with sequences and lookup indexes,
-- audit_district_volume_change() and the district_volume audit trigger),
-- plus supporting district_volume config indexes. Function body and column
-- documentation are the final V1.1.8 definitions (#1300).
-- ============================================================================
CREATE TABLE IF NOT EXISTS hrs.audit_change(
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

CREATE SEQUENCE IF NOT EXISTS hrs.audit_change_id_seq START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.audit_change_id_seq OWNED BY hrs.audit_change.audit_change_id;

CREATE TABLE IF NOT EXISTS hrs.audit_event(
    audit_event_id bigint NOT NULL,
    action character varying(32) NOT NULL,
    changed_by character varying(128) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    reason character varying(500),
    correlation_id character varying(128)
    );

COMMENT ON TABLE hrs.audit_event IS 'Immutable audit event grouping one temporal mutation operation.';

COMMENT ON COLUMN hrs.audit_event.action IS 'Mutation operation type: CREATE, UPDATE, SOFT_DELETE, DELETE.';

CREATE SEQUENCE IF NOT EXISTS hrs.audit_event_id_seq START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.audit_event_id_seq OWNED BY hrs.audit_event.audit_event_id;

ALTER TABLE ONLY hrs.audit_change
    ALTER COLUMN audit_change_id SET DEFAULT nextval('hrs.audit_change_id_seq'::regclass);

ALTER TABLE ONLY hrs.audit_event
    ALTER COLUMN audit_event_id SET DEFAULT nextval('hrs.audit_event_id_seq'::regclass);

ALTER TABLE ONLY hrs.audit_change
    DROP CONSTRAINT IF EXISTS audit_change_pkey CASCADE;

ALTER TABLE ONLY hrs.audit_change
    ADD CONSTRAINT audit_change_pkey PRIMARY KEY (audit_change_id);

ALTER TABLE ONLY hrs.audit_event
    DROP CONSTRAINT IF EXISTS audit_event_pkey CASCADE;

ALTER TABLE ONLY hrs.audit_event
    ADD CONSTRAINT audit_event_pkey PRIMARY KEY (audit_event_id);

CREATE INDEX IF NOT EXISTS idx_audit_change_entity_lookup ON hrs.audit_change USING btree(entity_type, entity_id, audit_change_id DESC);

CREATE INDEX IF NOT EXISTS idx_audit_change_entity_type_id ON hrs.audit_change USING btree(entity_type, audit_change_id DESC);

CREATE INDEX IF NOT EXISTS idx_audit_change_event_id ON hrs.audit_change USING btree(event_id);

CREATE INDEX IF NOT EXISTS idx_audit_event_changed_by_time ON hrs.audit_event USING btree(changed_by, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_district_volume_config_type_area_start ON hrs.district_volume USING btree(config_type, area, start_date);

CREATE INDEX IF NOT EXISTS idx_district_volume_live_config_area_start ON hrs.district_volume USING btree(config_type, area, start_date)
    WHERE (is_deleted = false);

CREATE OR REPLACE FUNCTION hrs.audit_district_volume_change()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
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
    old_row := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN
        to_jsonb(OLD)
    END;
    new_row := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN
        to_jsonb(NEW)
    END;
    old_image := old_row;
    new_image := new_row;
    row_id := COALESCE((new_image ->> 'district_volume_id')::BIGINT,(old_image ->> 'district_volume_id')::BIGINT,(new_image ->> 'id')::BIGINT,(old_image ->> 'id')::BIGINT);
    entity_kind := CASE WHEN COALESCE(new_image ->> 'config_type', old_image ->> 'config_type') = 'SPECIES_COMPOSITION' THEN
        'SPECIES_COMPOSITION'
    ELSE
        'DISTRICT_VOLUME'
    END;
    actor := COALESCE(NULLIF(
            CASE WHEN TG_OP = 'INSERT' THEN
                new_image ->> 'created_by'
            WHEN TG_OP = 'DELETE' THEN
                old_image ->> 'updated_by'
            ELSE
                new_image ->> 'updated_by'
            END, ''), NULLIF(
            CASE WHEN TG_OP = 'DELETE' THEN
                old_image ->> 'created_by'
            ELSE
                new_image ->> 'created_by'
            END, ''), session_user);
    corr_id := NULLIF(current_setting('app.correlation_id', true), '');
    operation := CASE WHEN TG_OP = 'INSERT' THEN
        'CREATE'
    WHEN TG_OP = 'DELETE' THEN
        'DELETE'
    WHEN (COALESCE(old_image ->> 'is_deleted', old_image ->> 'deleted', 'false') = 'false'
        AND COALESCE(new_image ->> 'is_deleted', new_image ->> 'deleted', 'false') = 'true') THEN
        'SOFT_DELETE'
    ELSE
        'UPDATE'
    END;
    changed := CASE WHEN TG_OP = 'INSERT' THEN
        ARRAY (
            SELECT
                jsonb_object_keys(new_image)
            ORDER BY
                1)
    WHEN TG_OP = 'DELETE' THEN
        ARRAY (
            SELECT
                jsonb_object_keys(old_image)
            ORDER BY
                1)
    ELSE
        ARRAY (
            SELECT
                key
            FROM (
                SELECT
                    jsonb_object_keys(old_image || new_image) AS key) keys
            WHERE
                old_image -> key IS DISTINCT FROM new_image -> key
            ORDER BY
                key)
    END;
    -- reason is intentionally omitted: district_volume has no such column, so
    -- any extraction here would always yield NULL. Revisit when a source exists.
    INSERT INTO hrs.audit_event(action, changed_by, correlation_id)
        VALUES (operation, actor, corr_id)
    RETURNING
        audit_event_id
    INTO
        event_id;
    INSERT INTO hrs.audit_change(event_id, entity_type, entity_id, action, previous_values, current_values, changed_columns)
        VALUES (event_id, entity_kind, row_id, operation, old_image, new_image, COALESCE(changed, ARRAY[]::TEXT[]));
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION hrs.audit_district_volume_change() IS 'Writes complete OLD and NEW row-image audit records for all district_volume mutations. The actor comes from row audit columns and falls back to session_user (current_user inside SECURITY DEFINER resolves to the function owner, not the caller). The correlation_id comes from current_setting(''app.correlation_id'', true) and is NULL when unset.';

DROP TRIGGER IF EXISTS trg_district_volume_audit ON hrs.district_volume;

CREATE TRIGGER trg_district_volume_audit
    AFTER INSERT OR DELETE OR UPDATE ON hrs.district_volume
    FOR EACH ROW
    EXECUTE FUNCTION hrs.audit_district_volume_change();

COMMENT ON COLUMN hrs.audit_event.correlation_id IS 'Distributed tracing correlation identifier.';

CREATE INDEX IF NOT EXISTS idx_audit_event_correlation_time ON hrs.audit_event USING btree(correlation_id, changed_at DESC)
    WHERE (correlation_id IS NOT NULL);

-- ============================================================================
-- V1.1.8__da_schema_standards.sql — Issue #1300: column
-- documentation (and FK constraints) for the tables owned by this file.
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

ALTER TABLE ONLY hrs.audit_change
    DROP CONSTRAINT IF EXISTS fk_audit_change_event CASCADE;

ALTER TABLE ONLY hrs.audit_change
    ADD CONSTRAINT fk_audit_change_event FOREIGN KEY (event_id) REFERENCES hrs.audit_event(audit_event_id);
