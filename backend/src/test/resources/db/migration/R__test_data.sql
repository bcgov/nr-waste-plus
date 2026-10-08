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

-- Reporting-unit block-list test data. For this test path, PostgreSQL reporting
-- units are treated as District Average; hrs.reporting_unit has no sampling column.
-- Soft-delete prior rows owned by this fixture so repeatable migration reruns do
-- not violate the live reporting-unit/block uniqueness constraints. Preserve rows
-- rather than deleting them because audit and other test data may reference them.
-- The test-data-1254 predicate also retires rows created by the initial manual seed.
UPDATE hrs.district_average_block dab
SET is_deleted = TRUE,
    updated_at = NOW(),
    updated_by = 'test-seed:reporting-unit-block-list-v1'
FROM hrs.block b
JOIN hrs.reporting_unit ru ON ru.reporting_unit_id = b.reporting_unit_id
WHERE dab.district_average_block_id = b.block_id
  AND ru.client_number = '00001271'
  AND ru.client_locn_code = 'TEST-1254-B'
  AND ru.org_unit_no = 'DCC'
  AND ru.created_by IN ('test-seed:reporting-unit-block-list-v1', 'test-data-1254')
  AND b.created_by IN ('test-seed:reporting-unit-block-list-v1', 'test-data-1254')
  AND NOT dab.is_deleted;

UPDATE hrs.block b
SET is_deleted = TRUE,
    updated_at = NOW(),
    updated_by = 'test-seed:reporting-unit-block-list-v1'
FROM hrs.reporting_unit ru
WHERE ru.reporting_unit_id = b.reporting_unit_id
  AND ru.client_number = '00001271'
  AND ru.client_locn_code = 'TEST-1254-B'
  AND ru.org_unit_no = 'DCC'
  AND ru.created_by IN ('test-seed:reporting-unit-block-list-v1', 'test-data-1254')
  AND b.created_by IN ('test-seed:reporting-unit-block-list-v1', 'test-data-1254')
  AND NOT b.is_deleted;

UPDATE hrs.reporting_unit
SET is_deleted = TRUE,
    updated_at = NOW(),
    updated_by = 'test-seed:reporting-unit-block-list-v1'
WHERE client_number = '00001271'
  AND (client_locn_code, org_unit_no) IN (('TEST-1254-A', 'T01'), ('TEST-1254-B', 'T02'))
  AND created_by IN ('test-seed:reporting-unit-block-list-v1', 'test-data-1254')
  AND NOT is_deleted;

INSERT INTO hrs.reporting_unit
    (client_number, client_locn_code, org_unit_no, created_by, updated_by)
VALUES
    ('00001271', 'TEST-1254-A', 'T01', 'test-seed:reporting-unit-block-list-v1', 'test-seed:reporting-unit-block-list-v1'),
    ('00001271', 'TEST-1254-B', 'T02', 'test-seed:reporting-unit-block-list-v1', 'test-seed:reporting-unit-block-list-v1');

INSERT INTO hrs.block
    (reporting_unit_id, block_type, is_draft, created_by, updated_by)
SELECT
    ru.reporting_unit_id,
    'DISTRICT_AVERAGE',
    TRUE,
    'test-seed:reporting-unit-block-list-v1',
    'test-seed:reporting-unit-block-list-v1'
FROM hrs.reporting_unit ru
WHERE ru.client_number = '00001271'
  AND ru.client_locn_code = 'TEST-1254-B'
  AND ru.org_unit_no = 'DCC'
  AND ru.created_by = 'test-seed:reporting-unit-block-list-v1'
  AND NOT ru.is_deleted;

INSERT INTO hrs.district_average_block
    (district_average_block_id, has_dispersed_retention, is_heli_logging, created_by, updated_by)
SELECT
    b.block_id,
    FALSE,
    FALSE,
    'test-seed:reporting-unit-block-list-v1',
    'test-seed:reporting-unit-block-list-v1'
FROM hrs.block b
JOIN hrs.reporting_unit ru ON ru.reporting_unit_id = b.reporting_unit_id
WHERE ru.client_number = '00001271'
  AND ru.client_locn_code = 'TEST-1254-B'
  AND ru.org_unit_no = 'DCC'
  AND ru.created_by = 'test-seed:reporting-unit-block-list-v1'
  AND NOT ru.is_deleted
  AND b.created_by = 'test-seed:reporting-unit-block-list-v1'
  AND NOT b.is_deleted;
