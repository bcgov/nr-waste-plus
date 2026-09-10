package ca.bc.gov.nrs.hrs.entity;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Base mapped superclass providing audit tracking and a soft-deletion flag.
 */
@Getter
@Setter
@NoArgsConstructor
@MappedSuperclass
public abstract class SoftDeletableAuditableEntity extends AuditableEntity {

  @Column(name = "is_deleted", nullable = false)
  private boolean deleted;
}

