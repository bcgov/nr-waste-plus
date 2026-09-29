-- ============================================================================
-- V1.3.1__shared_audit_trigger.sql — Issue #1216: generic
-- audit_row_change() trigger function (final V1.1.8 body, #1300) with its 17
-- bindings: AFTER INSERT/UPDATE/DELETE triggers for the submission-domain
-- tables (#1215/#1272) and for formula_set/formula_set_row (#1219),
-- attached after the function exists.
-- ============================================================================
CREATE OR REPLACE FUNCTION hrs.audit_row_change()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
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
    old_image := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN
        to_jsonb(OLD)
    END;
    new_image := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN
        to_jsonb(NEW)
    END;
    actor := COALESCE(NULLIF(new_image ->> 'updated_by', ''), NULLIF (old_image ->> 'updated_by', ''), session_user);
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
    audit_entity_id := NULLIF(COALESCE(new_image, old_image) ->>(TG_TABLE_NAME || '_id'), '')::BIGINT;
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
            FROM
                jsonb_object_keys(old_image || new_image) AS keys(key)
            WHERE
                old_image -> key IS DISTINCT FROM new_image -> key
            ORDER BY
                key)
    END;
    INSERT INTO hrs.audit_event(action, changed_by, correlation_id)
        VALUES (operation, actor, corr_id)
    RETURNING
        audit_event_id
    INTO
        event_id;
    INSERT INTO hrs.audit_change(event_id, entity_type, entity_id, action, previous_values, current_values, changed_columns)
        VALUES (event_id, TG_TABLE_NAME, audit_entity_id, operation, old_image, new_image, COALESCE(changed, ARRAY[]::TEXT[]));
    RETURN CASE WHEN TG_OP = 'DELETE' THEN
        OLD
    ELSE
        NEW
    END;
END;
$$;

COMMENT ON FUNCTION hrs.audit_row_change() IS 'Writes one generic full-row audit event/change pair per row mutation. Entity type is the table name; soft deletion is identified from is_deleted=false to is_deleted=true.';

DROP TRIGGER IF EXISTS trg_block_area_segment_shared_audit ON hrs.block_area_segment;

CREATE TRIGGER trg_block_area_segment_shared_audit
    AFTER INSERT OR DELETE OR UPDATE ON hrs.block_area_segment
    FOR EACH ROW
    EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_block_attachment_shared_audit ON hrs.block_attachment;

CREATE TRIGGER trg_block_attachment_shared_audit
    AFTER INSERT OR DELETE OR UPDATE ON hrs.block_attachment
    FOR EACH ROW
    EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_block_calculation_snapshot_shared_audit ON hrs.block_calculation_snapshot;

CREATE TRIGGER trg_block_calculation_snapshot_shared_audit
    AFTER INSERT OR DELETE OR UPDATE ON hrs.block_calculation_snapshot
    FOR EACH ROW
    EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_block_comment_shared_audit ON hrs.block_comment;

CREATE TRIGGER trg_block_comment_shared_audit
    AFTER INSERT OR DELETE OR UPDATE ON hrs.block_comment
    FOR EACH ROW
    EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_block_mark_shared_audit ON hrs.block_mark;

CREATE TRIGGER trg_block_mark_shared_audit
    AFTER INSERT OR DELETE OR UPDATE ON hrs.block_mark
    FOR EACH ROW
    EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_block_requirement_shared_audit ON hrs.block_requirement;

CREATE TRIGGER trg_block_requirement_shared_audit
    AFTER INSERT OR DELETE OR UPDATE ON hrs.block_requirement
    FOR EACH ROW
    EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_block_shared_audit ON hrs.block;

CREATE TRIGGER trg_block_shared_audit
    AFTER INSERT OR DELETE OR UPDATE ON hrs.block
    FOR EACH ROW
    EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_block_sponsor_shared_audit ON hrs.block_sponsor;

CREATE TRIGGER trg_block_sponsor_shared_audit
    AFTER INSERT OR DELETE OR UPDATE ON hrs.block_sponsor
    FOR EACH ROW
    EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_block_submitter_shared_audit ON hrs.block_submitter;

CREATE TRIGGER trg_block_submitter_shared_audit
    AFTER INSERT OR DELETE OR UPDATE ON hrs.block_submitter
    FOR EACH ROW
    EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_district_average_block_shared_audit ON hrs.district_average_block;

CREATE TRIGGER trg_district_average_block_shared_audit
    AFTER INSERT OR DELETE OR UPDATE ON hrs.district_average_block
    FOR EACH ROW
    EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_idempotency_record_shared_audit ON hrs.idempotency_record;

CREATE TRIGGER trg_idempotency_record_shared_audit
    AFTER INSERT OR DELETE OR UPDATE ON hrs.idempotency_record
    FOR EACH ROW
    EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_lifecycle_setting_shared_audit ON hrs.lifecycle_setting;

CREATE TRIGGER trg_lifecycle_setting_shared_audit
    AFTER INSERT OR DELETE OR UPDATE ON hrs.lifecycle_setting
    FOR EACH ROW
    EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_outbox_event_shared_audit ON hrs.outbox_event;

CREATE TRIGGER trg_outbox_event_shared_audit
    AFTER INSERT OR DELETE OR UPDATE ON hrs.outbox_event
    FOR EACH ROW
    EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_reporting_unit_shared_audit ON hrs.reporting_unit;

CREATE TRIGGER trg_reporting_unit_shared_audit
    AFTER INSERT OR DELETE OR UPDATE ON hrs.reporting_unit
    FOR EACH ROW
    EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_status_event_shared_audit ON hrs.status_event;

CREATE TRIGGER trg_status_event_shared_audit
    AFTER INSERT OR DELETE OR UPDATE ON hrs.status_event
    FOR EACH ROW
    EXECUTE FUNCTION hrs.audit_row_change();

-- ============================================================================
-- V1.1.7__independent_formula_sets.sql — shared audit trigger bindings for
-- hrs.formula_set and hrs.formula_set_row (placed here because
-- hrs.audit_row_change() is defined above).
-- ============================================================================
DROP TRIGGER IF EXISTS trg_formula_set_row_shared_audit ON hrs.formula_set_row;

CREATE TRIGGER trg_formula_set_row_shared_audit
    AFTER INSERT OR DELETE OR UPDATE ON hrs.formula_set_row
    FOR EACH ROW
    EXECUTE FUNCTION hrs.audit_row_change();

DROP TRIGGER IF EXISTS trg_formula_set_shared_audit ON hrs.formula_set;

CREATE TRIGGER trg_formula_set_shared_audit
    AFTER INSERT OR DELETE OR UPDATE ON hrs.formula_set
    FOR EACH ROW
    EXECUTE FUNCTION hrs.audit_row_change();
