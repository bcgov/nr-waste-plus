package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.BlockAttachmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

/** Repository for block attachments. */
public interface BlockAttachmentRepository extends JpaRepository<BlockAttachmentEntity, Long> {}
