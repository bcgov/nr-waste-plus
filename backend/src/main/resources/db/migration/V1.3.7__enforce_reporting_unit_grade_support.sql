ALTER TABLE wasteplus.reporting_unit
ADD COLUMN IF NOT EXISTS grade_code character varying(8);

-- Retain every district/grade pair represented by any stored District Volume
-- configuration. Soft-deleted versions are included because the relation is
-- historical and must continue to satisfy reporting-unit foreign keys.
CREATE TABLE IF NOT EXISTS wasteplus.district_grade_support (
    geographic_code character varying(3) NOT NULL,
    grade_code character varying(8) NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'wasteplus.district_grade_support'::regclass
          AND conname = 'pk_district_grade_support'
    ) THEN
        ALTER TABLE wasteplus.district_grade_support
            ADD CONSTRAINT pk_district_grade_support
            PRIMARY KEY (geographic_code, grade_code);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'wasteplus.district_grade_support'::regclass
          AND conname = 'ck_district_grade_support_grade_code'
    ) THEN
        ALTER TABLE wasteplus.district_grade_support
            ADD CONSTRAINT ck_district_grade_support_grade_code
            CHECK (grade_code IN ('COASTAL', 'INTERIOR'));
    END IF;
END;
$$;

COMMENT ON TABLE wasteplus.district_grade_support IS
'Historical district/grade pairs from stored DISTRICT_VOLUME configurations. '
'Soft-deleted configurations are included; the service checks current support.';
COMMENT ON COLUMN wasteplus.district_grade_support.geographic_code IS
'District code that has appeared in a District Volume configuration.';
COMMENT ON COLUMN wasteplus.district_grade_support.grade_code IS
'Supported grade code: COASTAL or INTERIOR.';

-- District Volume JSON stores district codes under zones for INTERIOR and
-- sections for COASTAL. Keep deleted versions because this table is historical.
-- Future config uploads must append pairs before dependent reporting units
-- are inserted; this migration only backfills configurations already stored.
INSERT INTO wasteplus.district_grade_support (geographic_code, grade_code)
SELECT DISTINCT
    upper(
        btrim(interior_district.value #>> '{district,code}')
    ) AS geographic_code,
    'INTERIOR' AS grade_code
FROM wasteplus.district_volume AS dv
CROSS JOIN
    LATERAL jsonb_array_elements(
        CASE
            WHEN jsonb_typeof(dv.table_data -> 'zones') = 'array'
                THEN dv.table_data -> 'zones'
            ELSE '[]'::jsonb
        END
    ) AS interior_zone (value)
CROSS JOIN
    LATERAL jsonb_array_elements(
        CASE
            WHEN jsonb_typeof(interior_zone.value -> 'districts') = 'array'
                THEN interior_zone.value -> 'districts'
            ELSE '[]'::jsonb
        END
    ) AS interior_district (value)
WHERE
    dv.config_type = 'DISTRICT_VOLUME'
    AND dv.area = 'INTERIOR'
    AND nullif(
        btrim(interior_district.value #>> '{district,code}'),
        ''
    ) IS NOT NULL
UNION
SELECT DISTINCT
    upper(
        btrim(coastal_district.value #>> '{district,code}')
    ) AS geographic_code,
    'COASTAL' AS grade_code
FROM wasteplus.district_volume AS dv
CROSS JOIN
    LATERAL jsonb_array_elements(
        CASE
            WHEN jsonb_typeof(dv.table_data -> 'sections') = 'array'
                THEN dv.table_data -> 'sections'
            ELSE '[]'::jsonb
        END
    ) AS coastal_section (value)
CROSS JOIN
    LATERAL jsonb_array_elements(
        CASE
            WHEN jsonb_typeof(coastal_section.value -> 'districts') = 'array'
                THEN coastal_section.value -> 'districts'
            ELSE '[]'::jsonb
        END
    ) AS coastal_district (value)
WHERE
    dv.config_type = 'DISTRICT_VOLUME'
    AND dv.area = 'COASTAL'
    AND nullif(
        btrim(coastal_district.value #>> '{district,code}'),
        ''
    ) IS NOT NULL
ON CONFLICT (geographic_code, grade_code) DO NOTHING;

-- Historical configs can predate or outlive the geographic-code extract.
-- NOT VALID preserves those pairs while enforcing the FK for new mappings.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'wasteplus.district_grade_support'::regclass
          AND conname = 'fk_district_grade_support_geographic_code'
    ) THEN
        ALTER TABLE wasteplus.district_grade_support
            ADD CONSTRAINT fk_district_grade_support_geographic_code
            FOREIGN KEY (geographic_code)
            REFERENCES wasteplus.geographic_code (code)
            ON UPDATE RESTRICT
            ON DELETE RESTRICT
            NOT VALID;
    END IF;
END;
$$;

-- A uniquely supported historical grade can be backfilled without guessing.
-- Leave rows whose district has supported both grades unresolved for review.
WITH unambiguous_district_grade AS (
    SELECT
        geographic_code,
        min(grade_code) AS grade_code
    FROM wasteplus.district_grade_support
    GROUP BY geographic_code
    HAVING count(*) = 1
)

UPDATE wasteplus.reporting_unit AS ru
SET grade_code = unique_grade.grade_code
FROM unambiguous_district_grade AS unique_grade
WHERE
    ru.sampling_code = 'AVG'
    AND ru.grade_code IS NULL
    AND ru.geographic_code = unique_grade.geographic_code;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'wasteplus.reporting_unit'::regclass
          AND conname = 'ck_reporting_unit_grade_code_allowed'
    ) THEN
        ALTER TABLE wasteplus.reporting_unit
            ADD CONSTRAINT ck_reporting_unit_grade_code_allowed
            CHECK (grade_code IS NULL OR grade_code IN ('COASTAL', 'INTERIOR'))
            NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'wasteplus.reporting_unit'::regclass
          AND conname = 'ck_reporting_unit_avg_requires_grade'
    ) THEN
        ALTER TABLE wasteplus.reporting_unit
            ADD CONSTRAINT ck_reporting_unit_avg_requires_grade
            CHECK (sampling_code <> 'AVG' OR grade_code IS NOT NULL)
            NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'wasteplus.reporting_unit'::regclass
          AND conname = 'fk_reporting_unit_district_grade_support'
    ) THEN
        ALTER TABLE wasteplus.reporting_unit
            ADD CONSTRAINT fk_reporting_unit_district_grade_support
            FOREIGN KEY (geographic_code, grade_code)
            REFERENCES wasteplus.district_grade_support (geographic_code, grade_code)
            ON UPDATE RESTRICT
            ON DELETE RESTRICT
            NOT VALID;
    END IF;
END;
$$;

-- NOT VALID installs immediate enforcement for new or updated rows. Reject
-- unresolved historical violations with a focused diagnostic, then validate
-- the constraints before this migration can commit.
DO $$
DECLARE
    missing_avg_grade_count bigint;
    invalid_grade_count bigint;
    unsupported_pair_count bigint;
    example_rows text;
BEGIN
    SELECT
        count(*) FILTER (
            WHERE ru.sampling_code = 'AVG'
              AND ru.grade_code IS NULL
        ),
        count(*) FILTER (
            WHERE ru.grade_code IS NOT NULL
              AND ru.grade_code NOT IN ('COASTAL', 'INTERIOR')
        ),
        count(*) FILTER (
            WHERE ru.grade_code IN ('COASTAL', 'INTERIOR')
              AND NOT EXISTS (
                  SELECT 1
                  FROM wasteplus.district_grade_support AS support
                  WHERE support.geographic_code = ru.geographic_code
                    AND support.grade_code = ru.grade_code
              )
        )
    INTO
        missing_avg_grade_count,
        invalid_grade_count,
        unsupported_pair_count
    FROM wasteplus.reporting_unit AS ru;

    IF missing_avg_grade_count > 0
       OR invalid_grade_count > 0
       OR unsupported_pair_count > 0 THEN
        SELECT string_agg(
            format(
                'id=%s district=%s sampling=%s grade=%s',
                invalid.reporting_unit_id,
                invalid.geographic_code,
                invalid.sampling_code,
                coalesce(invalid.grade_code, '<NULL>')
            ),
            '; '
        )
        INTO example_rows
        FROM (
            SELECT
                ru.reporting_unit_id,
                ru.geographic_code,
                ru.sampling_code,
                ru.grade_code
            FROM wasteplus.reporting_unit AS ru
            WHERE (ru.sampling_code = 'AVG' AND ru.grade_code IS NULL)
               OR (ru.grade_code IS NOT NULL
                   AND ru.grade_code NOT IN ('COASTAL', 'INTERIOR'))
               OR (ru.grade_code IN ('COASTAL', 'INTERIOR')
                   AND NOT EXISTS (
                       SELECT 1
                       FROM wasteplus.district_grade_support AS support
                       WHERE support.geographic_code = ru.geographic_code
                         AND support.grade_code = ru.grade_code
                   ))
            ORDER BY ru.reporting_unit_id
            LIMIT 10
        ) AS invalid;

        RAISE EXCEPTION USING
            MESSAGE = format(
                'V1.3.7 cannot validate reporting-unit grade constraints: %s AVG row(s) missing grade_code, %s row(s) with invalid grade_code, %s row(s) with unsupported district/grade pair. Examples: %s',
                missing_avg_grade_count,
                invalid_grade_count,
                unsupported_pair_count,
                coalesce(example_rows, '<none>')
            ),
            HINT = 'Correct historical grades from a trusted source and ensure each non-NULL district/grade pair exists in wasteplus.district_grade_support, then rerun the migration. Ambiguous districts are not backfilled automatically.';
    END IF;
END;
$$;

ALTER TABLE wasteplus.reporting_unit
VALIDATE CONSTRAINT ck_reporting_unit_grade_code_allowed;
ALTER TABLE wasteplus.reporting_unit
VALIDATE CONSTRAINT ck_reporting_unit_avg_requires_grade;
ALTER TABLE wasteplus.reporting_unit
VALIDATE CONSTRAINT fk_reporting_unit_district_grade_support;

CREATE INDEX IF NOT EXISTS idx_reporting_unit_geographic_grade_code
ON wasteplus.reporting_unit (geographic_code, grade_code);

COMMENT ON COLUMN wasteplus.reporting_unit.grade_code IS
'Grade code: COASTAL or INTERIOR. Required when sampling_code is AVG. '
'Must be historically supported for the selected geographic_code by '
'wasteplus.district_grade_support. The service separately checks the currently '
'effective District Volume configuration when creating a reporting unit.';
