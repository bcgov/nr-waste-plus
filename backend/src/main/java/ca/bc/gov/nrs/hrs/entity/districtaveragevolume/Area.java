package ca.bc.gov.nrs.hrs.entity.districtaveragevolume;

import lombok.Getter;

/**
 * Represents a geographic area associated with the waste policy used for calculating
 * district volume averages.
 *
 * <p>Supported areas include:
 * <ul>
 * <li>{@link #INTERIOR} - North Interior and South Interior regions</li>
 * <li>{@link #COASTAL} - Coast region</li>
 * </ul>
 */
@Getter
public enum Area {
  INTERIOR("interior"),
  COASTAL("coastal");

  /**
   * The string identifier used for database persistence or API serialization.
   * -- GETTER --
   * 
   * @return the string key representing the geographic area.
   */
  private final String key;

  Area(String key) {
    this.key = key;
  }
}