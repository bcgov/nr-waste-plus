CREATE TABLE IF NOT EXISTS wasteplus.district_average_criteria_code (
    code text NOT NULL,
    description text NOT NULL,
    effective_date timestamp without time zone NOT NULL,
    expiry_date timestamp without time zone NOT NULL,
    update_timestamp timestamp without time zone NOT NULL
);

COMMENT ON TABLE wasteplus.district_average_criteria_code IS
'District Average criteria options (Waste manual section 4.5) for HRS. '
'Codes 1-11 are stable criterion identifiers; descriptions use manual, then '
'spreadsheet, then Confluence precedence where wording differs.';
COMMENT ON COLUMN wasteplus.district_average_criteria_code.code IS
'Stable criterion code ''1''-''11''; deterministic ordering by criterion number.';
COMMENT ON COLUMN wasteplus.district_average_criteria_code.description IS
'Full criterion description text (without numeric label prefix; frontend appends '
'the criterion number as done for other dropdown options).';
COMMENT ON COLUMN wasteplus.district_average_criteria_code.effective_date IS
'Effective timestamp; apply active-date rules when reading current codes.';
COMMENT ON COLUMN wasteplus.district_average_criteria_code.expiry_date IS
'Expiry timestamp; apply active-date rules when reading current codes.';
COMMENT ON COLUMN wasteplus.district_average_criteria_code.update_timestamp IS
'Last update timestamp for the seeded criterion record.';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'wasteplus.district_average_criteria_code'::regclass
          AND conname = 'district_average_criteria_code_pk'
    ) THEN
        ALTER TABLE wasteplus.district_average_criteria_code
            ADD CONSTRAINT district_average_criteria_code_pk PRIMARY KEY (code);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'wasteplus.district_average_criteria_code'::regclass
          AND conname = 'district_average_criteria_code_lengths_ck'
    ) THEN
        ALTER TABLE wasteplus.district_average_criteria_code
            ADD CONSTRAINT district_average_criteria_code_lengths_ck CHECK (
                char_length(code) <= 2
                AND char_length(description) <= 1000
            );
    END IF;
END;
$$;
