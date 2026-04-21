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

}
