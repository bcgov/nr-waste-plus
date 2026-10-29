-- Keep locally generated reporting-unit IDs above legacy Oracle IDs.
ALTER SEQUENCE IF EXISTS wasteplus.reporting_unit_id_seq START WITH 1000000000;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_sequences
    WHERE schemaname = 'wasteplus'
      AND sequencename = 'reporting_unit_id_seq'
      AND COALESCE(last_value, 1) < 1000000000
  ) THEN
    ALTER SEQUENCE IF EXISTS wasteplus.reporting_unit_id_seq RESTART WITH 1000000000;
  END IF;
END $$;
