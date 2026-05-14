import type { CodeDescriptionDto } from './types';

export type ReportingUnitDto = {
  id: number;
  client: CodeDescriptionDto;
  clientStatus: CodeDescriptionDto;
  grade: CodeDescriptionDto;
  sampling: CodeDescriptionDto;
  district: CodeDescriptionDto;
};
