package ca.bc.gov.nrs.hrs.repository;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * QueryConstants is a utility class that holds SQL query fragments and constants used throughout
 * the application for querying reporting units, user information, and district data related to
 * waste assessment and reporting.
 *
 * <p>This class is not meant to be instantiated, hence the private constructor.
 * The constants defined in this class are used in repository classes to fetch data from the
 * database.</p>
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class QueryConstants {

  private static final String PAGINATION = "OFFSET :page ROWS FETCH NEXT :size ROWS ONLY";
  private static final String COUNT = "SELECT COUNT(1) AS total ";
  private static final String COUNT_CTE = "SELECT COUNT(1) OVER() AS total ";

  public static final String SEARCH_USER = """
      SELECT USERID
      FROM (
        SELECT ENTRY_USERID AS USERID FROM WASTE_REPORTING_UNIT
        WHERE
        'NOVALUE' in (:clientNumbers) OR CLIENT_NUMBER IN (:clientNumbers)
      
        UNION
      
        SELECT UPDATE_USERID FROM WASTE_REPORTING_UNIT
        WHERE
        'NOVALUE' in (:clientNumbers) OR CLIENT_NUMBER IN (:clientNumbers)
      )
      WHERE UTL_MATCH.JARO_WINKLER_SIMILARITY(
          REGEXP_SUBSTR(UPPER(USERID), '[^\\]+$'),:userId
        ) >= 90""";

  private static final String MY_DISTRICTS_WAA = """
      SELECT
        REPORTING_UNIT_ID,
        COUNT(*) AS VALID_BLOCK_COUNT,
        MAX(UPDATE_TIMESTAMP) AS WAA_UPDATE
      FROM THE.WASTE_ASSESSMENT_AREA
      WHERE DRAFT_CUT_BLOCK_ID IS NOT NULL
      GROUP BY REPORTING_UNIT_ID""";

  private static final String MY_DISTRICTS_WRU = """
      SELECT
           WRU.CLIENT_NUMBER,
           CASE
             WHEN FC.LEGAL_FIRST_NAME IS NOT NULL AND FC.LEGAL_MIDDLE_NAME IS NOT NULL THEN
               FC.LEGAL_FIRST_NAME || ' ' || FC.LEGAL_MIDDLE_NAME || ' ' || FC.CLIENT_NAME
             WHEN FC.LEGAL_FIRST_NAME IS NOT NULL THEN
               FC.LEGAL_FIRST_NAME || ' ' || FC.CLIENT_NAME
             ELSE
               NVL(FC.LEGAL_FIRST_NAME, '') || NVL(FC.LEGAL_MIDDLE_NAME, '') || FC.CLIENT_NAME
           END AS CLIENT_NAME,
           COUNT(*) AS SUBMISSIONS_COUNT,
           MAX(WRU.UPDATE_TIMESTAMP) AS WRU_UPDATE,
           SUM(COALESCE(VBC.VALID_BLOCK_COUNT, 0)) AS BLOCKS_COUNT,
           MAX(VBC.WAA_UPDATE) AS WAA_UPDATE
         FROM THE.WASTE_REPORTING_UNIT WRU
         LEFT JOIN ValidBlockCounts VBC
           ON WRU.REPORTING_UNIT_ID = VBC.REPORTING_UNIT_ID
         LEFT JOIN FOREST_CLIENT FC
           ON FC.CLIENT_NUMBER = WRU.CLIENT_NUMBER
         WHERE WRU.CLIENT_NUMBER IN (:clientNumbers)
         GROUP BY WRU.CLIENT_NUMBER,
                  CASE
                    WHEN FC.LEGAL_FIRST_NAME IS NOT NULL AND FC.LEGAL_MIDDLE_NAME IS NOT NULL THEN
                      FC.LEGAL_FIRST_NAME || ' ' || FC.LEGAL_MIDDLE_NAME || ' ' || FC.CLIENT_NAME
                    WHEN FC.LEGAL_FIRST_NAME IS NOT NULL THEN
                      FC.LEGAL_FIRST_NAME || ' ' || FC.CLIENT_NAME
                    ELSE
                      NVL(FC.LEGAL_FIRST_NAME, '') || NVL(FC.LEGAL_MIDDLE_NAME, '') || FC.CLIENT_NAME
                  END""";

  private static final String MY_DISTRICTS_MYCLIENTS = """
      SELECT
        COLUMN_VALUE AS client_number,
        NULL AS CLIENT_NAME,
        0 AS submissions_count,
        NULL AS WRU_UPDATE,
        0 AS BLOCKS_COUNT,
        NULL AS WAA_UPDATE
      FROM TABLE(SYS.ODCIVARCHAR2LIST(:clientNumbers))""";

  private static final String MY_DISTRICTS_STATUS = """
      SELECT
        CLIENT_NUMBER,
        CLIENT_NAME,
        MAX(SUBMISSIONS_COUNT) AS SUBMISSIONS_COUNT,
        MAX(BLOCKS_COUNT) AS BLOCKS_COUNT,
        GREATEST(
          COALESCE(MAX(WRU_UPDATE), TO_TIMESTAMP('1900-01-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS')),
          COALESCE(MAX(WAA_UPDATE), TO_TIMESTAMP('1900-01-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS'))
        ) AS LAST_UPDATE
      FROM Together
      GROUP BY CLIENT_NUMBER,
               CLIENT_NAME
      """;

  private static final String MY_DISTRICTS_UNION = """
      SELECT * FROM ClientList
      UNION
      SELECT * FROM ClientStats
      """;

  public static final String MY_DISTRICTS_QUERY =
      "WITH ValidBlockCounts AS (" + MY_DISTRICTS_WAA + "),"
      + "ClientStats AS (" + MY_DISTRICTS_WRU + "),"
      + "ClientList AS (" + MY_DISTRICTS_MYCLIENTS + "),"
      + "Together AS (" + MY_DISTRICTS_UNION + ") "
      + MY_DISTRICTS_STATUS;

  public static final String MY_DISTRICTS_COUNT =
      "WITH ValidBlockCounts AS (" + MY_DISTRICTS_WAA + "),"
      + "ClientStats AS (" + MY_DISTRICTS_WRU + "),"
      + "ClientList AS (" + MY_DISTRICTS_MYCLIENTS + "),"
      + "Together AS (" + MY_DISTRICTS_UNION + ") "
      + "SELECT count(DISTINCT CLIENT_NUMBER) FROM Together";

}