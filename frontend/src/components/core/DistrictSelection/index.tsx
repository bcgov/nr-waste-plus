import { Column, Grid, Search, SkeletonPlaceholder } from '@carbon/react';
import { useState } from 'react';

import { usePreference } from '@/context/preference/usePreference';

import { DESELECT_CLIENT, MIN_CLIENTS_SHOW_SEARCH } from './constants';
import DistrictItem from './DistrictItem';
import type { DistrictType } from './types';

import './index.scss';

type DistrictSelectionProps = {
  queryHook: () => { data: DistrictType[] | undefined; isLoading: boolean };
  preferenceKey: string;
  deselectLabel: string;
  searchLabel: string;
  filterFn: (item: DistrictType, keyword: string) => boolean;
};

const DistrictSelection = ({
  queryHook,
  preferenceKey,
  deselectLabel,
  searchLabel,
  filterFn,
}: DistrictSelectionProps) => {
  const [filterText, setFilterText] = useState<string>('');
  const { userPreference, updatePreferences } = usePreference();
  const { data, isLoading } = queryHook();

  const storeSelection = (value: string) => {
    updatePreferences({ [preferenceKey]: value });
  };

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
          <ul className="district-list" aria-label="District list">
            <li
              data-testid="district-select-none"
              className="district-list-item"
              aria-label={deselectLabel}
              title={deselectLabel}
            >
              <button
                onClick={() => storeSelection('')}
                className={`district-list-item-btn${!userPreference[preferenceKey] ? ' selected-district' : ''}`}
              >
                <DistrictItem
                  client={DESELECT_CLIENT}
                  isSelected={!userPreference[preferenceKey]}
                />
              </button>
            </li>
            {data
              ?.filter((item) => filterFn(item, filterText))
              .map((item) =>
                <li
                  data-testid={`district-select-${item.id}`}
                  key={item.id}
                  className="district-list-item"
                  aria-label={item.name}
                  title={item.name}
                >
                  <button
                    type="button"
                    className={`district-list-item-btn${userPreference[preferenceKey] === item.id ? ' selected-district' : ''}`}
                    onClick={() => storeSelection(item.id)}
                  >
                    <DistrictItem
                      client={item}
                      isSelected={userPreference[preferenceKey] === item.id}
                    />
                  </button>
                </li>
              )}
          </ul>
        )}
      </Column>
    </Grid>
  );
};

export default DistrictSelection;
