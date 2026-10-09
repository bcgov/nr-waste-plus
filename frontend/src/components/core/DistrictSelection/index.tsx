import { Column, Grid, Search, SkeletonPlaceholder } from '@carbon/react';
import { useState } from 'react';

import { useAnnouncer } from '@/context/announcer/useAnnouncer';
import { usePreference } from '@/context/preference/usePreference';

import { DESELECT_CLIENT, MIN_CLIENTS_SHOW_SEARCH } from './constants';
import DistrictItem from './DistrictItem';

import type { DistrictType } from './types';
import './index.scss';

type IsSelected<T = string> = (item: DistrictType, userPreferenceValue: T) => boolean;
type DistrictTypeConverter<T = string> = (district: DistrictType) => T;

type DistrictSelectionProps<T = string> = {
  queryHook: () => { data: DistrictType[] | undefined; isLoading: boolean };
  preferenceKey: string;
  deselectLabel: string;
  searchLabel: string;
  filterFn: (item: DistrictType, keyword: string) => boolean;
  isSelected?: IsSelected<T>;
  districtTypeConverter?: DistrictTypeConverter<T>;
  /** Noun used in screen-reader announcements, e.g. 'district' or 'client'. */
  announcementNoun?: string;
};

/**
 * Renders a searchable preference-backed list for selecting a district or client value.
 *
 * @typeParam T The stored preference value type.
 * @param props The selection component props.
 * @param props.queryHook Hook returning the selectable items and loading state.
 * @param props.preferenceKey Preference key to update when the selection changes.
 * @param props.deselectLabel Accessible label for the clear-selection entry.
 * @param props.searchLabel Label and placeholder for the search input.
 * @param props.filterFn Predicate used to filter visible items.
 * @param props.isSelected Optional custom selection comparator.
 * @param props.districtTypeConverter Optional converter from item to stored preference value.
 * @param props.announcementNoun Optional noun used in screen-reader announcements (default 'district').
 * @returns A searchable list of selectable items.
 */
const DistrictSelection = <T,>({
  queryHook,
  preferenceKey,
  deselectLabel,
  searchLabel,
  filterFn,
  isSelected: isSelectedRaw,
  districtTypeConverter: districtTypeConverterRaw,
  announcementNoun = 'district',
}: DistrictSelectionProps<T>) => {
  const [filterText, setFilterText] = useState<string>('');
  const { userPreference, updatePreferences } = usePreference();
  const { announce } = useAnnouncer();
  const { data, isLoading } = queryHook();

  /**
   * Persists the current selection to user preferences and announces it.
   *
   * @param value The preference value to store.
   * @param itemName Display name of the selected item; omitted when clearing the selection.
   */
  const storeSelection = (value: unknown, itemName?: string) => {
    updatePreferences({ [preferenceKey]: value });
    if (itemName) {
      announce(`Selected ${announcementNoun}: ${itemName}`);
    } else {
      announce(
        `${announcementNoun.charAt(0).toUpperCase()}${announcementNoun.slice(1)} selection cleared`,
      );
    }
  };

  const isSelected: IsSelected<T> =
    isSelectedRaw || ((item, userPreferenceValue) => userPreferenceValue === item.id);
  const isItemSelected = (item: DistrictType) =>
    isSelected(item, userPreference[preferenceKey] as T);

  const districtTypeConverter: DistrictTypeConverter<T> =
    districtTypeConverterRaw || ((district) => district.id as T);

  return (
    <Grid className="district-selection-grid">
      {data && data.length > MIN_CLIENTS_SHOW_SEARCH && (
        <Column className="full-width-col" sm={4} md={8} lg={16} max={16}>
          <Search
            className="search-bar"
            labelText={searchLabel}
            placeholder={searchLabel}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterText(e.target.value)}
          />
        </Column>
      )}

      <Column className="full-width-col" sm={4} md={8} lg={16} max={16}>
        {isLoading ? (
          <div className="skeleton-container">
            <SkeletonPlaceholder />
          </div>
        ) : (
          <ul className="district-list" aria-label="List of possible values">
            <li
              data-testid="district-select-none"
              className="district-list-item"
              aria-label={deselectLabel}
              title={deselectLabel}
            >
              <button
                type="button"
                onClick={() => storeSelection('')}
                className={`district-list-item-btn${userPreference[preferenceKey] ? '' : ' selected-district'}`}
              >
                <DistrictItem
                  client={DESELECT_CLIENT}
                  isSelected={!userPreference[preferenceKey]}
                />
              </button>
            </li>
            {data
              ?.filter((item) => filterFn(item, filterText))
              .map((item) => (
                <li
                  data-testid={`district-select-${item.id}`}
                  key={item.id}
                  className="district-list-item"
                  aria-label={item.name}
                  title={item.name}
                >
                  <button
                    type="button"
                    className={`district-list-item-btn${isItemSelected(item) ? ' selected-district' : ''}`}
                    onClick={() => storeSelection(districtTypeConverter(item), item.name)}
                  >
                    <DistrictItem client={item} isSelected={isItemSelected(item)} />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </Column>
    </Grid>
  );
};

export default DistrictSelection;
