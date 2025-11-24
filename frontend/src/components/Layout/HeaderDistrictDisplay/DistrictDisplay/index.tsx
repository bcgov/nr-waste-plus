import { useQuery } from '@tanstack/react-query';
import { type FC } from 'react';

import { usePreference } from '@/context/preference/usePreference';
import APIs from '@/services/APIs';
import HeaderDistrictDisplay from '@/components/Layout/HeaderDistrictDisplay';

type DistrictDisplayProps = {
  isActive: boolean;
};

const DistrictDisplay: FC<DistrictDisplayProps> = ({ isActive }) => {  
  const { userPreference } = usePreference();

  return (<HeaderDistrictDisplay 
    isActive={isActive} 
    noSelectionText='No district selected'
    queryHook={() => 
      useQuery({
        queryKey: ['districtOptions'],
        queryFn: async () => await APIs.codes.getDistricts(),
        enabled: true,
        select: (data) => data
        .map((district) => ({ id: district.code, name: district.description, kind: 'D' }))
        .find((client) => client.id === userPreference.selectedDistrict),
      })}
      />
  );
};

export default DistrictDisplay;
