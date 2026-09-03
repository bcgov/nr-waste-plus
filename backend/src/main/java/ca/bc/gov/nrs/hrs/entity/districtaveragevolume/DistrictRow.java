package ca.bc.gov.nrs.hrs.entity.districtaveragevolume;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

/** A district row with standard values and preserved arbitrary JSON fields. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DistrictRow {
  private final CodeDescriptionDto district;
  private final BigDecimal avoidableSawlog;
  private final BigDecimal avoidableGrade4;
  private final BigDecimal unavoidableGrade4;
  private final BigDecimal avoidableHembalGradeU;
  private final BigDecimal avoidableGradeY;
  private final BigDecimal unavoidable;
  private final BigDecimal total;
  private final Map<String, Object> additionalProperties = new LinkedHashMap<>();

  /** Creates a district row from the standard application fields. */
  @JsonCreator
  public DistrictRow(@JsonProperty("district") CodeDescriptionDto district,
      @JsonProperty("avoidableSawlog") BigDecimal avoidableSawlog,
      @JsonProperty("avoidableGrade4") BigDecimal avoidableGrade4,
      @JsonProperty("unavoidableGrade4") BigDecimal unavoidableGrade4,
      @JsonProperty("avoidableHembalGradeU") BigDecimal avoidableHembalGradeU,
      @JsonProperty("avoidableGradeY") BigDecimal avoidableGradeY,
      @JsonProperty("unavoidable") BigDecimal unavoidable,
      @JsonProperty("total") BigDecimal total) {
    this.district = district;
    this.avoidableSawlog = avoidableSawlog;
    this.avoidableGrade4 = avoidableGrade4;
    this.unavoidableGrade4 = unavoidableGrade4;
    this.avoidableHembalGradeU = avoidableHembalGradeU;
    this.avoidableGradeY = avoidableGradeY;
    this.unavoidable = unavoidable;
    this.total = total;
  }

  @JsonProperty("district")
  public CodeDescriptionDto district() { return district; }

  @JsonProperty("avoidableSawlog")
  public BigDecimal avoidableSawlog() { return avoidableSawlog; }

  @JsonProperty("avoidableGrade4")
  public BigDecimal avoidableGrade4() { return avoidableGrade4; }

  @JsonProperty("unavoidableGrade4")
  public BigDecimal unavoidableGrade4() { return unavoidableGrade4; }

  @JsonProperty("avoidableHembalGradeU")
  public BigDecimal avoidableHembalGradeU() { return avoidableHembalGradeU; }

  @JsonProperty("avoidableGradeY")
  public BigDecimal avoidableGradeY() { return avoidableGradeY; }

  @JsonProperty("unavoidable")
  public BigDecimal unavoidable() { return unavoidable; }

  @JsonProperty("total")
  public BigDecimal total() { return total; }

  /** Preserves fields not known by the current application model. */
  @JsonAnySetter
  public void addProperty(String name, Object value) { additionalProperties.put(name, value); }

  /** Exposes preserved arbitrary fields to JSON conversion. */
  @JsonAnyGetter
  public Map<String, Object> additionalProperties() { return additionalProperties; }
}
