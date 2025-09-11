import * as Icons from '@carbon/icons-react';
import { ButtonSkeleton } from '@carbon/react';
import { type FC } from 'react';

import { ClientTypeIconMap } from '@/components/core/DistrictSelection/constants';

import type { ForestClientDto } from '@/services/types';

type DistrictItemProps = {
  client: ForestClientDto;
  isSelected: boolean;
  isLoading?: boolean;
};

const DistrictItem: FC<DistrictItemProps> = ({ client, isSelected, isLoading }) => {
  const renderIcon = () => {
    const clientIcon = ClientTypeIconMap[client.clientTypeCode.code ?? 'I'];
    let Img = null;
    if (isSelected) {
      Img = Icons.CheckmarkFilled;
      return <Img className="org-item-icon" />;
    }
    if (clientIcon) {
      Img = Icons[clientIcon];

      return <Img className="org-item-icon" />;
    }

    Img = Icons.Help;
    return <Img className="org-item-icon" />;
  };

  if (isLoading) {
    return <ButtonSkeleton />;
  }

  return (
    <>
      <span className="icon-and-name-row">
        {renderIcon()}
        <p className="client-name">{client.name ?? client.clientName}</p>
      </span>
      <span className="sub-info-row">{`ID ${client.clientNumber}`}</span>
    </>
  );
};

export default DistrictItem;
