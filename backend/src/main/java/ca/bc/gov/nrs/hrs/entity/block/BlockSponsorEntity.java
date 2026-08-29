package ca.bc.gov.nrs.hrs.entity.block;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Sponsor endorsement details for a block. */
@Entity
@Table(name = "block_sponsor", schema = "hrs")
@Getter
@Setter
@NoArgsConstructor
public class BlockSponsorEntity {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @Column(name = "block_id", nullable = false) private Long blockId;
  @Column(name = "sponsor_id", nullable = false, length = 128) private String sponsorId;
  @Column(name = "sponsor_name", length = 255) private String sponsorName;
  @Column(name = "first_name", length = 128) private String firstName;
  @Column(name = "last_name", length = 128) private String lastName;
  @Column(length = 128) private String designation;
  @Column(name = "licence_no", length = 128) private String licenceNo;
  @Column(length = 320) private String email;
  @Column(length = 64) private String phone;
  @Column(nullable = false, length = 128) private String createdBy;
  @Column(nullable = false, length = 128) private String updatedBy;
  @Column(nullable = false) private Instant createdAt;
  @Column(nullable = false) private Instant updatedAt;
  @Column(nullable = false) private boolean deleted;
}
