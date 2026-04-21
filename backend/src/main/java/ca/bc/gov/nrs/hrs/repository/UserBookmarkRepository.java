package ca.bc.gov.nrs.hrs.repository;

import ca.bc.gov.nrs.hrs.entity.users.UserBookmarkEntity;
import ca.bc.gov.nrs.hrs.entity.users.UserBookmarkEntityId;
import java.util.List;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.PagingAndSortingRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserBookmarkRepository
    extends PagingAndSortingRepository<UserBookmarkEntity, UserBookmarkEntityId>,
        CrudRepository<UserBookmarkEntity, UserBookmarkEntityId> {

  /**
   * Returns all bookmarks belonging to a given user.
   *
   * @param userId the user's identifier
   * @return list of bookmarked reporting units for that user
   */
  List<UserBookmarkEntity> findByUserId(String userId);

  /**
   * Returns all bookmarks belonging to a user that are included in the list of RUs.
   *
   * @param userId the user's identifier
   * @param reportingUnitIds a reference list of RU identifiers to filter the user's bookmarks by.
   * @return list of bookmarked reporting units for the selected filters
   */
  List<UserBookmarkEntity> findByUserIdAndReportingUnitIdIn(
      String userId, List<Long> reportingUnitIds
  );

}
