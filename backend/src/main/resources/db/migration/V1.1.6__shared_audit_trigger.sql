-- Issue #1216: one generic audit trigger for the V1.1 submission/configuration tables.
-- V1.0.5 is intentionally unchanged; this function is the replacement shared by
-- tables with and without a deleted column, including append-only tables.

CREATE OR REPLACE FUNCTION hrs.audit_row_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, hrs
AS $$
DECLARE
    old_image JSONB;
    new_image JSONB;
    actor VARCHAR(128);
    corr_id VARCHAR(128);
    operation VARCHAR(32);
    changed TEXT[];
    audit_entity_id BIGINT;
    audit_event_id BIGINT;
BEGIN
    old_image := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END;
    new_image := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END;

    actor := COALESCE(
        NULLIF(new_image ->> 'updated_by', ''),
        NULLIF(old_image ->> 'updated_by', ''),
        session_user
    );

    -- current_setting(..., true) returns NULL when the transaction-local GUC is
    -- unset; NULLIF also keeps an explicitly empty setting out of the audit row.
    corr_id := NULLIF(current_setting('app.correlation_id', true), '');

    operation := CASE
        WHEN TG_OP = 'INSERT' THEN 'CREATE'
        WHEN TG_OP = 'DELETE' THEN 'DELETE'
        WHEN COALESCE(old_image ->> 'deleted', 'false') = 'false'
             AND COALESCE(new_image ->> 'deleted', 'false') = 'true'
            THEN 'SOFT_DELETE'
        ELSE 'UPDATE'
    END;

    audit_entity_id := NULLIF(COALESCE(new_image, old_image) ->> 'id', '')::BIGINT;
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
    RETURNING id INTO audit_event_id;

    INSERT INTO hrs.audit_change (
        event_id, entity_type, entity_id, action,
        previous_values, current_values, changed_columns
    )
    VALUES (
        audit_event_id, TG_TABLE_NAME, audit_entity_id, operation,
        old_image, new_image, COALESCE(changed, ARRAY[]::TEXT[])
    );

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

COMMENT ON FUNCTION hrs.audit_row_change() IS
    'Writes one generic full-row audit event/change pair per row mutation. Entity type is the table name; soft deletion is identified from deleted=false to deleted=true.';

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'reporting_unit',
        'block',
        'district_average_block',
        'block_mark',
        'block_area_segment',
        'block_attachment',
        'block_submitter',
        'block_sponsor',
        'block_requirement',
        'block_comment',
        'block_calculation_snapshot',
        'status_event',
        'outbox_event',
        'idempotency_record',
        'district_volume_formula',
        'lifecycle_setting'
    ]
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON hrs.%I',
            'trg_' || table_name || '_shared_audit', table_name);
        EXECUTE format(
            'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON hrs.%I '
            'FOR EACH ROW EXECUTE FUNCTION hrs.audit_row_change()',
            'trg_' || table_name || '_shared_audit', table_name);
    END LOOP;
END;
$$;
