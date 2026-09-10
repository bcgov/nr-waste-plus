package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.BlockAttachmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for block attachments. */
@Repository
public interface BlockAttachmentRepository extends JpaRepository<BlockAttachmentEntity, Long> {}
