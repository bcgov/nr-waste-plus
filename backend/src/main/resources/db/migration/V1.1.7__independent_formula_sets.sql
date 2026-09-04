CREATE TABLE IF NOT EXISTS hrs.formula_set (
  id BIGSERIAL PRIMARY KEY, area VARCHAR(10) NOT NULL, start_date DATE NOT NULL,
  end_date DATE, deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by VARCHAR(128) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_by VARCHAR(128) NOT NULL,
  CONSTRAINT formula_set_dates_ck CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE TABLE IF NOT EXISTS hrs.formula_set_row (
  id BIGSERIAL PRIMARY KEY, formula_set_id BIGINT NOT NULL REFERENCES hrs.formula_set(id),
  formula_key VARCHAR(128) NOT NULL, expression TEXT NOT NULL,
  declared_variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb, sort_order INTEGER NOT NULL DEFAULT 0,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by VARCHAR(128) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_by VARCHAR(128) NOT NULL,
  CONSTRAINT formula_set_row_key_uq UNIQUE (formula_set_id, formula_key),
  CONSTRAINT formula_set_row_order_ck CHECK (sort_order >= 0)
);
CREATE INDEX IF NOT EXISTS formula_set_effective_ix ON hrs.formula_set(area, start_date, end_date)
  WHERE deleted = FALSE;
CREATE INDEX IF NOT EXISTS formula_set_row_set_ix ON hrs.formula_set_row(formula_set_id, sort_order, id);

-- Legacy hrs.district_volume_formula is intentionally preserved. A later, audited
-- deployment-specific backfill may copy rows into formula_set/formula_set_row after
-- selecting the owning area's effective interval; no formula keys are fabricated here.

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['formula_set', 'formula_set_row'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON hrs.%I',
      'trg_' || table_name || '_shared_audit', table_name);
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON hrs.%I '
      || 'FOR EACH ROW EXECUTE FUNCTION hrs.audit_row_change()',
      'trg_' || table_name || '_shared_audit', table_name);
  END LOOP;
END $$;
