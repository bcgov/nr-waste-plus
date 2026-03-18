package ca.bc.gov.nrs.hrs.provider.legacy;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.search.MyForestClientSearchResultDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import java.util.List;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * Contains default values for various entities including districts, codes, and search results
 * that are used as fallback values when the legacy API is unavailable or returns invalid data.
 *
 * <p>Centralizing these constants avoids duplication in the provider and makes
 * them easier to reuse and test.
 * </p>
 *
 */
@SuppressWarnings("unused")
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class LegacyApiConstants {

  /**
   * Default list of British Columbia forest districts with their codes and descriptions.
   * 
   * <p>This constant serves as a fallback when the legacy API's district codes endpoint
   * is unavailable. It contains all standard BC forest districts.
   * </p>
   */
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
      new CodeDescriptionDto("DCS", "Sunshine Coast"),
      new CodeDescriptionDto("DKA", "Thompson Rivers"),
      new CodeDescriptionDto("DKM", "Coast Mountains"),
      new CodeDescriptionDto("DOS", "Okanagan Shuswap"),
      new CodeDescriptionDto("DCS", "Cascades"),
      new CodeDescriptionDto("DCR", "Campbell River")
  );

  /**
   * Empty fallback list for generic code descriptions.
   * 
   * <p>Used as a fallback for sampling codes and assessment area status codes
   * when the legacy API is unavailable.
   * </p>
   */
  public static final List<CodeDescriptionDto> CODE_LIST = List.of();
  
  /**
   * Empty fallback list for string values (user IDs, etc.).
   * 
   * <p>Used as a fallback for user search operations when the legacy API is unavailable.
   * </p>
   */
  public static final List<String> EMPTY_STRING_LIST = List.of();
  
  /**
   * Empty fallback list for reporting unit search results.
   * 
   * <p>Used as a fallback for reporting unit searches when the legacy API is unavailable.
   * </p>
   */
  public static final List<ReportingUnitSearchResultDto> RU_SEARCH_LIST = List.of();
  
  /**
   * Empty fallback list for "My Forest" client search results.
   * 
   * <p>Used as a fallback for "My Forest" client searches when the legacy API is unavailable.
   * </p>
   */
  public static final List<MyForestClientSearchResultDto> MY_CLIENTS_LIST = List.of();
  
  /**
   * JSON field name constant for the content array in paged responses.
   * 
   * <p>Legacy API paged responses contain a "content" field with the actual result list.
   * </p>
   */
  public static final String CONTENT_CONST = "content";
  
  /**
   * JSON field name constant for the page metadata object in paged responses.
   * 
   * <p>Legacy API paged responses contain a "page" field with pagination metadata
   * such as total elements and page size.
   * </p>
   */
  public static final String PAGE_CONST = "page";
}

