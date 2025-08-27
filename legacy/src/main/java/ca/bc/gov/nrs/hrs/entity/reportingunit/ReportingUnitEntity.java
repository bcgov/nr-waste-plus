package ca.bc.gov.nrs.hrs.entity.reportingunit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.With;

@Data
@Builder
@With
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(schema = "THE", name = "ORG_UNIT")
public class ReportingUnitEntity {

  @Id
  @Column(name = "REPORTING_UNIT_ID")
  private Long id;

  @Column(name = "ORG_UNIT_NO", nullable = false)
  private Long orgUnitNo;

  @Column(name = "CLIENT_LOCN_CODE", length = 2, nullable = false)
  private String clientLocationCode;

  @Column(name = "CLIENT_NUMBER", length = 8, nullable = false)
  private String clientNumber;

  @Column(name = "WASTE_SAMPLING_OPTION_CODE", length = 3, nullable = false)
  private String wasteSamplingOptionCode;

  @Column(name = "WASTE_DISPERSED_CV_CODE", length = 3, nullable = false)
  private String wasteDispersedCvCode;

  @Column(name = "WASTE_ACCUMULATED_CV_CODE", length = 3, nullable = false)
  private String wasteAccumulatedCvCode;

  @Column(name = "APPRAISAL_METHOD_CODE", length = 1, nullable = false)
  private Character appraisalMethodCode;

  @Column(name = "REVISION_COUNT", nullable = false)
  private Long revision;

  @Column(name = "ENTRY_USERID",length = 30, nullable = false)
  private String createdBy;

  @Column(name = "ENTRY_TIMESTAMP", nullable = false)
  private LocalDate createdAt;

  @Column(name = "UPDATE_USERID",length = 30, nullable = false)
  private String updatedBy;

  @Column(name = "UPDATE_TIMESTAMP", nullable = false)
  private LocalDate updatedAt;


}
