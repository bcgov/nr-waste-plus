import { useQuery } from '@tanstack/react-query';
import { type FC } from 'react';

import type { DistrictType } from '@/components/core/DistrictSelection/types';

import DistrictSelection from '@/components/core/DistrictSelection';
import APIs from '@/services/APIs';

const DistrictListing: FC = () => {
  const filter = (client: DistrictType, keyword: string): boolean => {
    return (
      client.name.trim().toLowerCase().includes(keyword.toLowerCase()) ||
      client.id.trim().toLowerCase() === keyword.toLowerCase()
    );
  };

  const { data, isLoading } = useQuery({
    queryKey: ['districtOptions'],
    queryFn: async () => await APIs.codes.getDistricts(),
    staleTime: Infinity,
    enabled: true,
    select: (data) =>
      data.map((district) => ({
        id: district.code,
        name: district.description,
        kind: 'D',
      })),
  });

  return (
    <DistrictSelection
      queryHook={() => ({ data, isLoading })}
      preferenceKey="selectedDistrict"
      deselectLabel="Select no district"
      searchLabel="Search by district name or code"
      filterFn={filter}
    />
  );
};

export default DistrictListing;
