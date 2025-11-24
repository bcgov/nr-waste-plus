import { ChevronDown, ChevronUp } from '@carbon/icons-react';
import { useMemo, type FC } from 'react';

import useBreakpoint from '@/hooks/useBreakpoint';
import type { DistrictType } from '@/components/core/DistrictSelection/types';

type HeaderDistrictDisplayProps = {
  queryHook: () => { data: DistrictType | undefined; isLoading: boolean };
  noSelectionText: string;
  isActive: boolean;
};

const HeaderDistrictDisplay: FC<HeaderDistrictDisplayProps> = ({ isActive, queryHook, noSelectionText }) => {
  const breakpoint = useBreakpoint();
  const { data } = queryHook();

  const showSimpleView = useMemo(
    () => breakpoint === 'sm',
    [breakpoint],
  );
  return (
    <>
      {showSimpleView ? null : (
        <p className="client-name" data-testid="client-name">
          {data ? (data.name) : noSelectionText}
        </p>
      )}
      {showSimpleView ? null : isActive ? (
        <ChevronUp data-testid="active" />
      ) : (
        <ChevronDown data-testid="inactive" />
      )}
    </>
  );
};

export default HeaderDistrictDisplay;
