DECLARE
  column_count PLS_INTEGER;
  matching_column_count PLS_INTEGER;
BEGIN
  SELECT COUNT(*)
    INTO column_count
    FROM ALL_TAB_COLUMNS
   WHERE OWNER = 'THE'
     AND TABLE_NAME = 'WASTE_REPORTING_UNIT'
     AND COLUMN_NAME = 'IDEMPOTENCY_KEY';

  IF column_count = 0 THEN
    EXECUTE IMMEDIATE
      'ALTER TABLE THE.WASTE_REPORTING_UNIT ADD (IDEMPOTENCY_KEY VARCHAR2(256 CHAR))';
  ELSE
    SELECT COUNT(*)
      INTO matching_column_count
      FROM ALL_TAB_COLUMNS
     WHERE OWNER = 'THE'
       AND TABLE_NAME = 'WASTE_REPORTING_UNIT'
       AND COLUMN_NAME = 'IDEMPOTENCY_KEY'
       AND DATA_TYPE = 'VARCHAR2'
       AND CHAR_USED = 'C'
       AND CHAR_LENGTH = 256;

    IF matching_column_count = 0 THEN
      RAISE_APPLICATION_ERROR(
        -20000,
        'THE.WASTE_REPORTING_UNIT.IDEMPOTENCY_KEY exists with an unexpected definition');
    END IF;
  END IF;
END;
/

DECLARE
  index_count PLS_INTEGER;
  matching_index_count PLS_INTEGER;
  index_column_count PLS_INTEGER;
BEGIN
  SELECT COUNT(*)
    INTO index_count
    FROM ALL_INDEXES
   WHERE OWNER = 'THE'
     AND INDEX_NAME = 'WRU_IDEMPOTENCY_KEY_UK';

  IF index_count = 0 THEN
    EXECUTE IMMEDIATE
      'CREATE UNIQUE INDEX THE.WRU_IDEMPOTENCY_KEY_UK '
      || 'ON THE.WASTE_REPORTING_UNIT (IDEMPOTENCY_KEY) ONLINE';
  ELSE
    SELECT COUNT(*)
      INTO index_column_count
      FROM ALL_IND_COLUMNS
     WHERE INDEX_OWNER = 'THE'
       AND INDEX_NAME = 'WRU_IDEMPOTENCY_KEY_UK';

    SELECT COUNT(*)
      INTO matching_index_count
      FROM ALL_INDEXES index_metadata
      JOIN ALL_IND_COLUMNS column_metadata
        ON column_metadata.INDEX_OWNER = index_metadata.OWNER
       AND column_metadata.INDEX_NAME = index_metadata.INDEX_NAME
     WHERE index_metadata.OWNER = 'THE'
       AND index_metadata.INDEX_NAME = 'WRU_IDEMPOTENCY_KEY_UK'
       AND index_metadata.TABLE_OWNER = 'THE'
       AND index_metadata.TABLE_NAME = 'WASTE_REPORTING_UNIT'
       AND index_metadata.UNIQUENESS = 'UNIQUE'
       AND index_metadata.STATUS = 'VALID'
       AND column_metadata.COLUMN_NAME = 'IDEMPOTENCY_KEY'
       AND column_metadata.COLUMN_POSITION = 1;

    IF matching_index_count != 1 OR index_column_count != 1 THEN
      RAISE_APPLICATION_ERROR(
        -20001,
        'THE.WRU_IDEMPOTENCY_KEY_UK exists but does not match the expected unique index');
    END IF;
  END IF;
END;
/

COMMENT ON COLUMN THE.WASTE_REPORTING_UNIT.IDEMPOTENCY_KEY IS
'Correlates retried reporting-unit creation requests';
