package ca.bc.gov.nrs.hrs.mappers;

/**
 * Constants used by MapStruct mapper definitions to map projection fields to DTOs.
 *
 * <p>Each constant contains a MapStruct Java expression that constructs a
 * {@code CodeDescriptionDto}
 * from a projection instance. The values are intended to be referenced from mapper annotations (for
 * example: {@code expression = MapperConstants.STATUS_AS_DTO}).</p>
 *
 * @since 1.0.0
 */
public class MapperConstants {

  /**
   * MapStruct expression to create a {@code CodeDescriptionDto} from the projection's status code
   * and status name.
   */
  public static final String STATUS_AS_DTO =
      "java(new CodeDescriptionDto(projection.getStatusCode(), projection.getStatusName()))";

  /**
   * MapStruct expression to create a {@code CodeDescriptionDto} from the projection's sampling code
   * and sampling name.
   */
  public static final String SAMPLING_AS_DTO =
      "java(new CodeDescriptionDto(projection.getSamplingCode(), projection.getSamplingName()))";

  /**
   * MapStruct expression to create a {@code CodeDescriptionDto} from the projection's district code
   * and district name.
   */
  public static final String DISTRICT_AS_DTO =
      "java(new CodeDescriptionDto(projection.getDistrictCode(), projection.getDistrictName()))";

  /**
   * MapStruct expression to create a {@code CodeDescriptionDto} from the projection's client
   * number. The display name is intentionally null in this expression.
   */
  public static final String CLIENT_AS_DTO =
      "java(new CodeDescriptionDto(projection.getClientNumber(), null))";

  /**
   * MapStruct expression to create a {@code CodeDescriptionDto} from the projection's client
   * location. The display name is intentionally null in this expression.
   */
  public static final String CLIENT_LOCATION_AS_DTO =
      "java(new CodeDescriptionDto(projection.getClientLocation(), null))";
}
