package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** Repository for submission blocks. */
@Repository
public interface BlockRepository extends JpaRepository<BlockEntity, Long> {
  Optional<BlockEntity> findByReportingUnitIdAndDeletedFalse(Long reportingUnitId);

  /** Returns each live block with the scalar data needed by the reporting-unit block list. */
  @Query(
      value =
          """
          SELECT b.block_id AS id,
                 primary_mark.forest_file_id AS "licenseNumber",
                 primary_mark.cutting_permit_id AS "cuttingPermit",
                 primary_mark.cut_block_id AS "cutBlockId",
                 primary_mark.timber_mark AS "timberMark",
                 CASE
                   WHEN da.district_average_block_id IS NULL
                     OR (da.coast_ground_based_area_ha IS NULL
                         AND da.coast_helicopter_area_ha IS NULL)
                     THEN NULL
                   ELSE COALESCE(da.coast_ground_based_area_ha, 0)
                        + COALESCE(da.coast_helicopter_area_ha, 0)
                 END AS "totalWasteAreaHa",
                 selected_submitter.submitter_name AS submitter,
                 latest_status.status AS "rawStatus",
                 b.updated_at AS "updatedAt",
                 b.block_type AS "blockType"
          FROM hrs.block b
          LEFT JOIN LATERAL (
            SELECT bm.forest_file_id,
                   bm.cutting_permit_id,
                   bm.cut_block_id,
                   bm.timber_mark
            FROM hrs.block_mark bm
            WHERE bm.block_id = b.block_id
              AND bm.mark_type = 'PRIMARY'
              AND bm.is_deleted = FALSE
            ORDER BY bm.sequence_no, bm.block_mark_id
            LIMIT 1
          ) primary_mark ON TRUE
          LEFT JOIN hrs.block_submitter selected_submitter
            ON selected_submitter.block_submitter_id = (
              SELECT bs.block_submitter_id
              FROM hrs.block_submitter bs
              WHERE bs.block_id = b.block_id
                AND bs.is_deleted = FALSE
              ORDER BY bs.block_submitter_id
              LIMIT 1
            )
          LEFT JOIN hrs.district_average_block da
            ON da.district_average_block_id = b.block_id
           AND da.is_deleted = FALSE
          LEFT JOIN LATERAL (
            SELECT se.status
            FROM hrs.status_event se
            WHERE se.block_id = b.block_id
            ORDER BY se.created_at DESC, se.status_event_id DESC
            LIMIT 1
          ) latest_status ON TRUE
          WHERE b.reporting_unit_id = :reportingUnitId
            AND b.is_deleted = FALSE
          ORDER BY b.block_id
          """,
      nativeQuery = true)
  List<BlockListItemProjection> findBlockListItemsByReportingUnitId(
      @Param("reportingUnitId") Long reportingUnitId);

  /** Returns the non-deleted block with the given id that belongs to a reporting unit. */
  Optional<BlockEntity> findByIdAndReportingUnitIdAndDeletedFalse(Long id, Long reportingUnitId);
}
