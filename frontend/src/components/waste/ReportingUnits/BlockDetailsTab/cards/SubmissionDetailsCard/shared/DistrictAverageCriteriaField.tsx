import { Column } from '@carbon/react';

import ActiveMultiSelect from '@/components/Form/ActiveMultiSelect';
import { activeMSItemToString } from '@/components/waste/WasteSearch/WasteSearchFiltersActive/utils';

import { toSelectedItems } from './format';

import type { CodeDescriptionDto } from '@/types/search.types';

type Props = {
  form: any;
  id: string;
  options: readonly CodeDescriptionDto[];
};

const DistrictAverageCriteriaField = ({ form, id, options }: Props) => (
  <Column max={16} xlg={16} lg={16} md={8} sm={4}>
    <form.Field name="districtAverageCriteriaCodes">
      {(field: any) => (
        <ActiveMultiSelect
          id={id}
          titleText="District average criteria"
          placeholder="Select criteria"
          items={[...options]}
          itemToString={activeMSItemToString}
          selectedItems={toSelectedItems(options, field.state.value)}
          onChange={(data: { selectedItems?: Array<{ code?: string | null; value?: string }> }) => {
            const selected = data.selectedItems ?? [];
            field.handleChange(
              selected.map((item) => item.code ?? item.value ?? '').filter(Boolean),
            );
          }}
        />
      )}
    </form.Field>
  </Column>
);

export default DistrictAverageCriteriaField;
