import { type FC } from 'react';

import HeaderDistrictDisplay from '@/components/Layout/HeaderDistrictDisplay';
import { useDistrictOptionsQuery } from '@/config/react-query/hooks';
import { usePreference } from '@/context/preference/usePreference';

type DistrictDisplayProps = {
  isActive: boolean;
};

const DistrictDisplay: FC<DistrictDisplayProps> = ({ isActive }) => {
  const { userPreference } = usePreference();
  const { data, isLoading } = useDistrictOptionsQuery({
    select: (data) =>
      data
        .map((district) => ({ id: district.code, name: district.description, kind: 'D' }))
        .find((client) => client.id === userPreference.selectedDistrict),
  });

  return (
    <HeaderDistrictDisplay
      isActive={isActive}
      noSelectionText="No district selected"
      queryHook={() => ({ data, isLoading })}
    />
  );
};

export default DistrictDisplay;
