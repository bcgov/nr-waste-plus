-- Issue 1183 — database-trigger audit framework and soft-delete metadata
-- Audit rows are written by PostgreSQL for every INSERT, UPDATE, and DELETE.
-- The trigger is self-sufficient for application and direct database writes. It
-- uses the mutated row's created_by/updated_by columns for the actor and falls
-- back to current_user when those values are unavailable.

CREATE TABLE IF NOT EXISTS hrs.audit_event (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(32) NOT NULL,
    changed_by VARCHAR(128) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE hrs.audit_event IS 'Immutable audit event grouping one temporal mutation operation.';
COMMENT ON COLUMN hrs.audit_event.action IS 'CREATE, UPDATE, SOFT_DELETE, DELETE';

CREATE TABLE IF NOT EXISTS hrs.audit_change (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES hrs.audit_event(id),
    entity_type VARCHAR(64) NOT NULL,
    entity_id BIGINT NOT NULL,
    action VARCHAR(32) NOT NULL,
    previous_values JSONB,
    current_values JSONB,
    changed_columns TEXT[] NOT NULL DEFAULT '{}'
);

COMMENT ON TABLE hrs.audit_change IS 'Append-only per-row audit change with JSONB snapshot. No FK on entity_id (polymorphic audit).';
COMMENT ON COLUMN hrs.audit_change.previous_values IS 'Full snapshot before mutation as JSONB';
COMMENT ON COLUMN hrs.audit_change.current_values IS 'Full snapshot after mutation as JSONB';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_change_event_id ON hrs.audit_change(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_change_entity_lookup ON hrs.audit_change(entity_type, entity_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_change_entity_type_id ON hrs.audit_change(entity_type, id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_changed_by_time ON hrs.audit_event(changed_by, changed_at DESC);

-- Soft-delete columns on district_volume
ALTER TABLE hrs.district_volume
    ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN hrs.district_volume.deleted IS 'Whether the configuration row is soft-deleted; live queries must filter deleted = FALSE.';

-- Temporal lookup index (existing pattern extended)
CREATE INDEX IF NOT EXISTS idx_district_volume_config_type_area_start
    ON hrs.district_volume(config_type, area, start_date);

-- Partial live-row index for temporal/live lookups
CREATE INDEX IF NOT EXISTS idx_district_volume_live_config_area_start
    ON hrs.district_volume(config_type, area, start_date)
    WHERE deleted = FALSE;

-- Trigger-based audit. One event/change pair is emitted per changed row. This
-- deliberately has no entity FK so the hard-delete image remains queryable.
CREATE OR REPLACE FUNCTION hrs.audit_district_volume_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, hrs
AS $$
DECLARE
    old_image JSONB;
    new_image JSONB;
    old_row JSONB;
    new_row JSONB;
    actor VARCHAR(128);
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
    row_id := COALESCE((new_image ->> 'id')::BIGINT, (old_image ->> 'id')::BIGINT);
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
        current_user
    );

    operation := CASE
        WHEN TG_OP = 'INSERT' THEN 'CREATE'
        WHEN TG_OP = 'DELETE' THEN 'DELETE'
        WHEN OLD.deleted = FALSE AND NEW.deleted = TRUE THEN 'SOFT_DELETE'
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

    INSERT INTO hrs.audit_event(action, changed_by)
    VALUES (operation, actor)
    RETURNING id INTO event_id;

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

COMMENT ON FUNCTION hrs.audit_district_volume_change() IS
'Writes complete OLD and NEW row-image audit records for all district_volume mutations. The actor comes from row audit columns and falls back to current_user.';

DROP TRIGGER IF EXISTS trg_district_volume_audit ON hrs.district_volume;
CREATE TRIGGER trg_district_volume_audit
AFTER INSERT OR UPDATE OR DELETE ON hrs.district_volume
FOR EACH ROW
EXECUTE FUNCTION hrs.audit_district_volume_change();