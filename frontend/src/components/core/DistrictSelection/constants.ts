import {
  Blockchain,
  Building,
  Enterprise,
  Events,
  EventsAlt,
  Finance,
  Group,
  GroupPresentation,
  Location,
  Partnership,
  Tree,
  UserAvatar,
} from '@carbon/icons-react';

import type { DistrictType } from './types';
import type { ComponentType } from 'react';

type IconProps = { 'className'?: string; 'data-testid'?: string };

/**
 * Maps client and district kinds to Carbon icon components for the selection list.
 */
export const ClientTypeIconMap: Record<string, ComponentType<IconProps>> = {
  // Association
  A: Partnership,
  // First Nation Band
  B: EventsAlt,
  // Corporation
  C: Building,
  // Ministry of Forests and Range
  F: Tree,
  // Government
  G: Finance,
  // Individual
  I: UserAvatar,
  // Limited Partnership
  L: Group,
  // General Partnership
  P: Events,
  // First Nation Group
  R: EventsAlt,
  // Society
  S: GroupPresentation,
  // First Nation Tribal Council
  T: GroupPresentation,
  // Unregistered Company
  U: Enterprise,
  // Deselected / None
  Z: Blockchain,
  D: Location, // District
};

/**
 * Minimum number of selectable items before the search box is shown.
 */
export const MIN_CLIENTS_SHOW_SEARCH = 4;

/**
 * Synthetic option used to clear a district or client preference selection.
 */
export const DESELECT_CLIENT: DistrictType = {
  id: '',
  name: 'Select none',
  kind: 'Z',
};
