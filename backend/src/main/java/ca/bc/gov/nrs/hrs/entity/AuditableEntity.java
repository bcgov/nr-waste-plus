package ca.bc.gov.nrs.hrs.entity;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;

/** Base mapped superclass providing standard audit tracking timestamps and user identifiers. */
@Getter
@Setter
@NoArgsConstructor
@MappedSuperclass
public abstract class AuditableEntity {

  @CreatedDate
  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @CreatedBy
  @Column(name = "created_by", nullable = false, updatable = false, length = 128)
  private String createdBy;

  @LastModifiedDate
  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @LastModifiedBy
  @Column(name = "updated_by", nullable = false, length = 128)
  private String updatedBy;
}
