package ca.bc.gov.nrs.hrs.repository;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * ReportingUnitQueryConstants is a utility class that holds SQL query fragments
 * and constants used throughout the application for querying reporting units.
 *
 * <p>This class is not meant to be instantiated, hence the private constructor.
 * The constants defined in this class are used in repository classes to fetch data from the
 * database.</p>
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ReportingUnitQueryConstants {

  private static final String SEARCH_REPORTING_UNIT_SELECT = """
      SELECT
      wru.REPORTING_UNIT_ID AS ru_number,
      waa.WASTE_ASSESSMENT_AREA_ID AS waste_assessment_area_id,
      COALESCE(waa.CUT_BLOCK_ID, waa.DRAFT_CUT_BLOCK_ID) AS cut_block_id,
      wru.CLIENT_NUMBER AS client_number,
      waa.FOREST_FILE_ID AS license_number,
      NULLIF(TRIM(COALESCE(waa.CUTTING_PERMIT_ID, waa.DRAFT_CUTTING_PERMIT_ID)),'') AS cutting_permit,
      COALESCE(waa.TIMBER_MARK, waa.DRAFT_TIMBER_MARK) AS timber_mark,
      CASE WHEN NVL(waa.MULTI_MARK_IND, 'N') = 'N' THEN 0 ELSE 1 END AS multi_mark,
      CASE WHEN waa.PARENT_WAA_ID IS NOT NULL THEN 1 ELSE 0 END AS secondary_entry,
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
      LEFT JOIN WASTE_ASSESS_AREA_STS_CODE waasc
        ON waasc.WASTE_ASSESS_AREA_STS_CODE = waa.WASTE_ASSESS_AREA_STS_CODE
      LEFT JOIN ORG_UNIT ou
        ON ou.ORG_UNIT_NO = wru.ORG_UNIT_NO
      """;

  private static final String SEARCH_REPORTING_UNIT_WHERE = """
      WHERE
        (
          waa.PARENT_WAA_ID IS NULL
          OR
          (waa.PARENT_WAA_ID IS NOT NULL AND NVL(waa.CHILD_BLOCK_IND, 'N') = 'Y')
        )
        AND
        (
          NVL(:#{#filter.mainSearchTerm}, 'NOVALUE') = 'NOVALUE'
          OR (
            (
              REGEXP_LIKE(:#{#filter.mainSearchTerm}, '^\\d+$')
              AND wru.REPORTING_UNIT_ID = TO_NUMBER(:#{#filter.mainSearchTerm})
            )
            OR (
              UPPER(waa.DRAFT_CUT_BLOCK_ID) = :#{#filter.mainSearchTerm}
              OR UPPER(waa.CUT_BLOCK_ID) = :#{#filter.mainSearchTerm}
            )
          )
        )
        AND (
          'NOVALUE' IN (:#{#filter.district})
          OR ou.ORG_UNIT_CODE IN (:#{#filter.district})
        )
        AND (
          'NOVALUE' IN (:#{#filter.sampling})
          OR wru.waste_sampling_option_code IN (:#{#filter.sampling})
        )
        AND (
          'NOVALUE' IN (:#{#filter.status})
          OR waa.WASTE_ASSESS_AREA_STS_CODE IN (:#{#filter.status})
        )
        AND (
          NVL(:#{#filter.requestUserId}, 'NOVALUE') = 'NOVALUE'
          OR UPPER(waa.ENTRY_USERID) = :#{#filter.requestUserId}
        )
        AND (
          NVL(:#{#filter.licenseeId}, 'NOVALUE') = 'NOVALUE'
          OR UPPER(waa.FOREST_FILE_ID) = :#{#filter.licenseeId}
        )
        AND (
          NVL(:#{#filter.cuttingPermitId}, 'NOVALUE') = 'NOVALUE'
          OR (
            UPPER(waa.DRAFT_CUTTING_PERMIT_ID) = :#{#filter.cuttingPermitId}
            OR UPPER(waa.CUTTING_PERMIT_ID) = :#{#filter.cuttingPermitId}
          )
        )
        AND (
          NVL(:#{#filter.timberMark}, 'NOVALUE') = 'NOVALUE'
          OR (
            UPPER(waa.draft_timber_mark) = :#{#filter.timberMark}
            OR UPPER(waa.timber_mark) = :#{#filter.timberMark}
            OR (
                EXISTS (
                  SELECT 1 FROM WASTE_ASSESSMENT_AREA waa_child
                  WHERE waa_child.parent_waa_id = waa.waste_assessment_area_id
                  AND (
                    UPPER(waa_child.draft_timber_mark) = :#{#filter.timberMark}
                    OR UPPER(waa_child.TIMBER_MARK) = :#{#filter.timberMark}
                  )
                )
            )
          )
        )
        AND (
          'NOVALUE' IN (:#{#filter.clientNumbers})
          OR wru.CLIENT_NUMBER IN (:#{#filter.clientNumbers})
        )
        AND (
          (:#{#filter.dateStart} = 'NOVALUE'
            OR TRUNC(wru.update_timestamp) >=
                TO_DATE(:#{#filter.dateStart}, 'YYYY-MM-DD'))
          AND (:#{#filter.dateEnd} = 'NOVALUE'
            OR TRUNC(wru.update_timestamp) <=
                TO_DATE(:#{#filter.dateEnd}, 'YYYY-MM-DD'))
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

  private static final String GET_BLOCK_COUNT = """
      SELECT
        COUNT(1) AS TOTAL_BLOCKS,
        waa.REPORTING_UNIT_ID AS RU_ID
      FROM WASTE_ASSESSMENT_AREA waa
      WHERE waa.REPORTING_UNIT_ID = :reportingUnit
        AND (
          waa.PARENT_WAA_ID IS NULL
          OR (
            waa.PARENT_WAA_ID IS NOT NULL AND NVL(waa.CHILD_BLOCK_IND, 'N') = 'Y'
          )
        )
      GROUP BY waa.REPORTING_UNIT_ID
      """;

  private static final String GET_CHILD_COUNT = """
      SELECT
        COUNT(1) AS TOTAL_CHILDS,
        child.REPORTING_UNIT_ID AS RU_ID
      FROM WASTE_ASSESSMENT_AREA child
      JOIN WASTE_ASSESSMENT_AREA parent
        ON parent.WASTE_ASSESSMENT_AREA_ID = child.PARENT_WAA_ID
      WHERE child.REPORTING_UNIT_ID = :reportingUnit
        AND child.PARENT_WAA_ID = :wasteAssessmentAreaId
        AND NVL(parent.MULTI_MARK_IND, 'N') = 'Y'
        AND NVL(child.CHILD_BLOCK_IND, 'N') = 'N'
      GROUP BY child.REPORTING_UNIT_ID
      """;

  private static final String GET_BLOCK_COMMENT_LATEST = """
      SELECT
        aud.waste_assessment_area_audit_id AS audit_id,
        aud.waste_assessment_area_id AS waste_assessment_area_id,
        aud.WASTE_COMMENT
      FROM waste_assess_area_sts_audit aud
      LEFT JOIN waste_assessment_area wa
        ON wa.waste_assessment_area_id = aud.waste_assessment_area_id
      WHERE aud.update_userid != 'WAA_COMMENT_CONVERSION'
        AND aud.waste_assessment_area_id = :wasteAssessmentAreaId
      ORDER BY aud.ENTRY_TIMESTAMP DESC
      FETCH FIRST 1 ROW ONLY
      """;

  private static final String GET_BLOCK_ATTACHMENT_LATEST = """
      SELECT
        wasm.WASTE_ASSESSMENT_SURVEY_MAP_ID AS attachment_id,
        wasm.WASTE_ASSESSMENT_AREA_ID AS waste_assessment_area_id,
        wasm.SURVEY_MAP_DOCUMENT_NAME AS attachment_name
      FROM WASTE_ASSESSMENT_SURVEY_MAP wasm
      WHERE wasm.WASTE_ASSESSMENT_AREA_ID = :wasteAssessmentAreaId
      ORDER BY wasm.ENTRY_TIMESTAMP DESC
      FETCH FIRST 1 ROW ONLY
      """;

  private static final String GET_BLOCK_SECONDARY_MARK = """
      SELECT
        parent_id,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'mark'   VALUE mark,
            'status' VALUE JSON_OBJECT( 'code' VALUE status, 'description' VALUE description ),
            'area'   VALUE area
          )
          ORDER BY mark
        ) AS secondary_mark
      FROM (
        SELECT DISTINCT
          waa.PARENT_WAA_ID AS parent_id,
          NULLIF(TRIM(COALESCE(waa.TIMBER_MARK, waa.DRAFT_TIMBER_MARK)), '') AS mark,
          waa.WASTE_ASSESS_AREA_STS_CODE AS status,
          waasc.DESCRIPTION AS description,
          waa.WASTE_NET_AREA AS area
        FROM WASTE_ASSESSMENT_AREA waa
        LEFT JOIN WASTE_ASSESS_AREA_STS_CODE waasc
          ON waasc.WASTE_ASSESS_AREA_STS_CODE = waa.WASTE_ASSESS_AREA_STS_CODE
        LEFT JOIN WASTE_ASSESSMENT_AREA waap
          ON waap.WASTE_ASSESSMENT_AREA_ID = waa.PARENT_WAA_ID
        WHERE waa.PARENT_WAA_ID = :wasteAssessmentAreaId
          AND NVL(waap.MULTI_MARK_IND, 'N') = 'Y'
          AND NVL(waa.CHILD_BLOCK_IND, 'N') = 'N'
        )
      GROUP BY parent_id
      """;

  private static final String GET_SEARCH_BLOCK_EXPANDED = """
      SELECT
        waa.WASTE_ASSESSMENT_AREA_ID AS id,
        waa.FOREST_FILE_ID AS license_no,
        COALESCE(waa.CUTTING_PERMIT_ID, waa.DRAFT_CUTTING_PERMIT_ID) AS cutting_permit,
        COALESCE(waa.TIMBER_MARK, waa.DRAFT_TIMBER_MARK) AS timber_mark,
        CASE
          WHEN NVL(waa.CHILD_BLOCK_IND, 'N') = 'Y'
            AND waa.PARENT_WAA_ID IS NOT NULL THEN 1
          ELSE 0
        END AS exempted,
        CASE WHEN NVL(waa.MULTI_MARK_IND, 'N') = 'N' THEN 0 ELSE 1 END AS multi_mark,
        TO_CHAR(waa.waste_net_area, '999.99') AS net_area,
        TO_CHAR (waa.mark_area, '999.99') AS mark_area,
        waa.waste_assess_area_sts_code AS status_code,
        waasc.description AS status_name,
        waa.ENTRY_USERID AS submitter,
        ac.attachment_id AS attachment_id,
        ac.attachment_name AS attachment_name,
        c.WASTE_COMMENT AS comments,
        bc.TOTAL_BLOCKS AS total_block_count,
        cc.TOTAL_CHILDS AS total_child_count,
        cv.secondary_mark AS secondary
      FROM WASTE_ASSESSMENT_AREA waa
      LEFT JOIN BlockCount bc ON bc.RU_ID = waa.REPORTING_UNIT_ID
      LEFT JOIN ChildCount cc ON cc.RU_ID = waa.REPORTING_UNIT_ID
      LEFT JOIN CommentsAudit c ON c.waste_assessment_area_id = waa.WASTE_ASSESSMENT_AREA_ID
      LEFT JOIN AttachmentContent ac ON ac.waste_assessment_area_id = waa.WASTE_ASSESSMENT_AREA_ID
      LEFT JOIN ChildValues cv ON cv.parent_id = waa.WASTE_ASSESSMENT_AREA_ID
      LEFT JOIN WASTE_ASSESS_AREA_STS_CODE waasc
        ON waasc.WASTE_ASSESS_AREA_STS_CODE = waa.WASTE_ASSESS_AREA_STS_CODE
      WHERE waa.REPORTING_UNIT_ID = :reportingUnit
        AND waa.WASTE_ASSESSMENT_AREA_ID = :wasteAssessmentAreaId
      """;

  public static final String GET_SEARCH_BLOCK_EXPANDED_CONTENT =
      "WITH BlockCount AS (" + GET_BLOCK_COUNT + "), "
      + "ChildCount AS (" + GET_CHILD_COUNT + "), "
      + "CommentsAudit AS (" + GET_BLOCK_COMMENT_LATEST + "), "
      + "AttachmentContent AS (" + GET_BLOCK_ATTACHMENT_LATEST + "), "
      + "ChildValues AS (" + GET_BLOCK_SECONDARY_MARK + ") "
      + GET_SEARCH_BLOCK_EXPANDED;
}