import { CheckmarkFilled, Help } from '@carbon/icons-react';
import { ButtonSkeleton } from '@carbon/react';
import { type FC } from 'react';

import type { DistrictType } from '@/components/core/DistrictSelection/types';

import { ClientTypeIconMap } from '@/components/core/DistrictSelection/constants';

type DistrictItemProps = {
  client: DistrictType;
  isSelected: boolean;
  isLoading?: boolean;
};

/**
 * Displays a selectable district or client entry with an icon and optional loading state.
 *
 * @param props The item props.
 * @param props.client The district or client record to display.
 * @param props.isSelected Whether the item is currently selected.
 * @param props.isLoading Whether to render a skeleton placeholder instead of content.
 * @returns The rendered district selection item.
 */
const DistrictItem: FC<DistrictItemProps> = ({ client, isSelected, isLoading }) => {
  /**
   * Resolves the icon to display for the current item state.
   *
   * @returns The rendered icon element.
   */
  const renderIcon = () => {
    const Img = isSelected ? CheckmarkFilled : (ClientTypeIconMap[client.kind ?? 'I'] ?? Help);
    const testId = (() => {
      if (isSelected) {
        return 'selected-icon';
      }

      if (ClientTypeIconMap[client.kind ?? 'I']) {
        return 'client-icon';
      }

      return 'default-icon';
    })();
    return <Img className="org-item-icon" data-testid={testId} />;
  };

  if (isLoading) {
    return <ButtonSkeleton data-testid="loading-skeleton" />;
  }

  return (
    <>
      <span className="icon-and-name-row">
        {renderIcon()}
        <p className="client-name">{client.name}</p>
      </span>
      {client.id && <span className="sub-info-row">{`ID ${client.id}`}</span>}
    </>
  );
};

export default DistrictItem;
