import * as ICON from '@carbon/icons-react';

import type { ForestClientDto } from '@/services/types';

type ClientIconType = keyof typeof ICON;

export const ClientTypeIconMap: Record<string, ClientIconType> = {
  // Association
  A: 'Partnership',
  // First Nation Band
  B: 'EventsAlt',
  // Corporation
  C: 'Building',
  // Ministry of Forests and Range
  F: 'Tree',
  // Government
  G: 'Finance',
  // Individual
  I: 'UserAvatar',
  // Limited Partnership
  L: 'Group',
  // General Partnership
  P: 'Events',
  // First Nation Group
  R: 'EventsAlt',
  // Society
  S: 'GroupPresentation',
  // First Nation Tribal Council
  T: 'GroupPresentation',
  // Unregistered Company
  U: 'Enterprise',
  // Deselected / None
  Z: 'Blockchain',
};

export const MIN_CLIENTS_SHOW_SEARCH = 4;

export const DESELECT_CLIENT = {
  name: 'No district selected',
  clientStatusCode: { code: 'ACT', description: 'Active' },
  clientTypeCode: { code: 'Z', description: 'None' },
} as ForestClientDto;
