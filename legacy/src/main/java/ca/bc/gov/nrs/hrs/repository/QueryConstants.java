package ca.bc.gov.nrs.hrs.repository;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public class QueryConstants {

  private static final String PAGINATION = "OFFSET :page ROWS FETCH NEXT :size ROWS ONLY";
  private static final String COUNT = "SELECT COUNT(1) AS total ";
  private static final String COUNT_CTE = "SELECT COUNT(1) OVER() AS total ";

  private static final String SEARCH_REPORTING_UNIT_SELECT = """
      SELECT wru.REPORTING_UNIT_ID AS ru_number,
      	COALESCE(waa.CUT_BLOCK_ID,waa.DRAFT_CUT_BLOCK_ID) AS block_id,
      	wru.CLIENT_NUMBER AS client_number,
      	wru.CLIENT_LOCN_CODE  AS client_location,
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
        LEFT JOIN WASTE_SAMPLING_OPTION_CODE wsoc ON wsoc.waste_sampling_option_code = wru.waste_sampling_option_code
        LEFT JOIN WASTE_ASSESSMENT_AREA waa ON waa.REPORTING_UNIT_ID = wru.REPORTING_UNIT_ID
        LEFT JOIN WASTE_ASSESS_AREA_STS_CODE waasc ON waasc.WASTE_ASSESS_AREA_STS_CODE = waa.WASTE_ASSESS_AREA_STS_CODE
        LEFT JOIN ORG_UNIT ou ON ou.ORG_UNIT_NO = wru.ORG_UNIT_NO
      """;

  private static final String SEARCH_REPORTING_UNIT_WHERE = """
      WHERE
        COALESCE(waa.CUT_BLOCK_ID,waa.DRAFT_CUT_BLOCK_ID) IS NOT NULL
      	AND
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
               'NOVALUE' in (:#{#filter.sampling}) OR wru.waste_sampling_option_code IN (:#{#filter.sampling})
           )
         AND (
               'NOVALUE' in (:#{#filter.status}) OR waa.WASTE_ASSESS_AREA_STS_CODE IN (:#{#filter.status})
           )
         AND (
             NVL(:#{#filter.requestUserId},'NOVALUE') = 'NOVALUE' OR wru.ENTRY_USERID = :#{#filter.requestUserId}
           )
         AND (
            (
             NVL(:#{#filter.updateDateStart},'NOVALUE') = 'NOVALUE' AND NVL(:#{#filter.updateDateEnd},'NOVALUE') = 'NOVALUE'
             )
         OR
             (
                 wru.update_timestamp IS NOT NULL AND
                     to_char(wru.update_timestamp, 'YYYY-MM-DD') between :#{#filter.dateStart} AND :#{#filter.dateEnd}
          )
               )
         AND (
             NVL(:#{#filter.licenseeId},'NOVALUE') = 'NOVALUE' OR waa.FOREST_FILE_ID = :#{#filter.licenseeId}
           )
         AND (
             NVL(:#{#filter.cuttingPermitId},'NOVALUE') = 'NOVALUE' OR waa.DRAFT_CUTTING_PERMIT_ID = :#{#filter.cuttingPermitId}
           )
         AND (
             NVL(:#{#filter.timberMark},'NOVALUE') = 'NOVALUE' OR waa.draft_timber_mark = :#{#filter.timberMark}
           )
         AND (
             NVL(:#{#filter.clientLocationCode},'NOVALUE') = 'NOVALUE' OR wru.CLIENT_LOCN_CODE = :#{#filter.clientLocationCode}
           )
         AND (
             NVL(:#{#filter.clientNumber},'NOVALUE') = 'NOVALUE' OR wru.CLIENT_NUMBER = :#{#filter.clientNumber}
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

}
