  | 'outline'
  | undefined;

/** Controls how the tag body text is rendered. */
export type ColorTagContentMode = 'description' | 'code-equals-description';

/** Controls text normalization behavior. */
export type ColorTagTextCaseMode = 'sentence' | 'preserve';

/** Controls visual emphasis without changing semantic color. */
export type ColorTagToneMode = 'normal' | 'muted';

/**
 * Props for the ColorTag component.
 */
export type ColorTagProps = {
  /** The value object containing code and description */
  value: { code: string; description: string } | null;
  /** Mapping of codes to Carbon color types */
  colorMap?: Record<string, CarbonColors>;
  /** Whether to show the tooltip when code and description are available (default: true) */
  showTooltip?: boolean;
  /** Optional custom tooltip label that overrides the default code-description tooltip */
  tooltipLabel?: string;
  /** Optional explicit color type override that bypasses colorMap lookup */
  colorType?: CarbonColors;
  /** Selects tag text output mode (default: 'description') */
  contentMode?: ColorTagContentMode;
  /** Selects text normalization strategy (default: 'sentence') */
  textCaseMode?: ColorTagTextCaseMode;
  /** Selects visual emphasis style (default: 'normal') */
  toneMode?: ColorTagToneMode;
  /** Optional class name applied to the underlying Carbon Tag */
  className?: string;
};

/**
 * A colored tag component with flexible text, tooltip, and emphasis modes.
 *
 * @param props - Component props
 * @param props.value - Object containing code and description to display
 * />
 * ```
 */
const ColorTag: FC<ColorTagProps> = ({
  value,
  colorMap,
  showTooltip = true,
  tooltipLabel,
  colorType,
  contentMode,
  textCaseMode,
  toneMode,
  className,
}) => {
  // Check if value is null or if both code and description are null/empty
  const hasCode = Boolean(value?.code?.trim());
  const hasDescription = Boolean(value?.description?.trim());
  const finalHasCode = Boolean(actualValue.code?.trim());
  const finalHasDescription = Boolean(actualValue.description?.trim());

  const resolvedContentMode: ColorTagContentMode = contentMode ?? 'description';
  const resolvedTextCaseMode: ColorTagTextCaseMode = textCaseMode ?? 'sentence';
  const resolvedToneMode: ColorTagToneMode = toneMode ?? 'normal';

  // Apply sentence case only for multiple word content
  const sentenceCase = (str: string): string => {
    if (resolvedTextCaseMode === 'preserve') {
      return str;
    }

    // Single word: keep as-is
    if (!str.includes(' ')) {
      return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const displayDescription = finalHasDescription ? sentenceCase(actualValue.description) : '-';
  const displayText =
    resolvedContentMode === 'code-equals-description'
      ? `${actualValue.code} = ${displayDescription}`
      : displayDescription;

  // Determine tooltip: show if we have both code and description
  const derivedTooltipLabel =
    finalHasCode && finalHasDescription ? `${actualValue.code} - ${actualValue.description}` : '';

  const resolvedTooltipLabel = tooltipLabel ?? derivedTooltipLabel;

  const resolvedColor = colorType ?? colorMap?.[actualValue.code] ?? 'gray';

  const resolvedClassName = [className, resolvedToneMode === 'muted' ? 'color-tag--muted' : '']
    .filter(Boolean)
    .join(' ');

  const tag = (
    <Tag type={resolvedColor} size="md" className={resolvedClassName || undefined}>
      {displayText}
    </Tag>
  );

  return showTooltip && resolvedTooltipLabel ? (
    <Tooltip label={resolvedTooltipLabel} align="top" autoAlign>
      {tag}
    </Tooltip>
  ) : (
