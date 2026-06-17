import { Column, RadioButton, RadioButtonGroup } from '@carbon/react';
import { type FC, useMemo, useState } from 'react';

import PageTitle from '@/components/core/PageTitle';
import FileUploadInput from '@/components/Form/FileUploadInput';
import { DistrictVolumeProcessor } from '@/services/districtvolumes/processors/districtVolumeProcessor';
import { interiorValidator } from '@/services/districtvolumes/validators/interiorValidator';
import { coastValidator } from '@/services/districtvolumes/validators/coastValidator';
import type { TableData } from '@/services/districtvolumes.types';

import DistrictVolumeTable from './DistrictVolumeTable';

const processor = new DistrictVolumeProcessor();

const DistrictVolumeUploadPage: FC = () => {
  const [areaType, setAreaType] = useState<'INTERIOR' | 'COASTAL'>('INTERIOR');
  const [tableData, setTableData] = useState<TableData | null>(null);

  const validator = useMemo(
    () => (areaType === 'INTERIOR' ? interiorValidator : coastValidator),
    [areaType],
  );

  return (
    <>
      <Column lg={16} md={8} sm={4} className="upload-column__banner">
        <PageTitle
          title="Upload District Average Waste Volume Table"
          subtitle="Upload an Excel file containing Interior or Coast district volume data. The file must use the standard template format."
        />
      </Column>
      <Column lg={16} md={8} sm={4}>
        <RadioButtonGroup
          name="area-type"
          valueSelected={areaType}
          onChange={(val: string) => {
            setAreaType(val as 'INTERIOR' | 'COASTAL');
            setTableData(null);
          }}
          legendText="Select area type"
        >
          <RadioButton labelText="Interior" value="INTERIOR" id="area-type-interior" />
          <RadioButton labelText="Coast" value="COASTAL" id="area-type-coast" />
        </RadioButtonGroup>

        <FileUploadInput<TableData>
          key={areaType}
          accept=".xlsx,.xls"
          processor={processor}
          validator={validator}
          onProcessed={(data) => setTableData(data[0] ?? null)}
          maxFileSizeBytes={2 * 1024 * 1024}
        />
      </Column>

      {tableData && (
        <Column lg={16} md={8} sm={4}>
          <DistrictVolumeTable data={tableData} />
        </Column>
      )}
    </>
  );
};

export default DistrictVolumeUploadPage;
