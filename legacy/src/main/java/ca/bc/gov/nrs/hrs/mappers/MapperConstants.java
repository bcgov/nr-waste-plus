package ca.bc.gov.nrs.hrs.mappers;

public class MapperConstants {

  public static final String STATUS_AS_DTO = "java(new CodeDescriptionDto(projection.getStatusCode(), projection.getStatusName()))";
  public static final String SAMPLING_AS_DTO = "java(new CodeDescriptionDto(projection.getSamplingCode(), projection.getSamplingName()))";
  public static final String DISTRICT_AS_DTO = "java(new CodeDescriptionDto(projection.getDistrictCode(), projection.getDistrictName()))";
  public static final String CLIENT_AS_DTO = "java(new CodeDescriptionDto(projection.getClientNumber(), null))";
  public static final String CLIENT_LOCATION_AS_DTO = "java(new CodeDescriptionDto(projection.getClientLocation(), null))";
}
