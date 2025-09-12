import { Column, Grid, Search, SkeletonPlaceholder } from '@carbon/react';
import { useQuery } from '@tanstack/react-query';
import { useState, type FC } from 'react';

import { useAuth } from '@/context/auth/useAuth';
import { usePreference } from '@/context/preference/usePreference';
import APIs from '@/services/APIs';

import { DESELECT_CLIENT, MIN_CLIENTS_SHOW_SEARCH } from './constants';
import DistrictItem from './DistrictItem';
import { filterClientByKeyword } from './utils';

import './index.scss';

const DistrictSelection: FC = () => {
  const [filterText, setFilterText] = useState<string>('');
  const { getClients } = useAuth();
  const { userPreference, updatePreferences } = usePreference();

  const { data, isLoading } = useQuery({
    queryKey: ['forest-clients', 'search', getClients()],
    queryFn: () => APIs.forestclient.searchByClientNumbers(getClients(), 0, getClients().length),
    enabled: !!getClients().length,
  });

  const storeClient = (clientNumber: string) => {
    updatePreferences({ selectedClient: clientNumber });
  };

  return (
    <Grid className="district-selection-grid">
      {getClients() && getClients().length > MIN_CLIENTS_SHOW_SEARCH && (
        <Column className="full-width-col" sm={4} md={8} lg={16} max={16}>
          <Search
            className="search-bar"
            labelText="Search by district name or ID"
            placeholder="Search by district name or ID"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterText(e.target.value)}
          />
        </Column>
      )}

      <Column className="full-width-col" sm={4} md={8} lg={16} max={16}>
        {isLoading && (
          <div className="skeleton-container">
            <SkeletonPlaceholder />
          </div>
        )}
        {!isLoading && (
          <ul className="district-list" aria-label="District list">
            <li
              data-testid="district-select-none"
              className="district-list-item"
              aria-label="Select no district"
              title="Select no district"
            >
              <button
                type="button"
                className={`district-list-item-btn${!userPreference.selectedClient ? ' selected-district' : ''}`}
                onClick={() => storeClient('')}
              >
                <DistrictItem
                  client={DESELECT_CLIENT}
                  isSelected={!userPreference.selectedClient}
                />
              </button>
            </li>
            {data
              ?.filter((client) => filterClientByKeyword(client, filterText))
              .map((client) => (
                <li
                  data-testid={`district-select-${client.clientNumber}`}
                  key={client.clientNumber}
                  className="district-list-item"
                  aria-label={client.clientName}
                  title={client.clientName}
                >
                  <button
                    type="button"
                    className={`district-list-item-btn${userPreference.selectedClient === client.clientNumber ? ' selected-district' : ''}`}
                    onClick={() => storeClient(client.clientNumber)}
                  >
                    <DistrictItem
                      client={client}
                      isSelected={userPreference.selectedClient === client.clientNumber}
                    />
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
