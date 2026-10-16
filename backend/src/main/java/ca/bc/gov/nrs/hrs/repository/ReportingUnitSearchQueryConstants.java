package ca.bc.gov.nrs.hrs.repository;

import java.util.Map;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * Native PostgreSQL query constants for the reporting-unit search source (issue #1238, D3b).
 *
 * <p>Implements the validated {@code postgres-v0-query-spec.md} (§1 list, §2 count, §4 sort,
 * §5 binding contract) as frozen by DEC-014 (row shape), DEC-015 (filter policy — silent ignore)
 * and DEC-016 (row values), with the legacy parameter shape: parameters reference the bound
 * filter object via SpEL ({@code :#{#filter.district}}), exactly like the legacy
 * {@code ReportingUnitQueryConstants}.
 *
 * <p>Sentinel semantics ({@code 'NOVALUE'} / {@code -1}) are FILTER-NEUTRALIZATION values only,
 * NEVER authorization. Client scope is derived from the JWT (DEC-008) before the filter is
 * built; the filter getters normalize absent filters to the sentinels, so every predicate's
 * neutralization disjunct is value-based and no {@code IS NULL} guard is needed (an untyped-null
 * bind would also fail PostgreSQL prepare). A bound {@code 'NOVALUE'} must never be treated as
 * an authorization grant anywhere in the PG provider.
 *
 * <p>Never string-interpolate filter values into these statements — planner constant-folds the
 * dead bigint cast of the {@code mainSearchTerm} CASE for literals; bind parameters only.
 * Deliberately, the SQL text below carries NO comments: Spring Data's native-query sort
 * application regex-scans the raw statement for join/function/field aliases, and comment text
 * can pollute that extraction (observed live: a comment containing "JWT (" produced a phantom
 * alias and mangled every ORDER BY fragment) — the ruling lives in this Javadoc instead.
 *
 * <p>The SELECT aliases are quoted camelCase so the provider's {@code Tuple} row mapping
 * resolves each alias by name (same alias-quoting convention as {@code BlockRepository}); the
 * underlying columns/expressions are byte-identical to the spec. The ORDER BY is not part of the
 * constants: the provider maps the Pageable sort through {@link #SORT_EXPRESSIONS} and always
 * appends the deterministic tie-breakers ({@link #TIE_BREAKER_RU_NUMBER}, {@link
 * #TIE_BREAKER_BLOCK_ID}), per spec §4 — the legacy {@code PaginationUtil} mechanism.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ReportingUnitSearchQueryConstants {

  /** Sentinel client number that neutralizes the client filter (legacy DTO-getter parity). */
  public static final String SENTINEL_NOVALUE = "NOVALUE";

  /** Sentinel reporting-unit id that neutralizes the reportingUnitIds filter (legacy parity). */
  public static final Long SENTINEL_REPORTING_UNIT = -1L;

  /**
   * Shared row-selection fragment: FROM/joins/WHERE used by BOTH the list and the count
   * statement so they can never drift (spec §2/§7-Q8). Every join, filter, and soft-delete
   * guard here is byte-identical between the two statements.
   *
   * <p>MECHANICAL ADJUSTMENT vs the spec's §1 text (forced by the SpEL/@Query migration, issue
   * #1238): the PRIMARY-mark and latest-status selections use NOT-EXISTS row-comparison joins
   * instead of {@code LEFT JOIN LATERAL (... ORDER BY ... LIMIT 1)}. Spring Data's native-query
   * sort application counts {@code order by} occurrences and appends the Pageable sort with a
   * bare comma (instead of the keyword) whenever the parenthesized-subselect count does not
   * exceed the plain count — a greedy pattern that can never exceed 1, so ANY query with two or
   * more parenthesized order-bys (both laterals) is broken. Row comparison is semantically
   * identical: the PRIMARY mark is the live {@code PRIMARY} mark with the lowest {@code
   * (sequence_no, block_mark_id)}; the status is the event with the latest {@code (created_at,
   * status_event_id)}. Both ride the same partial indexes the laterals used.
   */
  private static final String SEARCH_ROWS_FRAGMENT =
      """
          from hrs.reporting_unit ru
          left join hrs.block b
                 on b.reporting_unit_id = ru.reporting_unit_id
                and b.is_deleted = false
          left join hrs.block_mark pm
                 on pm.block_id = b.block_id
                and pm.mark_type = 'PRIMARY'
                and pm.is_deleted = false
                and not exists (
                        select 1
                        from hrs.block_mark bmx
                        where bmx.block_id = pm.block_id
                          and bmx.mark_type = 'PRIMARY'
                          and bmx.is_deleted = false
                          and (bmx.sequence_no, bmx.block_mark_id)
                                < (pm.sequence_no, pm.block_mark_id)
                    )
          left join hrs.status_event se
                 on se.reporting_unit_id = ru.reporting_unit_id
                and not exists (
                        select 1
                        from hrs.status_event sex
                        where sex.reporting_unit_id = se.reporting_unit_id
                          and (sex.created_at, sex.status_event_id)
                                > (se.created_at, se.status_event_id)
                    )
          where ru.is_deleted = false
            and ('NOVALUE' in (:#{#filter.district})
                 or ru.org_unit_no in (:#{#filter.district}))
            and ('NOVALUE' in (:#{#filter.clientNumbers})
                 or ru.client_number in (:#{#filter.clientNumbers}))
            and (-1 in (:#{#filter.reportingUnitIds})
                 or ru.reporting_unit_id in (:#{#filter.reportingUnitIds}))
            and (:#{#filter.mainSearchTerm} = 'NOVALUE'
                 or case
                      when :#{#filter.mainSearchTerm} ~ '^[0-9]+$'
                      then ru.reporting_unit_id
                             = cast(:#{#filter.mainSearchTerm} as bigint)
                      else true
                    end)
            and (:#{#filter.licenseeId} = 'NOVALUE'
                 or upper(pm.forest_file_id) = :#{#filter.licenseeId})
            and (:#{#filter.cuttingPermitId} = 'NOVALUE'
                 or upper(pm.cutting_permit_id) = :#{#filter.cuttingPermitId})
            and (:#{#filter.timberMark} = 'NOVALUE'
                 or upper(pm.timber_mark) = :#{#filter.timberMark})
          """;

  /**
   * LIST query: one row per live block; a null-extended RU-only row when the RU has no live
   * blocks (DEC-014). {@code wasteAssessmentAreaId} is deliberately NULL on every PG row.
   * Sampling is the fixed {@code AVG/Average} constant; {@code multiMark}/{@code secondaryEntry}
   * are no-source {@code false} placeholders (DEC-016); descriptions are NULL until D5 lookup
   * enrichment. No ORDER BY here — the provider supplies the mapped sort plus tie-breakers.
   */
  public static final String SEARCH_REPORTING_UNIT_QUERY =
      """
          select
              ru.reporting_unit_id                          as "ruNumber",
              b.block_id                                    as "blockId",
              cast(null as bigint)                          as "wasteAssessmentAreaId",
              pm.cut_block_id                               as "cutBlockId",
              ru.client_number                              as "clientCode",
              cast(null as text)                            as "clientName",
              pm.forest_file_id                             as "licenseNumber",
              nullif(btrim(pm.cutting_permit_id), '')       as "cuttingPermit",
              pm.timber_mark                                as "timberMark",
              false                                         as "multiMark",
              false                                         as "secondaryEntry",
              'AVG'                                         as "samplingCode",
              'Average'                                     as "samplingName",
              ru.org_unit_no                                as "districtCode",
              cast(null as text)                            as "districtName",
              se.status                                     as "statusCode",
              cast(null as text)                            as "statusName",
              ru.updated_at                                 as "lastUpdated"
          """
          + SEARCH_ROWS_FRAGMENT;

  /**
   * COUNT query over the exact same row set as the LIST query (one per live block + RU-only
   * rows) — counts this spec's rows, replacing legacy's joined-row count. Reduced inner
   * projection; joins/filters byte-identical to the list fragment.
   */
  public static final String SEARCH_REPORTING_UNIT_COUNT =
      """
          select count(*) as total
          from (
                   select ru.reporting_unit_id as ru_number
          """
          + SEARCH_ROWS_FRAGMENT
          + """
                   ) search_rows
          """;

  /** Default sort expression (spec §4: {@code lastUpdated} DESC from {@code @PageableDefault}). */
  public static final String DEFAULT_SORT_EXPRESSION = "ru.updated_at";

  /** Deterministic paging tie-breaker, always appended ASC (spec §4): the RU number. */
  public static final String TIE_BREAKER_RU_NUMBER = "ru.reporting_unit_id";

  /**
   * Deterministic paging tie-breaker, always appended ASC (spec §4): the block id. NULL on
   * RU-only rows; PostgreSQL ASC orders NULLs last.
   */
  public static final String TIE_BREAKER_BLOCK_ID = "b.block_id";

  /**
   * Sort-key allowlist: client-visible sort field → fixed ORDER BY expression (spec §4; legacy
   * {@code ServiceConstants.SORT_FIELDS} parity). The PG sort is expression-based (input
   * columns / lateral aliases), independent of the camelCase output aliases used for Tuple
   * mapping. {@code cuttingPermit} sorts the trimmed/blank-to-null output expression, mirroring
   * legacy's alias-sort note.
   *
   * <p>Degenerate PG sort keys ({@code wasteAssessmentAreaId} — constant NULL; {@code sampling},
   * {@code sampling.code}, {@code sampling.description} — constant {@code 'AVG'}) are
   * deliberately ABSENT from this map and therefore rejected (HTTP 428) as unsupported on the PG
   * source; unknown keys are rejected the same way (legacy reject parity).
   */
  public static final Map<String, String> SORT_EXPRESSIONS =
      Map.ofEntries(
          Map.entry("ruNumber", "ru.reporting_unit_id"),
          Map.entry("cutBlockId", "pm.cut_block_id"),
          Map.entry("client.code", "ru.client_number"),
          Map.entry("district", "ru.org_unit_no"),
          Map.entry("district.code", "ru.org_unit_no"),
          Map.entry("district.description", "ru.org_unit_no"),
          Map.entry("status", "se.status"),
          Map.entry("status.code", "se.status"),
          Map.entry("status.description", "se.status"),
          Map.entry("lastUpdated", "ru.updated_at"),
          Map.entry("licenseNumber", "pm.forest_file_id"),
          Map.entry("cuttingPermit", "nullif(btrim(pm.cutting_permit_id), '')"),
          Map.entry("timberMark", "pm.timber_mark"));
}
