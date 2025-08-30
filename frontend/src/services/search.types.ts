export type CodeDescriptionDto = {
  code: string;
  description: string;
};

export type ReportingUnitSearchResultDto = {
  blockId: string | null;
  ruNumber: number;
  client: CodeDescriptionDto;
  clientLocation: CodeDescriptionDto;
  sampling: CodeDescriptionDto;
  district: CodeDescriptionDto;
  status: CodeDescriptionDto;
  lastUpdated: string;
};

export type ReportingUnitSearchParametersDto = {
  mainSearchTerm?: string;
  district?: string[];
  sampling?: string[];
  status?: string[];
  requestByMe?: boolean;
  requestUserId?: string;
  updateDateStart?: string;
  updateDateEnd?: string;
  licenseeId?: string;
  cuttingPermitId?: string;
  timberMark?: string;
  clientLocationCode?: string;
  clientNumber?: string;
};
