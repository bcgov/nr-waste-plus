import type { CodeDescriptionDto, ReportingUnitSearchParametersDto } from '@/services/types';

/**
 * Maps a search filter key to the label shown in the active-filter tag list.
 *
 * @param key The search filter key.
 * @returns A user-facing label for the filter.
 */
export const mapDisplayFilter = (key: keyof ReportingUnitSearchParametersDto): string => {
  switch (key) {
    case 'district':
      return 'District';
    case 'sampling':
      return 'Sampling option';
    case 'status':
      return 'Status';
    case 'requestByMe':
      return 'Created By Me';
    case 'multiMark':
      return 'Multi-mark blocks';
    case 'requestUserId':
      return 'Submitter';
    case 'updateDateStart':
      return 'Update Date Start';
    case 'updateDateEnd':
      return 'Update Date End';
    case 'licenseeId':
      return 'Licence number';
    case 'cuttingPermitId':
      return 'Cutting Permit';
    case 'timberMark':
      return 'Timber Mark';
    case 'clientLocationCode':
      return 'Client Location Code';
    case 'clientNumbers':
      return 'Client';
    default:
      return key;
  }
};

/**
 * Formats a code-description option for ActiveMultiSelect display.
 *
 * @param item The selected option.
 * @returns A human-readable item label.
 */
export const activeMSItemToString = (item: CodeDescriptionDto | null): string =>
  item ? `${item.code} - ${item.description}` : 'No selection';
