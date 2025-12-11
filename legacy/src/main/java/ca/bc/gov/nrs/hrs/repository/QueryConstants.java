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
public class QueryConstants {

  private static final String PAGINATION = "OFFSET :page ROWS FETCH NEXT :size ROWS ONLY";
  private static final String COUNT = "SELECT COUNT(1) AS total ";
  private static final String COUNT_CTE = "SELECT COUNT(1) OVER() AS total ";

  private static final String SEARCH_REPORTING_UNIT_SELECT = """
      SELECT wru.REPORTING_UNIT_ID AS ru_number,
        COALESCE(waa.CUT_BLOCK_ID,waa.DRAFT_CUT_BLOCK_ID) AS block_id,
        wru.CLIENT_NUMBER AS client_number,
        waa.FOREST_FILE_ID AS license_number,
        COALESCE(waa.CUTTING_PERMIT_ID, waa.DRAFT_CUTTING_PERMIT_ID) AS cutting_permit,
        COALESCE(waa.TIMBER_MARK, waa.DRAFT_TIMBER_MARK) AS timber_mark,
        CASE WHEN NVL(waa.MULTI_MARK_IND, 'N') = 'N' THEN 0 ELSE 1 END AS multi_mark,
        wru.waste_sampling_option_code AS sampling_code,
        wsoc.DESCRIPTION AS sampling_name,
        ou.ORG_UNIT_CODE AS district_code,
        ou.ORG_UNIT_NAME AS district_name,
        waa.WASTE_ASSESS_AREA_STS_CODE AS status_code,
        waasc.DESCRIPTION AS status_name,
        wru.update_timestamp AS last_updated
      """;

  private static final String SEARCH_REPORTING_UNIT_FROM_JOIN = """
      FROM WASTE_REPORTING_UNIT wru
        LEFT JOIN WASTE_SAMPLING_OPTION_CODE wsoc
        ON wsoc.waste_sampling_option_code = wru.waste_sampling_option_code
        LEFT JOIN WASTE_ASSESSMENT_AREA waa
        ON waa.REPORTING_UNIT_ID = wru.REPORTING_UNIT_ID
        AND COALESCE(waa.CUT_BLOCK_ID, waa.DRAFT_CUT_BLOCK_ID) IS NOT NULL
        LEFT JOIN WASTE_ASSESS_AREA_STS_CODE waasc
        ON waasc.WASTE_ASSESS_AREA_STS_CODE = waa.WASTE_ASSESS_AREA_STS_CODE
        LEFT JOIN ORG_UNIT ou ON ou.ORG_UNIT_NO = wru.ORG_UNIT_NO
      """;

  private static final String SEARCH_REPORTING_UNIT_WHERE = """
      WHERE
         (
            NVL(:#{#filter.mainSearchTerm},'NOVALUE') = 'NOVALUE' OR (
              (
                REGEXP_LIKE(:#{#filter.mainSearchTerm}, '^\\d+$')
                AND wru.REPORTING_UNIT_ID = TO_NUMBER(:#{#filter.mainSearchTerm})
              )
             OR (
                waa.DRAFT_CUT_BLOCK_ID = :#{#filter.mainSearchTerm}
                OR waa.CUT_BLOCK_ID = :#{#filter.mainSearchTerm}
              )
           )
         )
         AND (
               'NOVALUE' in (:#{#filter.district}) OR ou.ORG_UNIT_CODE IN (:#{#filter.district})
           )
         AND (
               'NOVALUE' in (:#{#filter.sampling})
               OR wru.waste_sampling_option_code IN (:#{#filter.sampling})
           )
         AND (
               'NOVALUE' in (:#{#filter.status})
               OR waa.WASTE_ASSESS_AREA_STS_CODE IN (:#{#filter.status})
           )
         AND (
             NVL(:#{#filter.requestUserId},'NOVALUE') = 'NOVALUE'
             OR wru.ENTRY_USERID = :#{#filter.requestUserId}
           )
         AND (
             NVL(:#{#filter.licenseeId},'NOVALUE') = 'NOVALUE'
             OR waa.FOREST_FILE_ID = :#{#filter.licenseeId}
           )
         AND (
             NVL(:#{#filter.cuttingPermitId},'NOVALUE') = 'NOVALUE'
             OR waa.DRAFT_CUTTING_PERMIT_ID = :#{#filter.cuttingPermitId}
           )
         AND (
             NVL(:#{#filter.timberMark},'NOVALUE') = 'NOVALUE'
             OR waa.draft_timber_mark = :#{#filter.timberMark}
           )
         AND (
             'NOVALUE' in (:#{#filter.clientNumbers})
             OR wru.CLIENT_NUMBER IN (:#{#filter.clientNumbers})
           )
         AND (
            (
              NVL(:#{#filter.dateStart},'NOVALUE') = 'NOVALUE'
              AND NVL(:#{#filter.dateEnd},'NOVALUE') = 'NOVALUE'
            )
            OR
            (
              wru.update_timestamp IS NOT NULL AND
              TO_DATE(to_char(wru.update_timestamp, 'YYYY-MM-DD'),'YYYY-MM-DD')
              between TO_DATE(:#{#filter.updateDateStart},'YYYY-MM-DD')
              AND TO_DATE(:#{#filter.updateDateEnd},'YYYY-MM-DD')
            )
         )
         AND (
          NVL(:#{#filter.multiMark}, 0) = 0
          OR (NVL(:#{#filter.multiMark}, 0) = 1 AND waa.MULTI_MARK_IND = 'Y')
         )
      """;

  public static final String SEARCH_REPORTING_UNIT_QUERY =
      SEARCH_REPORTING_UNIT_SELECT
      + SEARCH_REPORTING_UNIT_FROM_JOIN
      + SEARCH_REPORTING_UNIT_WHERE;

  public static final String SEARCH_REPORTING_UNIT_COUNT =
      "WITH DistinctResults AS ("
      + SEARCH_REPORTING_UNIT_SELECT
      + SEARCH_REPORTING_UNIT_FROM_JOIN
      + SEARCH_REPORTING_UNIT_WHERE
      + ") SELECT COUNT(1) OVER () AS total FROM DistinctResults ";

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
      WHERE UTL_MATCH.JARO_WINKLER_SIMILARITY(REGEXP_SUBSTR(USERID, '[^\\]+$'),:userId) >= 90""";

  public static final String MY_DISTRICTS_WAA = """
      SELECT
        REPORTING_UNIT_ID,
        COUNT(*) AS VALID_BLOCK_COUNT,
        MAX(UPDATE_TIMESTAMP) AS WAA_UPDATE
      FROM THE.WASTE_ASSESSMENT_AREA
      WHERE DRAFT_CUT_BLOCK_ID IS NOT NULL
      GROUP BY REPORTING_UNIT_ID""";

  public static final String MY_DISTRICTS_WRU = """
      SELECT
           WRU.CLIENT_NUMBER,
           COUNT(*) AS SUBMISSIONS_COUNT,
           MAX(WRU.UPDATE_TIMESTAMP) AS WRU_UPDATE,
           SUM(COALESCE(VBC.VALID_BLOCK_COUNT, 0)) AS BLOCKS_COUNT,
           MAX(VBC.WAA_UPDATE) AS WAA_UPDATE
         FROM THE.WASTE_REPORTING_UNIT WRU
         LEFT JOIN ValidBlockCounts VBC
           ON WRU.REPORTING_UNIT_ID = VBC.REPORTING_UNIT_ID
         WHERE WRU.CLIENT_NUMBER IN (:clientNumbers)
         GROUP BY WRU.CLIENT_NUMBER""";

  public static final String MY_DISTRICTS_MYCLIENTS = """
      SELECT
        COLUMN_VALUE AS client_number,
        0 AS submissions_count,
        NULL AS WRU_UPDATE,
        0 AS BLOCKS_COUNT,
        NULL AS WAA_UPDATE
      FROM TABLE(SYS.ODCIVARCHAR2LIST(:clientNumbers))""";

  public static final String MY_DISTRICTS_STATUS = """
      SELECT
        CLIENT_NUMBER,
        MAX(SUBMISSIONS_COUNT) AS SUBMISSIONS_COUNT,
        MAX(BLOCKS_COUNT) AS BLOCKS_COUNT,
        GREATEST(
          COALESCE(MAX(WRU_UPDATE), TO_TIMESTAMP('1900-01-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS')),
          COALESCE(MAX(WAA_UPDATE), TO_TIMESTAMP('1900-01-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS'))
        ) AS LAST_UPDATE
      FROM Together
      GROUP BY CLIENT_NUMBER
      """;

  public static final String MY_DISTRICTS_UNION = """
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
