INSERT INTO hrs.user_preferences (user_id,preferences,updated_date,revision) VALUES
     ('IDIR\\test','{"theme": "g10"}','2025-08-26 11:22:16.371268',2)
ON CONFLICT (user_id) DO UPDATE SET
    preferences = EXCLUDED.preferences,
    updated_date = EXCLUDED.updated_date,
    revision = EXCLUDED.revision;

-- District volume seed data required by ReportingUnitControllerIntegrationTest.
-- DKM must appear in both an active INTERIOR record and an active COASTAL record so
-- that DistrictVolumeService.getAreasForDistrictCode("DKM") returns a list of size 2,
-- triggering the grade-required validation (HTTP 400) when gradeCode is absent.
-- The Testcontainers database is shared by all integration-test classes. Close the rows owned by
-- this fixture before reseeding so repeatable migration execution cannot accumulate duplicate
-- active records for the same area. Closing rather than deleting preserves foreign-key references
-- from formula and calculation-snapshot tests. The legacy predicate is retained for rows created
-- before the stable fixture discriminator was added.
UPDATE hrs.district_volume
SET end_date = '2019-12-31',
    updated_at = NOW(),
    updated_by = 'test-seed:reporting-unit-dkm-v1'
WHERE created_by = 'test-seed'
  AND start_date = '2020-01-01'
  AND end_date IS NULL
  AND area IN ('INTERIOR', 'COASTAL')
  AND (
      table_data @> '{"zones":[{"districts":[{"district":{"code":"DKM"}}]}]}'::JSONB
      OR table_data @> '{"sections":[{"districts":[{"district":{"code":"DKM"}}]}]}'::JSONB
  );

UPDATE hrs.district_volume
SET end_date = '2019-12-31',
    updated_at = NOW(),
    updated_by = 'test-seed:reporting-unit-dkm-v1'
WHERE created_by = 'test-seed:reporting-unit-dkm-v1'
  AND start_date = '2020-01-01'
  AND end_date IS NULL
  AND area IN ('INTERIOR', 'COASTAL');

INSERT INTO hrs.district_volume
    (area, start_date, end_date, table_data, table_level_factor, heli_multiplier,
     created_at, created_by, updated_at, updated_by)
VALUES
    (
        'INTERIOR',
        '2020-01-01',
        NULL,
        '{
          "zones": [
            {
              "name": "North Interior",
              "districts": [
                {
                  "district": {"code": "DKM", "description": "Coast Mountains Natural Resource District"},
                  "avoidableSawlog": 1.000,
                  "avoidableGrade4": 0.500,
                  "unavoidableGrade4": 0.200,
                  "total": 1.700
                }
              ]
            }
          ],
          "formulas": {}
        }',
        1.000,
        NULL,
        NOW(),
        'test-seed:reporting-unit-dkm-v1',
        NOW(),
        'test-seed:reporting-unit-dkm-v1'
    ),
    (
        'COASTAL',
        '2020-01-01',
        NULL,
        '{
          "sections": [
            {
              "name": "Coast Section",
              "districts": [
                {
                  "district": {"code": "DKM", "description": "Coast Mountains Natural Resource District"},
                  "avoidableSawlog": 2.000,
                  "avoidableHembalGradeU": 0.300,
                  "avoidableGradeY": 0.100,
                  "unavoidable": 0.050,
                  "total": 2.450
                }
              ]
            }
          ],
          "formulas": {}
        }',
        2.000,
        1.200,
        NOW(),
        'test-seed:reporting-unit-dkm-v1',
        NOW(),
        'test-seed:reporting-unit-dkm-v1'
    );
