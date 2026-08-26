-- SPIKE — audit correlation ID via session GUC (B3 trace propagation)
-- Populate hrs.audit_event.correlation_id from the transaction-local
-- app.correlation_id setting. The audit trigger remains otherwise unchanged.
-- Canonical column width is VARCHAR(128): V1.0.5 already created it as such,
-- so the ADD COLUMN below is a no-op kept for self-documentation; the trigger
-- variable and every consumer must use 128 as well (B3/W3C trace ids are 32
-- hex chars, but full traceparent values can reach ~55).

ALTER TABLE hrs.audit_event
    ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(128);

COMMENT ON COLUMN hrs.audit_event.correlation_id IS 'B3 trace correlation ID captured via app.correlation_id GUC; NULL when unset.';

CREATE INDEX IF NOT EXISTS idx_audit_event_correlation_time
    ON hrs.audit_event (correlation_id, changed_at DESC)
    WHERE correlation_id IS NOT NULL;

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
        session_user
    );

    -- NULLIF guards against an empty-string GUC, which current_setting would
    -- otherwise surface as '' rather than SQL NULL.
    corr_id := NULLIF(current_setting('app.correlation_id', true), '');

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

    -- reason is intentionally omitted: district_volume has no such column, so
    -- any extraction here would always yield NULL. Revisit when a source exists.
    INSERT INTO hrs.audit_event(action, changed_by, correlation_id)
    VALUES (operation, actor, corr_id)
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
'Writes complete OLD and NEW row-image audit records for all district_volume mutations. The actor comes from row audit columns and falls back to session_user (current_user inside SECURITY DEFINER resolves to the function owner, not the caller). The correlation_id comes from current_setting(''app.correlation_id'', true) and is NULL when unset.';
