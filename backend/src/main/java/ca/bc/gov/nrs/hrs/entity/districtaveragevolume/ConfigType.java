package ca.bc.gov.nrs.hrs.entity.districtaveragevolume;

/**
 * Represents the type of configuration stored in the district volume table.
 *
 * <p>Supported config types include:
 * <ul>
 * <li>{@link #DISTRICT_VOLUME} - Standard district average volume configuration</li>
 * <li>{@link #SPECIES_COMPOSITION} - Species composition configuration</li>
 * </ul>
 */
public enum ConfigType {
  DISTRICT_VOLUME,
  SPECIES_COMPOSITION
}
