-- SPIKE — audit correlation ID via session GUC (B3 trace propagation)
-- Populate hrs.audit_event.correlation_id from the transaction-local
-- app.correlation_id setting. The audit trigger remains otherwise unchanged.

ALTER TABLE hrs.audit_event
    ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(64);

COMMENT ON COLUMN hrs.audit_event.correlation_id IS 'B3 trace correlation ID captured via app.correlation_id GUC; NULL when unset.';

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
    corr_id VARCHAR(64);
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

    corr_id := current_setting('app.correlation_id', true);

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

    INSERT INTO hrs.audit_event(action, changed_by, reason, correlation_id)
    VALUES (operation, actor,
        COALESCE(NULLIF(new_image ->> 'reason', ''), old_image ->> 'reason'),
        corr_id)
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
'Writes complete OLD and NEW row-image audit records for all district_volume mutations. The actor comes from row audit columns and falls back to current_user. The correlation_id comes from current_setting(''app.correlation_id'', true) and is NULL when unset.';
