import type { ReportingUnitSearchParametersDto } from '@/services/types';

export const mapDisplayFilter = (key: keyof ReportingUnitSearchParametersDto): string => {
  switch (key) {
    case 'district':
      return 'District';
    case 'sampling':
      return 'Sampling Option';
    case 'status':
      return 'Assess area status';
    case 'requestByMe':
      return 'Created By Me';
    case 'requestUserId':
      return 'Submitter';
    case 'updateDateStart':
      return 'Update Date Start';
    case 'updateDateEnd':
      return 'Update Date End';
    case 'licenseeId':
      return 'Licensee number';
    case 'cuttingPermitId':
      return 'Cutting Permit';
    case 'timberMark':
      return 'Timber Mark';
    case 'clientLocationCode':
      return 'Client Location Code';
    case 'clientNumber':
      return 'Client number';
    default:
      return key;
  }
};
