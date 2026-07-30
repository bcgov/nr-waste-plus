import { Tooltip } from '@carbon/react';
import { type FC, type ReactNode } from 'react';

import EmptyValueTag from '@/components/core/Tags/EmptyValueTag';

/**
 * Carbon PopoverAlignment values supported by Tooltip.
 * Combines deprecated and new alignment specifiers for full compatibility.
 */
type TooltipAlignment =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-start'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-end'
  | 'left-end'
  | 'left-start'
  | 'right-end'
  | 'right-start'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'left-bottom'
  | 'left-top'
  | 'right-bottom'
  | 'right-top';

interface TooltipTagProps {
  /**
   * The tooltip text shown on hover.
   * When absent, the component renders its content without a tooltip wrapper.
   */
  readonly tooltip?: string;
  /** The content to wrap with the tooltip. */
  readonly children?: ReactNode;
  /**
   * Tooltip alignment relative to the trigger element.
   * Supports all Carbon `PopoverAlignment` values (e.g. `'top'`, `'right'`, `'bottom'`, `'left'`,
   * plus compound values like `'top-start'`, `'bottom-end'`, etc.).
   * @default 'top'
   */
  readonly align?: TooltipAlignment;
  /**
   * Auto-align the tooltip to stay within the viewport.
   * When enabled, the tooltip automatically adjusts its position to stay within the viewport.
   */
  readonly autoAlign?: boolean;
}

/**
 * A generic tooltip wrapper that displays a label on hover.
 *
 * Uses Carbon's `Tooltip` to wrap content with a tooltip explanation.
 * For primitive children (string, number), uses `EmptyValueTag` to handle
 * null/empty display with a fallback dash. For element children, renders
 * them directly inside a span.
 *
 * When no `tooltip` is provided, the content is rendered without a
 * tooltip wrapper, making the component usable as a conditional tooltip.
 *
 * @param props The tooltip tag props.
 * @param props.tooltip The tooltip text shown on hover. Omit to render content without a tooltip.
 * @param props.children The content to wrap with the tooltip.
 * @param props.align Tooltip alignment relative to the trigger element. Defaults to `'top'`.
 * @param props.autoAlign Auto-align the tooltip to stay within the viewport.
 * @returns The wrapped element with a hover tooltip, or the content alone.
 *
 * @example
 * <TooltipTag tooltip="Alder"><span>AL</span></TooltipTag>
 * <TooltipTag tooltip="Description">Value</TooltipTag>
 * <TooltipTag>Plain value, no tooltip</TooltipTag>
 */
const TooltipTag: FC<TooltipTagProps> = ({
  tooltip,
  children,
  align = 'top',
  autoAlign = false,
}) => {
  // For primitive values (string, number) or null/undefined, use EmptyValueTag
  // to handle empty display with a fallback dash.
  // For element nodes, render directly inside a span for Tooltip compatibility.
  const renderContent = () => {
    if (
      typeof children === 'string' ||
      typeof children === 'number' ||
      children === null ||
      children === undefined
    ) {
      return <EmptyValueTag value={children} />;
    }
    return <span>{children}</span>;
  };

  if (!tooltip) {
    return renderContent();
  }

  return (
    <Tooltip label={tooltip} align={align} autoAlign={autoAlign}>
      {renderContent()}
    </Tooltip>
  );
};

export default TooltipTag;
