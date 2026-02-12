export type CodeDescriptionDto = {
  code: string;
  description: string;
};

export type ReportingUnitSearchResultDto = {
  blockId: number | null;
  cutBlockId: string | null;
  ruNumber: number;
  client: CodeDescriptionDto;
  licenseNumber: string | null;
  cuttingPermit: string | null;
  timberMark: string | null;
  multiMark: boolean;
  secondaryEntry: boolean;
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
  multiMark?: boolean;
  requestUserId?: string;
  updateDateStart?: string;
  updateDateEnd?: string;
  licenseeId?: string;
  cuttingPermitId?: string;
  timberMark?: string;
  clientLocationCode?: string;
  clientNumbers?: string[];
};

export type ReportingUnitSearchExpandedDto = {
  id: number;
  licenseNo: string | null;
  cuttingPermit: string | null;
  timberMark: string | null;
  exempted: boolean;
  multiMark: boolean;
  secondaryTimberMarks: string | null;
  primaryMark: string | null;
  netArea: number;
  submitter: string | null;
  attachment: CodeDescriptionDto;
  comments: string | null;
  totalBlocks: number;
};
