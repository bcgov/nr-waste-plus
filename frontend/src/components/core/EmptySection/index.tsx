import { type ComponentType, type FC } from 'react';

import Subtitle from '@/components/core/Subtitle';
import './index.scss';

interface EmptySectionProps {
  icon?: ComponentType<{ 'className'?: string; 'data-testid'?: string }>;
  title: string;
  description: string | React.ReactNode;
  pictogram?: ComponentType<{ 'className'?: string; 'data-testid'?: string }>;
  className?: string;
  whiteLayer?: boolean;
}

/**
 * EmptySection component used to display a placeholder or empty state.
 *
 * Supports optional Carbon icons or pictograms, a title, and a description.
 *
 * @component
 * @example
 * ```tsx
 * import { WarningFilled } from '@carbon/icons-react';
 *
 * <EmptySection
 *   icon={WarningFilled}
 *   title="No Data Available"
 *   description="Please check back later."
 * />
 * ```
 *
 * @param {ComponentType} [icon] - Optional Carbon icon component.
 * @param {string} title - Title text for the empty section.
 * @param {string | React.ReactNode} description - Supporting description text.
 * @param {ComponentType} [pictogram] - Optional Carbon pictogram component.
 * @param {string} [className] - Optional custom class names.
 * @param {boolean} [whiteLayer] - Optional flag to apply white background layer.
 * @returns {JSX.Element} A styled empty state section.
 */
const EmptySection: FC<EmptySectionProps> = ({
  icon: Icon,
  title,
  description,
  pictogram: Pictogram,
  whiteLayer,
  className,
}) => {
  const Img = Pictogram ?? Icon;

  return (
    <div
      className={`${className ?? ''} empty-section-container ${whiteLayer ? 'empty-section-white-layer' : undefined}`}
    >
      {Img ? <Img className="empty-section-icon" data-testid="empty-section-icon" /> : null}
      <div className="empty-section-title" data-testid="empty-section-title">
        {title}
      </div>
      <Subtitle className="empty-section-subtitle" text={description} />
    </div>
  );
};

export default EmptySection;
