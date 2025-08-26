package ca.bc.gov.nrs.hrs.repository;

import ca.bc.gov.nrs.hrs.entity.users.UserPreferenceEntity;
import java.util.Optional;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.PagingAndSortingRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserPreferenceRepository extends
    PagingAndSortingRepository<UserPreferenceEntity, String>,
    CrudRepository<UserPreferenceEntity, String> {

  Optional<UserPreferenceEntity> findById(String userId);

}
