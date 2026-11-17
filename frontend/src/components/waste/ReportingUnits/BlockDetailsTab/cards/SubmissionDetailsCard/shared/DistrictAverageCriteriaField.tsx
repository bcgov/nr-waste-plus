import { Column } from '@carbon/react';

import ActiveMultiSelect from '@/components/Form/ActiveMultiSelect';
import { activeMSItemToString } from '@/components/waste/WasteSearch/WasteSearchFiltersActive/utils';

import { toSelectedItems } from './format';
import { fieldError } from './formUtils';
import { validateDistrictAverageCriteriaCodes } from './validation';

import type { CodeDescriptionDto } from '@/types/search.types';

type Props = {
  form: any;
  id: string;
  options: readonly CodeDescriptionDto[];
};

const DistrictAverageCriteriaField = ({ form, id, options }: Props) => (
  <Column max={16} xlg={16} lg={16} md={8} sm={4}>
    <form.Field
      name="districtAverageCriteriaCodes"
      validators={{
        onChange: ({ value }: { value: readonly string[] }) =>
          validateDistrictAverageCriteriaCodes(value),
      }}
    >
      {(field: any) => {
        const invalidText = fieldError(field.state.meta.errors);
        return (
          <ActiveMultiSelect
            id={id}
            titleText="District average criteria"
            placeholder="Select criteria"
            items={[...options]}
            itemToString={activeMSItemToString}
            selectedItems={toSelectedItems(options, field.state.value)}
            onChange={(data: {
              selectedItems?: Array<{ code?: string | null; value?: string }>;
            }) => {
              const selected = data.selectedItems ?? [];
              field.handleChange(
                selected.map((item) => item.code ?? item.value ?? '').filter(Boolean),
              );
            }}
            invalid={Boolean(invalidText)}
            invalidText={invalidText}
          />
        );
      }}
    </form.Field>
  </Column>
);

export default DistrictAverageCriteriaField;
