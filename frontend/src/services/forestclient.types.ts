import type { CodeDescriptionDto } from './search.types';

export enum YesNoEnum {
  Y = 'Y',
  N = 'N',
}

export type ForestClientLocationDto = {
  clientNumber: string | null;
  locationCode: string | null;
  locationName: string | null;
  companyCode: string | null;
  address1: string | null;
  address2: string | null;
  address3: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  businessPhone: string | null;
  homePhone: string | null;
  cellPhone: string | null;
  faxNumber: string | null;
  email: string | null;
  expired: YesNoEnum;
  trusted: YesNoEnum;
  returnedMailDate: string | null;
  comment: string | null;
};

export type ForestClientDto = {
  clientNumber: string;
  clientName: string;
  legalFirstName: string;
  legalMiddleName: string;
  clientStatusCode: CodeDescriptionDto;
  clientTypeCode: CodeDescriptionDto;
  acronym: string;
  name?: string;
};

export type ForestClientAutocompleteResultDto = {
  id?: string;
  name?: string;
  acronym?: string;
};

export type MyForestClientDto = {
  client: CodeDescriptionDto;
  submissionsCount: number;
  blocksCount: number;
  lastUpdate: string;
};
