package ca.bc.gov.nrs.hrs.mappers;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

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
@NoArgsConstructor(access = AccessLevel.PRIVATE)
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
   * and district name. The district name has the "Natural Resource District" substring removed and is trimmed.
   */
  public static final String DISTRICT_AS_DTO =
      "java(new CodeDescriptionDto(projection.getDistrictCode(), projection.getDistrictName()"
      + ".replaceAll(\"Natural Resource District\", \"\").trim()))";

  /**
   * MapStruct expression to create a {@code CodeDescriptionDto} from the projection's client
   * number and client name.
   */
  public static final String CLIENT_AS_DTO =
      "java(new CodeDescriptionDto(projection.getClientNumber(), null))";

  /**
   * MapStruct expression to create a {@code CodeDescriptionDto} from the projection's attachment.
   */
  public static final String ATTACHMENT_AS_DTO =
      "java("
      + "new CodeDescriptionDto("
      + "java.util.Objects.toString(projection.getAttachmentId(),null),"
      + "projection.getAttachmentName()"
      + ")"
      + ")";
}