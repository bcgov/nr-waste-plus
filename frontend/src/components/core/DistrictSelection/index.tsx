import { Column, Grid, Search, SkeletonPlaceholder } from '@carbon/react';
import { useState } from 'react';

import { DESELECT_CLIENT, MIN_CLIENTS_SHOW_SEARCH } from './constants';
import DistrictItem from './DistrictItem';

import type { DistrictType } from './types';

import { usePreference } from '@/context/preference/usePreference';
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
};

const DistrictSelection = <T,>({
  queryHook,
  preferenceKey,
  deselectLabel,
  searchLabel,
  filterFn,
  isSelected: isSelectedRaw,
  districtTypeConverter: districtTypeConverterRaw,
}: DistrictSelectionProps<T>) => {
  const [filterText, setFilterText] = useState<string>('');
  const { userPreference, updatePreferences } = usePreference();
  const { data, isLoading } = queryHook();

  const storeSelection = (value: unknown) => {
    updatePreferences({ [preferenceKey]: value });
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
                    onClick={() => storeSelection(districtTypeConverter(item))}
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
