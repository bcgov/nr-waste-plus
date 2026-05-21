import { Column, ComboBox } from '@carbon/react';
import { useState, type FC, type ComponentProps } from 'react';

import type { CodeDescriptionDto } from '@/services/types';

import PageTitle from '@/components/core/PageTitle';
import { useWasteSearchFilterOptions } from '@/components/waste/WasteSearch/WasteSearchFilters/useWasteSearchFilterOptions';
import { activeMSItemToString } from '@/components/waste/WasteSearch/WasteSearchFiltersActive/utils';
import AdvancedFilterClientInput from '@/components/waste/WasteSearch/WasteSearchFiltersAdvanced/AdvancedFilterClientInput';

type ReportingUnitCreateDto = {
  clientNumber: string | null;
  districtCode: string | null;
  samplingCode: string | null;
};

type ComboBoxOnChange = NonNullable<ComponentProps<typeof ComboBox>['onChange']>;
type ComboBoxOnChangeData = Parameters<ComboBoxOnChange>[0];

const ReportingUnitCreatePage: FC = () => {
  const { samplingOptions, districtOptions } = useWasteSearchFilterOptions();
  const [reportingUnit, setReportingUnit] = useState<ReportingUnitCreateDto>({
    clientNumber: null,
    districtCode: null,
    samplingCode: null,
  });

  const onDropdownSelectChange = (key: keyof ReportingUnitCreateDto): ComboBoxOnChange => {
    return (changes: ComboBoxOnChangeData): void => {
      const selectedItem = changes.selectedItem as CodeDescriptionDto | null;
      setReportingUnit((prev) => ({ ...prev, [key]: selectedItem?.code ?? null }));
    };
  };

  const onAutoCompleteChange = (changes: { selectedItems: CodeDescriptionDto[] }): void => {
    if (changes.selectedItems.length > 0) {
      setReportingUnit((prev) => ({
        ...prev,
        clientNumber: changes.selectedItems[0].code ?? null,
      }));
    } else {
      setReportingUnit((prev) => ({ ...prev, clientNumber: null }));
    }
  };

  return (
    <>
      <Column lg={16} md={8} sm={4} className="dashboard-column__banner">
        <PageTitle
          title="Create reporting unit"
          subtitle="Start a new waste submission by creating a reporting unit."
        />
      </Column>
      <Column lg={16} md={8} sm={4} className="dashboard-column__banner">
        <AdvancedFilterClientInput
          selectedClients={[]}
          myClients={[]}
          onClientChange={onAutoCompleteChange}
        />
        <ComboBox
          placeholder="District"
          titleText="District"
          id="create-ru-district"
          items={districtOptions ?? []}
          itemToString={(option) => activeMSItemToString(option, '')}
          onChange={onDropdownSelectChange('districtCode')}
          selectedItem={(districtOptions ?? []).find(
            (option) => option.code === reportingUnit.districtCode,
          )}
        />
        {/* conditional grade selection */}

        <ComboBox
          placeholder="Sampling option"
          titleText="Sampling option"
          id="as-sampling-multi-select"
          items={samplingOptions}
          itemToString={(option) => activeMSItemToString(option, '')}
          onChange={onDropdownSelectChange('samplingCode')}
          selectedItem={(samplingOptions ?? []).find(
            (option) => option.code === reportingUnit.samplingCode,
          )}
        />
      </Column>
      <p>{JSON.stringify(reportingUnit)}</p>
    </>
  );
};

export default ReportingUnitCreatePage;
