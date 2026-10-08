import type { Override } from './utils.types';

/**
 * Represents a code-description pair with optional area classifications.
 *
 * @property code - the unique identifier for this code
 * @property description - human-readable label for the code
 * @property areas - optional array of area classifications (e.g., 'COASTAL', 'INTERIOR')
 */
export type CodeDescriptionDto = {
  readonly code: string;
  readonly description: string;
  readonly areas?: string[];
};

/**
 * Represents a single reporting unit search result with all relevant metadata.
 *
 * @property wasteAssessmentAreaId - identifier for the waste assessment area, or null if not applicable
 * @property cutBlockId - identifier for the cut block, or null if not applicable
 * @property ruNumber - unique reporting unit number
 * @property client - the client associated with this reporting unit
 * @property licenseNumber - forestry license number, or null if not applicable
 * @property cuttingPermit - cutting permit identifier, or null if not applicable
 * @property timberMark - timber mark identifier, or null if not applicable
 * @property multiMark - whether this reporting unit has multiple marks
 * @property secondaryEntry - whether this is a secondary entry
 * @property sampling - the sampling methodology used
 * @property district - the reporting district (DKM, DCR, DPG)
 * @property status - the current status of the reporting unit
 * @property lastUpdated - ISO 8601 timestamp of the last update
 * @property bookmarked - whether this reporting unit is bookmarked by the current user
 */
export type ReportingUnitSearchResultDto = {
  readonly wasteAssessmentAreaId: number | null;
  readonly cutBlockId: string | null;
  readonly ruNumber: number;
  readonly client: CodeDescriptionDto;
  readonly licenseNumber: string | null;
  readonly cuttingPermit: string | null;
  readonly timberMark: string | null;
  readonly multiMark: boolean;
  readonly secondaryEntry: boolean;
  readonly sampling: CodeDescriptionDto;
  readonly district: CodeDescriptionDto;
  readonly status: CodeDescriptionDto;
  readonly lastUpdated: string;
  readonly bookmarked: boolean;
};

/**
 * Parameters for searching and filtering reporting units.
 *
 * @property mainSearchTerm - free-text search term
 * @property district - array of district codes to filter by
 * @property sampling - array of sampling methodology codes to filter by
 * @property status - array of status codes to filter by
 * @property requestByMe - filter to show only units requested by the current user
 * @property multiMark - filter to show only units with multiple marks
 * @property bookmarked - filter to show only bookmarked units
 * @property requestUserId - filter by the user ID who requested the unit
 * @property updateDateStart - ISO 8601 start date for filtering by last update
 * @property updateDateEnd - ISO 8601 end date for filtering by last update
 * @property licenseeId - filter by licensee identifier
 * @property cuttingPermitId - filter by cutting permit identifier
 * @property timberMark - filter by timber mark
 * @property clientLocationCode - filter by client location code
 * @property clientNumbers - array of client numbers to filter by
 */
export type ReportingUnitSearchParametersDto = {
  readonly mainSearchTerm?: string;
  readonly district?: string[];
  readonly sampling?: string[];
  readonly status?: string[];
  readonly requestByMe?: boolean;
  readonly multiMark?: boolean;
  readonly bookmarked?: boolean;
  readonly requestUserId?: string;
  readonly updateDateStart?: string;
  readonly updateDateEnd?: string;
  readonly licenseeId?: string;
  readonly cuttingPermitId?: string;
  readonly timberMark?: string;
  readonly clientLocationCode?: string;
  readonly clientNumbers?: string[];
};

/**
 * View-specific overrides for reporting unit search parameters.
 * Allows clientNumbers to be represented as CodeDescriptionDto objects instead of strings.
 *
 * @property clientNumbers - array of client code-description pairs for UI display
 */
export type ReportingUnitSearchParametersViewSpecific = {
  readonly clientNumbers?: CodeDescriptionDto[];
};

/**
 * Merged type combining base search parameters with view-specific overrides.
 * Used for UI forms where clientNumbers are represented as CodeDescriptionDto objects.
 */
export type ReportingUnitSearchParametersViewDto = Override<
  ReportingUnitSearchParametersDto,
  ReportingUnitSearchParametersViewSpecific
>;

/**
 * Represents a secondary mark entry within an expanded reporting unit search result.
 *
 * @property mark - the mark identifier
 * @property status - the current status of this secondary mark
 * @property area - the area associated with this secondary mark
 */
export type SearchExpandedSecondaryDto = {
  readonly mark: string;
  readonly status: CodeDescriptionDto;
  readonly area: number;
};

/**
 * Detailed expanded view of a reporting unit search result with comprehensive metadata.
 *
 * @property id - unique identifier for the reporting unit
 * @property licenseNo - forestry license number, or null if not applicable
 * @property cuttingPermit - cutting permit identifier, or null if not applicable
 * @property timberMark - timber mark identifier, or null if not applicable
 * @property exempted - whether this reporting unit is exempted
 * @property multiMark - whether this reporting unit has multiple marks
 * @property status - the current status of the reporting unit
 * @property secondaryMarks - array of secondary marks associated with this unit
 * @property netArea - the net area of the reporting unit
 * @property markArea - the marked area of the reporting unit
 * @property submitter - the user who submitted this reporting unit, or null if not available
 * @property attachment - attachment metadata
 * @property comments - additional comments, or null if none
 * @property totalBlocks - total number of blocks in this reporting unit
 * @property totalChildren - total number of child entries
 */
export type ReportingUnitSearchExpandedDto = {
  readonly id: number;
  readonly licenseNo: string | null;
  readonly cuttingPermit: string | null;
  readonly timberMark: string | null;
  readonly exempted: boolean;
  readonly multiMark: boolean;
  readonly status: CodeDescriptionDto;
  readonly secondaryMarks: SearchExpandedSecondaryDto[];
  readonly netArea: number;
  readonly markArea: number;
  readonly submitter: string | null;
  readonly attachment: CodeDescriptionDto;
  readonly comments: string | null;
  readonly totalBlocks: number;
  readonly totalChildren: number;
};
