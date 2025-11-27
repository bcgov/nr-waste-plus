import { useQuery } from '@tanstack/react-query';
import { type FC } from 'react';

import HeaderDistrictDisplay from '@/components/Layout/HeaderDistrictDisplay';
import { usePreference } from '@/context/preference/usePreference';
import APIs from '@/services/APIs';

type DistrictDisplayProps = {
  isActive: boolean;
};

const DistrictDisplay: FC<DistrictDisplayProps> = ({ isActive }) => {
  const { userPreference } = usePreference();
  const { data, isLoading } = useQuery({
    queryKey: ['districtOptions'],
    queryFn: async () => await APIs.codes.getDistricts(),
    enabled: true,
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
