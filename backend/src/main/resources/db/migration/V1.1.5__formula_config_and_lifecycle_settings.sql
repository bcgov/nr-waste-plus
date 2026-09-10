-- Issue #1216: administrator-managed formulas and configurable lifecycle timers.

CREATE TABLE IF NOT EXISTS hrs.district_volume_formula (
    id BIGSERIAL,
    district_volume_id BIGINT NOT NULL,
    formula_key VARCHAR(128) NOT NULL,
    expression TEXT NOT NULL,
    declared_variables JSONB NOT NULL DEFAULT '{}'::JSONB,
    validation_errors JSONB NOT NULL DEFAULT '[]'::JSONB,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(128) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(128) NOT NULL,
    CONSTRAINT district_volume_formula_pk PRIMARY KEY (id),
    CONSTRAINT fk_district_volume_formula_district_volume
        FOREIGN KEY (district_volume_id) REFERENCES hrs.district_volume(id),
    CONSTRAINT district_volume_formula_key_uq
        UNIQUE (district_volume_id, formula_key),
    CONSTRAINT district_volume_formula_sort_order_ck CHECK (sort_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_district_volume_formula_district_volume_id
    ON hrs.district_volume_formula (district_volume_id, sort_order, id);

CREATE TABLE IF NOT EXISTS hrs.lifecycle_setting (
    id BIGSERIAL,
    setting_key VARCHAR(128) NOT NULL,
    setting_value VARCHAR(256) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(128) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(128) NOT NULL,
    CONSTRAINT lifecycle_setting_pk PRIMARY KEY (id),
    CONSTRAINT lifecycle_setting_key_uq UNIQUE (setting_key)
);

INSERT INTO hrs.lifecycle_setting (
    setting_key, setting_value, created_by, updated_by
)
VALUES
    ('AUTO_APPROVE_MONTHS', '12', current_user, current_user),
    ('BILLING_DELAY_MONTHS', '1', current_user, current_user)
ON CONFLICT (setting_key) DO NOTHING;

COMMENT ON TABLE hrs.district_volume_formula IS
    'Administrator-managed formula definitions associated with a district-volume version.';
COMMENT ON COLUMN hrs.district_volume_formula.formula_key IS
    'Stable namespaced formula identifier, such as config.*, submission.*, species.*, or hbs.*.';
COMMENT ON COLUMN hrs.district_volume_formula.declared_variables IS
    'JSON object containing the variables declared by the formula.';
COMMENT ON COLUMN hrs.district_volume_formula.validation_errors IS
    'JSON array of formula validation errors; an empty array means no recorded errors.';
COMMENT ON TABLE hrs.lifecycle_setting IS
    'Configurable lifecycle timing values stored as key/value settings.';
