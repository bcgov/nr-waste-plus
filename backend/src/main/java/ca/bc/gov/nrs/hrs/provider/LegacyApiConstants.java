package ca.bc.gov.nrs.hrs.provider;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.search.MyForestClientSearchResultDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import java.util.List;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * Constants used by the Legacy API provider for fallback/static values.
 *
 * <p>
 * Centralizing these constants avoids duplication in the provider and makes
 * them easier to reuse and test.
 * </p>
 */
@SuppressWarnings("unused")
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class LegacyApiConstants {

  public static final List<CodeDescriptionDto> DEFAULT_DISTRICTS = List.of(
      new CodeDescriptionDto("DCC", "Cariboo-Chilcotin"),
      new CodeDescriptionDto("DMH", "100 Mile House"),
      new CodeDescriptionDto("DCK", "Chilliwack"),
      new CodeDescriptionDto("DFN", "Fort Nelson"),
      new CodeDescriptionDto("DQC", "Haida Gwaii"),
      new CodeDescriptionDto("DMK", "Mackenzie"),
      new CodeDescriptionDto("DND", "Nadina"),
      new CodeDescriptionDto("DNI", "North Island - Central Coast"),
      new CodeDescriptionDto("DPC", "Peace"),
      new CodeDescriptionDto("DPG", "Prince George"),
      new CodeDescriptionDto("DQU", "Quesnel"),
      new CodeDescriptionDto("DRM", "Rocky Mountain"),
      new CodeDescriptionDto("DSQ", "Sea to Sky"),
      new CodeDescriptionDto("DSE", "Selkirk"),
      new CodeDescriptionDto("DSS", "Skeena Stikine"),
      new CodeDescriptionDto("DSI", "South Island"),
      new CodeDescriptionDto("DVA", "Stuart Nechako"),
      new CodeDescriptionDto("DSC", "Sunshine Coast"),
      new CodeDescriptionDto("DKA", "Thompson Rivers"),
      new CodeDescriptionDto("DKM", "Coast Mountains"),
      new CodeDescriptionDto("DOS", "Okanagan Shuswap"),
      new CodeDescriptionDto("DCS", "Cascades"),
      new CodeDescriptionDto("DCR", "Campbell River")
  );

  public static final List<CodeDescriptionDto> EMPTY_CODE_LIST = List.of();
  public static final List<String> EMPTY_STRING_LIST = List.of();
  public static final List<ReportingUnitSearchResultDto> EMPTY_REPORTING_UNIT_SEARCH_RESULTS = List.of();
  public static final List<MyForestClientSearchResultDto> EMPTY_MY_FOREST_CLIENT_SEARCH_RESULTS = List.of();
}
