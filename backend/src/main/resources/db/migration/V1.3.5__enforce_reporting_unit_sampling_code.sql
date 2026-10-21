-- Set the District Average sampling default and require a valid sampling code.
ALTER TABLE hrs.reporting_unit
ALTER COLUMN sampling_code SET DEFAULT 'AVG';

UPDATE hrs.reporting_unit
SET
    sampling_code = 'AVG'
WHERE sampling_code IS NULL;

ALTER TABLE hrs.reporting_unit
ALTER COLUMN sampling_code SET NOT NULL;

COMMENT ON COLUMN hrs.reporting_unit.sampling_code IS
'Waste sampling option code, e.g. AVG.';
