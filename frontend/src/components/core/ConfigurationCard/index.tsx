import { Button, Link, Tile } from '@carbon/react';
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

  /**
   * Optional icon rendered at the top of the card (above the title).
   * Pass a rendered Carbon icon component, e.g. `<AccumulationRain />`.
   */
  readonly icon?: ReactNode;

  /**
   * When `true`, renders a Carbon `<Link>` instead of a `<Button>` for the CTA.
   * Use this when the design calls for an inline link style action.
   * Defaults to `false`.
   */
  readonly linkVariant?: boolean;
}

/**
 * Generic presentational card built on Carbon {@link Tile}.
 *
 * Renders an optional icon, a heading, optional body content, and an optional
 * action CTA (either a Button or a Link depending on `linkVariant`).
 * The component has no router coupling — all navigation and external actions
 * are delegated to the parent via the `onButtonClick` callback prop.
 *
 * **Content priority:** when both `children` and `description` are provided,
 * `children` is rendered and `description` is ignored.
 *
 * **CTA rendering:** the CTA is only rendered when *both* `buttonLabel`
 * and `onButtonClick` are provided.
 *
 * @example
 * ```tsx
 * <ConfigurationCard
 *   icon={<AccumulationRain />}
 *   title="District average waste volumes"
 *   description="Volume tables used to calculate volumes when district averages are used for waste assessment"
 *   buttonLabel="View or update tables →"
 *   linkVariant
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
  icon,
  linkVariant = false,
}) => {
  let descriptionContent: ReactNode = null;
  if (description != null) {
    descriptionContent = typeof description === 'string' ? <p>{description}</p> : description;
  }

  return (
    <Tile className="configuration-card">
      {icon && <div className="configuration-card__icon">{icon}</div>}

      <h4>{title}</h4>

      {children ?? descriptionContent}

      {buttonLabel &&
        onButtonClick &&
        (linkVariant ? (
          <Link
            className="configuration-card__link"
            onClick={disabled ? undefined : onButtonClick}
            disabled={disabled}
          >
            {buttonLabel}
          </Link>
        ) : (
          <Button kind={kind} onClick={onButtonClick} disabled={disabled}>
            {buttonLabel}
          </Button>
        ))}
    </Tile>
  );
};

export default ConfigurationCard;
