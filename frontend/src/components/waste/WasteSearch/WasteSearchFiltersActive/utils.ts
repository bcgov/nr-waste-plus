import type { CodeDescriptionDto, ReportingUnitSearchParametersDto } from '@/services/types';

export const mapDisplayFilter = (key: keyof ReportingUnitSearchParametersDto): string => {
  switch (key) {
    case 'district':
      return 'District';
    case 'sampling':
      return 'Sampling option';
    case 'status':
      return 'Assess area status';
    case 'requestByMe':
      return 'Created by me';
    case 'multiMark':
      return 'Multi-mark blocks';
    case 'requestUserId':
      return 'Submitter';
    case 'updateDateStart':
      return 'Update date start';
    case 'updateDateEnd':
      return 'Update date end';
    case 'licenseeId':
      return 'Licensee number';
    case 'cuttingPermitId':
      return 'Cutting permit';
    case 'timberMark':
      return 'Timber mark';
    case 'clientLocationCode':
      return 'Client location code';
    case 'clientNumbers':
      return 'Client';
    default:
      return key;
  }
};

export const activeMSItemToString = (item: CodeDescriptionDto | null): string =>
  item ? `${item.code} - ${item.description}` : 'No selection';
