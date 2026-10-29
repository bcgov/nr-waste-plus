-- Set the District Average sampling default and require a valid sampling code.
ALTER TABLE wasteplus.reporting_unit
ALTER COLUMN sampling_code SET DEFAULT 'AVG';

UPDATE wasteplus.reporting_unit
SET
    sampling_code = 'AVG'
WHERE sampling_code IS NULL;

ALTER TABLE wasteplus.reporting_unit
ALTER COLUMN sampling_code SET NOT NULL;

COMMENT ON COLUMN wasteplus.reporting_unit.sampling_code IS
'Waste sampling option code, e.g. AVG.';
