import { Button, Tile } from '@carbon/react';
import { type FC, type ReactNode } from 'react';

import './index.scss';

/**
 * Props for the {@link ConfigurationCard} component.
 */
export interface ConfigurationCardProps {
  /** Card heading — required. */
  readonly title: string;

  /**
   * Card body text or rich content.
   * When a `string` is provided it is wrapped in a `<p>` tag.
   * When any other `ReactNode` is provided it is rendered as-is (no wrapping element).
   */
  readonly description?: string | ReactNode;

  /**
   * Custom children rendered inside the tile.
   * Takes priority over `description` when both are provided.
   */
  readonly children?: ReactNode;

  /** Button label text. Button is not rendered when this prop is absent. */
  readonly buttonLabel?: string;

  /**
   * Callback fired when the button is clicked.
   * Button is not rendered when this prop is absent.
   * Parent is responsible for all navigation and external actions.
   */
  readonly onButtonClick?: () => void;

  /** Carbon Button kind. Defaults to `'ghost'` per Issue #906 / Figma spec. */
  readonly kind?:
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'ghost'
    | 'danger'
    | 'danger--primary'
    | 'danger--ghost'
    | 'danger--tertiary';

  /** When `true`, the action button is rendered in a disabled state. */
  readonly disabled?: boolean;
}

/**
 * Generic presentational card built on Carbon {@link Tile}.
 *
 * Renders a heading, optional body content, and an optional action button.
 * The component has no router coupling — all navigation and external actions
 * are delegated to the parent via the `onButtonClick` callback prop.
 *
 * **Content priority:** when both `children` and `description` are provided,
 * `children` is rendered and `description` is ignored.
 *
 * **Button rendering:** the button is only rendered when *both* `buttonLabel`
 * and `onButtonClick` are provided.
 *
 * @example
 * ```tsx
 * <ConfigurationCard
 *   title="District average waste volumes"
 *   description="View or manage district volume tables for each district."
 *   buttonLabel="View or update tables →"
 *   onButtonClick={() => navigate({ to: '/configuration/district-volume-tables' })}
 * />
 * ```
 */
export const ConfigurationCard: FC<ConfigurationCardProps> = ({
  title,
  description,
  children,
  buttonLabel,
  onButtonClick,
  kind = 'ghost',
  disabled = false,
}) => {
  const descriptionContent =
    description == null ? null : typeof description === 'string' ? (
      <p>{description}</p>
    ) : (
      description
    );

  return (
    <Tile className="configuration-card">
      <h4>{title}</h4>

      {children ?? descriptionContent}

      {buttonLabel && onButtonClick && (
        <Button kind={kind} onClick={onButtonClick} disabled={disabled}>
          {buttonLabel}
        </Button>
      )}
    </Tile>
  );
};

export default ConfigurationCard;
