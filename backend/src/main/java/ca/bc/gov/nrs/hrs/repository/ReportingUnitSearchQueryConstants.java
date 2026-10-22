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
    *
    * <p>Status source (supersedes the A-14 no-op note of 2026-10-19): the row status is the
    * BLOCK's status — the block-scoped latest {@code status_event.status} normalised through the
    * same long-form aliases as {@code ReportingUnitBlockService.resolveStatus}, falling back to
    * {@code DFT/Draft} when the block has no events (the established convention: a block without
    * status history is a draft), and falling back to {@code block.status_code} once the lifecycle
    * starts writing it. The description comes from the local {@code hrs.waa_status_code} table
    * ({@code 'Draft'} fallback for unmapped codes, again mirroring {@code resolveStatus}).
    * RU-only rows carry no block and therefore no status (rendered "Not applicable").
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
          left join lateral (
                  select se3.status
                  from hrs.status_event se3
                  where se3.block_id = b.block_id
                  order by se3.created_at desc, se3.status_event_id desc
                  limit 1
              ) evs on true
          left join lateral (
                  select case
                             when b.block_id is null then null
                             else coalesce(
                                      case upper(nullif(btrim(coalesce(evs.status, '')), ''))
                                          when 'DRAFT' then 'DFT'
                                          when 'SUBMITTED' then 'SUB'
                                          when 'APPROVED' then 'APP'
                                          else upper(nullif(btrim(coalesce(evs.status, '')), ''))
                                      end,
                                      'DFT')
                         end as code
              ) st on true
          left join hrs.waa_status_code wcs
                 on wcs.code = st.code
          where ru.is_deleted = false
            and ('NOVALUE' in (:#{#filter.district})
                 or ru.geographic_code in (:#{#filter.district}))
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
   * blocks (DEC-014). {@code wasteAssessmentAreaId} is the legacy WAA identity, which maps 1:1 to
   * the exploded {@code hrs.block.block_id} — so it equals {@code blockId} on block rows and is
   * NULL on RU-only rows (the faithful analog of the legacy no-WAA left-join row). Sampling is the
   * fixed {@code AVG/Average} constant; {@code multiMark} AND {@code secondaryEntry} are DERIVED
   * the same way (existence of a live {@code SECONDARY} mark — HRS has no stored multi-mark flag
   * and no parent/child block hierarchy, so the product decision redefined HRS {@code
   * secondaryEntry} as a {@code SECONDARY} mark; both flags therefore carry the same value on
   * PostgreSQL rows, and the former DEC-016 no-source {@code false} placeholder no longer
   * applies); the row status is the BLOCK's ({@code st.code}/{@code wcs.description} — see the
   * fragment Javadoc; {@code DFT/Draft} fallback mirrors {@code ReportingUnitBlockService
   * .resolveStatus}); district descriptions are NULL until D5 lookup enrichment.
   * No ORDER BY here — the provider supplies the mapped sort plus tie-breakers.
   */
  public static final String SEARCH_REPORTING_UNIT_QUERY =
      """
          select
              ru.reporting_unit_id                          as "ruNumber",
              b.block_id                                    as "blockId",
              b.block_id                                    as "wasteAssessmentAreaId",
              pm.cut_block_id                               as "cutBlockId",
              ru.client_number                              as "clientCode",
              cast(null as text)                            as "clientName",
              pm.forest_file_id                             as "licenseNumber",
              nullif(btrim(pm.cutting_permit_id), '')       as "cuttingPermit",
              pm.timber_mark                                as "timberMark",
              exists (
                      select 1
                      from hrs.block_mark bm
                      where bm.block_id = b.block_id
                        and bm.mark_type = 'SECONDARY'
                        and bm.is_deleted = false
                  )                                         as "multiMark",
              exists (
                      select 1
                      from hrs.block_mark bm
                      where bm.block_id = b.block_id
                        and bm.mark_type = 'SECONDARY'
                        and bm.is_deleted = false
                  )                                         as "secondaryEntry",
              'AVG'                                         as "samplingCode",
              'Average'                                     as "samplingName",
              ru.geographic_code                            as "districtCode",
              cast(null as text)                            as "districtName",
              st.code                                       as "statusCode",
              wcs.description                               as "statusName",
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

  /**
   * EXPANDED query: a single row for the selected {@code (reportingUnitId, blockId)} — the
   * PostgreSQL analog of the legacy Oracle {@code GET_SEARCH_BLOCK_EXPANDED_CONTENT} (issue #1238,
   * expanded search). Keyed by {@code (reportingUnitId, blockId)} because the legacy WAA identity
   * maps 1:1 onto the exploded {@code hrs.block.block_id}: {@code id} projects {@code block_id}.
   *
   * <p>Field aliases mirror the legacy {@code ReportingUnitSearchExpandedProjection} getters so a
   * legacy-equivalent mapper can consume the row unchanged. {@code licenseNo/cuttingPermit/
   * timberMark} come from the PRIMARY mark (the lowest live {@code (sequence_no, block_mark_id)},
   * the same convention as {@link #SEARCH_REPORTING_UNIT_QUERY}); {@code submitter} is the first
   * live {@code block_submitter.submitter_name}; {@code statusCode} is the BLOCK's status — the
   * block-scoped latest {@code status_event.status} ({@code status_event.block_id = b.block_id})
   * normalised through the same long-form aliases with the {@code DFT/Draft} fallback as the
   * list-row badge (see the {@link #SEARCH_ROWS_FRAGMENT} Javadoc), so the row and its expanded
   * panel can never disagree (supersedes the DEC-018 RU-scoped selection and the A-14 no-op note:
   * {@code hrs.status_event} is still an append-only table with no production writer, so rows fall
   * back to {@code DFT/Draft} until the lifecycle starts writing events); {@code statusName} comes
   * from the local {@code hrs.waa_status_code} table ({@code null} when the resolved code has no
   * description row); {@code attachmentId/attachmentName} are the latest live {@code
   * block_attachment} narrowed to the finalized survey map ({@code document_type = 'FINAL_MAP' AND
   * status = 'FINALIZED'}, the HRS analog of the legacy {@code WASTE_ASSESSMENT_SURVEY_MAP}
   * attachment); {@code comments} is the latest live {@code block_comment.comment}; {@code
   * totalBlockCount} counts the RU's live blocks and {@code totalChildCount} the block's live
   * {@code SECONDARY} marks; {@code netArea} is the SUM of the block's live {@code
   * block_area_segment.net_waste_area_ha}; {@code secondary} is a JSON-array text of the live
   * {@code SECONDARY} marks ({@code [{"mark","status","area"}]}, rendered as {@code '[]'} when
   * none), mirroring the legacy mapper's {@code parseSecondaryJson(String)}.
   *
   * <p>STRUCTURAL GAPS versus the legacy model are returned as NULL/0 rather than fabricated (see
   * the {@code v1-gap-register}): {@code markArea} — no HRS mark-area column ({@code null});
   * {@code exempted} — no child-block/parent-WAA flag ({@code false}); the per-mark {@code status}
   * and {@code area} elements inside {@code secondary} — no HRS source (nulls); and {@code
   * multiMark} is DERIVED (existence of a live {@code SECONDARY} mark) rather than a stored flag.
   *
   * <p>MUST NOT be given a Pageable/Spring Data sort: unlike the list query this statement keeps
   * {@code ORDER BY ... LIMIT} sub-selects (the {@code BlockRepository} precedent) and is safe only
   * because no sort is applied to it.
   */
  public static final String SEARCH_REPORTING_UNIT_EXPANDED_QUERY =
      """
          select
              b.block_id                                   as "id",
              pm.forest_file_id                            as "licenseNo",
              pm.cutting_permit_id                         as "cuttingPermit",
              pm.timber_mark                               as "timberMark",
              false                                        as "exempted",
              exists (
                      select 1
                      from hrs.block_mark bm
                      where bm.block_id = b.block_id
                        and bm.mark_type = 'SECONDARY'
                        and bm.is_deleted = false
                  )                                        as "multiMark",
              (select coalesce(sum(bas.net_waste_area_ha), 0)
                 from hrs.block_area_segment bas
                where bas.block_id = b.block_id
                  and bas.is_deleted = false)              as "netArea",
              cast(null as numeric)                        as "markArea",
              sub.submitter_name                           as "submitter",
              att.block_attachment_id                      as "attachmentId",
              att.file_name                                as "attachmentName",
              cmt.comment                                  as "comments",
              (select count(*)
                 from hrs.block b2
                where b2.reporting_unit_id = b.reporting_unit_id
                  and b2.is_deleted = false)               as "totalBlockCount",
              (select count(*)
                 from hrs.block_mark bm
                where bm.block_id = b.block_id
                  and bm.mark_type = 'SECONDARY'
                  and bm.is_deleted = false)               as "totalChildCount",
              st.code                                      as "statusCode",
              wcs.description                              as "statusName",
              (select coalesce(
                          jsonb_agg(
                              jsonb_build_object(
                                  'mark', nullif(btrim(bm.timber_mark), ''),
                                  'status', jsonb_build_object('code', null, 'description', null),
                                  'area', null)
                              order by nullif(btrim(bm.timber_mark), '')),
                          '[]'::jsonb)::text
                 from hrs.block_mark bm
                where bm.block_id = b.block_id
                  and bm.mark_type = 'SECONDARY'
                  and bm.is_deleted = false)               as "secondary"
          from hrs.block b
          left join lateral (
              select bm2.forest_file_id, bm2.cutting_permit_id, bm2.timber_mark
              from hrs.block_mark bm2
              where bm2.block_id = b.block_id
                and bm2.mark_type = 'PRIMARY'
                and bm2.is_deleted = false
              order by bm2.sequence_no, bm2.block_mark_id
              limit 1
          ) pm on true
          left join lateral (
              select se3.status
              from hrs.status_event se3
              where se3.block_id = b.block_id
              order by se3.created_at desc, se3.status_event_id desc
              limit 1
          ) evs on true
          left join lateral (
              select coalesce(
                         case upper(nullif(btrim(coalesce(evs.status, '')), ''))
                             when 'DRAFT' then 'DFT'
                             when 'SUBMITTED' then 'SUB'
                             when 'APPROVED' then 'APP'
                             else upper(nullif(btrim(coalesce(evs.status, '')), ''))
                         end,
                         'DFT') as code
          ) st on true
          left join hrs.waa_status_code wcs
                 on wcs.code = st.code
          left join lateral (
              select bs.submitter_name
              from hrs.block_submitter bs
              where bs.block_id = b.block_id
                and bs.is_deleted = false
              order by bs.block_submitter_id
              limit 1
          ) sub on true
          left join lateral (
              select ba.block_attachment_id, ba.file_name
              from hrs.block_attachment ba
              where ba.block_id = b.block_id
                and ba.is_deleted = false
                and ba.document_type = 'FINAL_MAP'
                and ba.status = 'FINALIZED'
              order by ba.created_at desc, ba.block_attachment_id desc
              limit 1
          ) att on true
          left join lateral (
              select bc.comment
              from hrs.block_comment bc
              where bc.block_id = b.block_id
                and bc.is_deleted = false
              order by bc.created_at desc, bc.block_comment_id desc
              limit 1
          ) cmt on true
          where b.reporting_unit_id = :reportingUnitId
            and b.block_id = :blockId
            and b.is_deleted = false
          """;

  /**
   * SOURCE-DECISION query for the expanded-search route (DEC-019, issue #1238): whether a live
   * block exists in the PostgreSQL source for the given {@code (reportingUnitId, blockId)}.
   *
   * <p>Block-id-scoped on purpose: the legacy WAA id space and the PostgreSQL block id space
   * overlap numerically, so a bare RU existence check is unsafe; only a {@code (reportingUnitId,
   * blockId)} match proves the request belongs to the PostgreSQL source (never cross-source,
   * DEC-004).
   */
  public static final String EXISTS_LIVE_BLOCK_QUERY =
      """
          select exists (
                   select 1
                   from hrs.block b
                   where b.reporting_unit_id = :reportingUnitId
                     and b.block_id = :blockId
                     and b.is_deleted = false
               )
          """;

  /**
   * SOURCE-AWARE authorization lookup (DEC-019, issue #1238): the client number of a LIVE
   * reporting unit from the PostgreSQL source.
   *
   * <p>Returns a single row (or none) so the caller can fall back to the legacy source without a
   * cross-source merge (DEC-004).
   */
  public static final String LIVE_CLIENT_NUMBER_QUERY =
      """
          select ru.client_number
          from hrs.reporting_unit ru
          where ru.reporting_unit_id = :reportingUnitId
            and ru.is_deleted = false
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
   * <p>{@code wasteAssessmentAreaId} now projects the same column as {@code blockId} (legacy WAA
   * → {@code block_id}) but stays ABSENT here so PG sort behaviour is unchanged (still rejected,
   * HTTP 428). The degenerate {@code sampling} / {@code sampling.code} / {@code
   * sampling.description} keys (constant {@code 'AVG'}) are likewise rejected; unknown keys are
   * rejected the same way (legacy reject parity).
   */
  public static final Map<String, String> SORT_EXPRESSIONS =
      Map.ofEntries(
          Map.entry("ruNumber", "ru.reporting_unit_id"),
          Map.entry("cutBlockId", "pm.cut_block_id"),
          Map.entry("client.code", "ru.client_number"),
          Map.entry("district", "ru.geographic_code"),
          Map.entry("district.code", "ru.geographic_code"),
          Map.entry("district.description", "ru.geographic_code"),
          Map.entry("status", "st.code"),
          Map.entry("status.code", "st.code"),
          Map.entry("status.description", "wcs.description"),
          Map.entry("lastUpdated", "ru.updated_at"),
          Map.entry("licenseNumber", "pm.forest_file_id"),
          Map.entry("cuttingPermit", "nullif(btrim(pm.cutting_permit_id), '')"),
          Map.entry("timberMark", "pm.timber_mark"));
}
