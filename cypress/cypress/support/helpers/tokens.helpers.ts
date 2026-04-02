export type CssProperty =
  | 'font-size'
  | 'font-weight'
  | 'line-height'
  | 'letter-spacing'
  | 'font-family'
  | 'color'
  | 'background-color'
  | 'border-color'
  | 'border-width'
  | 'border-radius'
  | 'padding'
  | 'padding-top'
  | 'padding-right'
  | 'padding-bottom'
  | 'padding-left'
  | 'margin'
  | 'margin-top'
  | 'margin-right'
  | 'margin-bottom'
  | 'margin-left'
  | 'width'
  | 'height'
  | 'min-width'
  | 'min-height'
  | 'max-width'
  | 'max-height';

export const TOKEN_PREFIX = '--cds-';

export function tokenToCssVar(tokenName: string): string {
  let cleanName = tokenName.trim();
  if (cleanName.startsWith('$')) {
    cleanName = cleanName.substring(1);
  }
  cleanName = cleanName.replace(/^cds--/, '');
  return `${TOKEN_PREFIX}${cleanName}`;
}

export const propertyFromToken = (tokenName: string, currentToken: string): string => {
  const baseToken = tokenToCssVar(tokenName);
  if (currentToken.startsWith(`${baseToken}-`)) {
    return currentToken.replace(`${baseToken}-`, '');
  }
  return currentToken;
};

export function getTokenDefinition(
  tokenName: string,
  property: string,
  appWindow: Window,
  useBaseFallback: boolean = true
): { value: string | null; found: boolean; source: 'property' | 'direct' } {
  const baseVar = tokenToCssVar(tokenName);
  const propertyVar = `${baseVar}-${property}`;
  
  let value = appWindow.getComputedStyle(appWindow.document.documentElement).getPropertyValue(propertyVar).trim();
  if (value) {
    return { value, found: true, source: 'property' };
  }
  
  if (useBaseFallback) {
    value = appWindow.getComputedStyle(appWindow.document.documentElement).getPropertyValue(baseVar).trim();
    if (value) {
      return { value, found: true, source: 'direct' };
    }
  }
  
  return { value: null, found: false, source: 'direct' };
}

export function getAllTokenDefinitions(
  tokenName: string,
  appWindow: Window
) {
  const computedStyles = appWindow.getComputedStyle(appWindow.document.documentElement);
  const baseVar = tokenToCssVar(tokenName);
  const currentBreakPoint = computedStyles.getPropertyValue('--cds-breakpoint').trim() || 'none';  
  
  const selectedStyles = Object
  .values(computedStyles)
  .filter((prop) => prop.startsWith(baseVar))
  .filter((prop) => !prop.startsWith(`${baseVar}-breakpoints-`))
  .reduce((acc: any, key: string) => {
    acc[key] = computedStyles.getPropertyValue(key).trim();
    return acc;
  }, {});

  const withBreakpoints = Object.values(computedStyles)  
  .filter((prop) => prop.startsWith(`${baseVar}-breakpoints-${currentBreakPoint}`))
  .reduce((acc: any, key: string) => {
    acc[key.replace(`-breakpoints-${currentBreakPoint}`,'')] = computedStyles.getPropertyValue(key).trim();
    return acc;
  }, {});

  return { ...selectedStyles, ...withBreakpoints };
}

export function getTokenValue(
  tokenName: string,
  property: string,
  appWindow: Window
): string | null {
  const { value } = getTokenDefinition(tokenName, property, appWindow);
  return value;
}

export function getRootTokenValue(tokenName: string): string | null {
  const cssVar = tokenToCssVar(tokenName);
  const value = getComputedStyle(document.documentElement).getPropertyValue(cssVar);
  return value?.trim() || null;
}

export function normalizeToPx(value: string, fontSize: number = 16): number {
  const trimmed = value.trim();

  if (trimmed.endsWith('px')) {
    return Number.parseFloat(trimmed);
  }

  if (trimmed.endsWith('rem')) {
    return Number.parseFloat(trimmed) * fontSize;
  }

  if (trimmed.endsWith('em')) {
    return Number.parseFloat(trimmed) * fontSize;
  }

  return Number.parseFloat(trimmed);
}

export function pxToRem(px: number, fontSize: number = 16): number {
  return px / fontSize;
}

export function valuesMatch(
  tokenValue: string | null,
  elementValue: string,
  fontSize: number = 16,
  tolerance: number = 0.5
): boolean {
  if (!tokenValue) return false;

  if (isColorValue(tokenValue) && isColorValue(elementValue)) {
    return colorsMatch(tokenValue, elementValue);
  }

  const tokenPx = normalizeToPx(tokenValue, fontSize);
  const elementPx = normalizeToPx(elementValue, fontSize);

  return Math.abs(tokenPx - elementPx) < tolerance;
}

export function isColorValue(value: string): boolean {
  if (!value) return false;
  const trimmed = value.trim().toLowerCase();
  return (
    trimmed.startsWith('#') ||
    trimmed.startsWith('rgb') ||
    trimmed.startsWith('hsl') ||
    isNamedColor(trimmed)
  );
}

function isNamedColor(name: string): boolean {
  const namedColors = [
    'black', 'silver', 'gray', 'grey', 'white', 'maroon', 'red', 'purple',
    'fuchsia', 'green', 'lime', 'olive', 'yellow', 'navy', 'blue', 'teal',
    'aqua', 'orange', 'pink', 'brown', 'transparent', 'inherit', 'initial',
    'currentcolor', 'none'
  ];
  return namedColors.includes(name);
}

export function colorsMatch(color1: string, color2: string, tolerance: number = 0): boolean {
  const rgb1 = parseColor(color1);
  const rgb2 = parseColor(color2);

  if (!rgb1 || !rgb2) {
    return color1.trim().toLowerCase() === color2.trim().toLowerCase();
  }

  if (tolerance === 0) {
    return rgb1.r === rgb2.r && rgb1.g === rgb2.g && rgb1.b === rgb2.b;
  }

  return (
    Math.abs(rgb1.r - rgb2.r) <= tolerance &&
    Math.abs(rgb1.g - rgb2.g) <= tolerance &&
    Math.abs(rgb1.b - rgb2.b) <= tolerance
  );
}

export function parseSpacingValue(value: string): { top: number; right: number; bottom: number; left: number } {
  const normalized = normalizeToPx(value);
  const parts = value.trim().split(/\s+/);

  if (parts.length === 1) {
    return { top: normalized, right: normalized, bottom: normalized, left: normalized };
  }
  if (parts.length === 2) {
    return { top: normalizeToPx(parts[0]), right: normalizeToPx(parts[1]), bottom: normalizeToPx(parts[0]), left: normalizeToPx(parts[1]) };
  }
  if (parts.length === 3) {
    return {
      top: normalizeToPx(parts[0]),
      right: normalizeToPx(parts[1]),
      bottom: normalizeToPx(parts[2]),
      left: normalizeToPx(parts[1])
    };
  }
  return {
    top: normalizeToPx(parts[0]),
    right: normalizeToPx(parts[1]),
    bottom: normalizeToPx(parts[2]),
    left: normalizeToPx(parts[3])
  };
}

export function getElementSpacing(element: Element): {
  padding: { top: number; right: number; bottom: number; left: number };
  margin: { top: number; right: number; bottom: number; left: number };
} {
  const styles = getComputedStyle(element);
  const fontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

  return {
    padding: {
      top: normalizeToPx(styles.paddingTop, fontSize),
      right: normalizeToPx(styles.paddingRight, fontSize),
      bottom: normalizeToPx(styles.paddingBottom, fontSize),
      left: normalizeToPx(styles.paddingLeft, fontSize)
    },
    margin: {
      top: normalizeToPx(styles.marginTop, fontSize),
      right: normalizeToPx(styles.marginRight, fontSize),
      bottom: normalizeToPx(styles.marginBottom, fontSize),
      left: normalizeToPx(styles.marginLeft, fontSize)
    }
  };
}

export function getElementRect(element: Element): DOMRect {
  return element.getBoundingClientRect();
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = new RegExp(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i).exec(hex);
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16)
      }
    : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export function parseColor(color: string): { r: number; g: number; b: number } | null {
  const trimmed = color.trim().toLowerCase();

  // HEX (#rgb, #rgba, #rrggbb, #rrggbbaa)
  if (trimmed.startsWith('#')) {
    return hexToRgb(trimmed);
  }

  // rgb() or rgba() — supports commas OR spaces
  const rgbRegex =
    /rgba?\(\s*([0-9.]+)\s*[, ]\s*([0-9.]+)\s*[, ]\s*([0-9.]+)(?:\s*[,/]\s*([0-9.]+))?\s*\)/;

  const match = new RegExp(rgbRegex).exec(trimmed);
  if (match) {
    return {
      r: Math.round(Number.parseFloat(match[1])),
      g: Math.round(Number.parseFloat(match[2])),
      b: Math.round(Number.parseFloat(match[3]))
    };
  }

  // Named colors or anything else CSS supports
  if (typeof document !== 'undefined') {
    const temp = document.createElement('div');
    temp.style.color = trimmed;
    document.body.appendChild(temp);

    const computed = getComputedStyle(temp).color;
    document.body.removeChild(temp);

    return parseColor(computed); // recursion resolves to rgb()
  }

  return null;
}

export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function getContrastRatio(color1: string, color2: string): number | null {
  const rgb1 = parseColor(color1);
  const rgb2 = parseColor(color2);

  if (!rgb1 || !rgb2) return null;

  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

export function isTransparent(color: string): boolean {
  if (!color) return true;
  if (color === 'transparent') return true;

  const match = new RegExp(/rgba?\(\s*([\d.]+)[^,]*,\s*([\d.]+)[^,]*,\s*([\d.]+)[^,]*,\s*([\d.]+)\s*\)/).exec(color);
  if (match) {
    const alpha = Number.parseFloat(match[4]);
    return alpha === 0;
  }

  return false;
}

export function getEffectiveBackgroundColor(el: Element, appWindow: Window): string {
  let current: Element | null = el;

  while (current) {
    const bg = appWindow.getComputedStyle(current).backgroundColor;

    if (!isTransparent(bg)) {
      return bg;
    }

    current = current.parentElement;
  }

  // No non-transparent ancestor → use page background (usually white)
  return 'rgb(255, 255, 255)';
}

export const CONTRAST_RANK = {
  fail: 0,
  A: 1,
  AA: 2,
  AAA: 3
} as const;

export type ContrastLevel = 'AAA' | 'AA' | 'A' | 'fail';

export const CONTRAST_THRESHOLDS = {
  AAA: { normal: 7, large: 4.5 },
  AA: { normal: 4.5, large: 3 },
  A: { normal: 3, large: 0 },
  fail: { normal: Infinity, large: Infinity }
};

export function getContrastLevel(ratio: number, isLargeText: boolean = false): ContrastLevel {
  if (ratio >= (isLargeText ? CONTRAST_THRESHOLDS.AAA.large : CONTRAST_THRESHOLDS.AAA.normal)) {
    return 'AAA';
  }
  if (ratio >= (isLargeText ? CONTRAST_THRESHOLDS.AA.large : CONTRAST_THRESHOLDS.AA.normal)) {
    return 'AA';
  }
  if (ratio >= (isLargeText ? CONTRAST_THRESHOLDS.A.large : CONTRAST_THRESHOLDS.A.normal)) {
    return 'A';
  }
  return 'fail';
}

export function meetsContrastRequirement(ratio: number, level: ContrastLevel, isLargeText: boolean = false): boolean {
  const thresholds = CONTRAST_THRESHOLDS[level];
  const required = isLargeText ? thresholds.large : thresholds.normal;
  return ratio >= required;
}

export interface TaskRecord {
  event: 'check' | 'violation';
  type: string;
  taxonomy: string;
  token?: string;
  property?: string;
  expected: string | null;
  actual: string;
  severity: string;
  element: string;
  selector?: string;
  scenario: string;
  feature: string;
  timestamp: number;
}

export function recordTask(record: TaskRecord): void {
  cy.task('uiux:record', record);
}

export function createTaskRecord(
  event: 'check' | 'violation',
  type: string,
  taxonomy: string,
  actual: string,
  element: string,
  options: {
    token?: string;
    property?: string;
    expected?: string | null;
    selector?: string;
  } = {}
): TaskRecord {
  return {
    event,
    type,
    taxonomy,
    token: options.token,
    property: options.property,
    expected: options.expected ?? null,
    actual,
    severity: getSeverity(taxonomy, event),
    element,
    selector: options.selector,
    scenario: Cypress.currentTest.title,
    feature: Cypress.spec.relative,
    timestamp: Date.now()
  };
}

const UX_TAXONOMY_MAP: Record<string, string> = {
  'font-size': 'typography',
  'font-weight': 'typography',
  'line-height': 'typography',
  'letter-spacing': 'typography',
  'font-family': 'typography',
  'color': 'color',
  'background-color': 'color',
  'border-color': 'border',
  'border-width': 'border',
  'border-radius': 'border',
  'padding': 'spacing',
  'padding-top': 'spacing',
  'padding-right': 'spacing',
  'padding-bottom': 'spacing',
  'padding-left': 'spacing',
  'margin': 'spacing',
  'margin-top': 'spacing',
  'margin-right': 'spacing',
  'margin-bottom': 'spacing',
  'margin-left': 'spacing',
  'width': 'layout',
  'height': 'layout',
  'min-width': 'layout',
  'min-height': 'layout',
  'max-width': 'layout',
  'max-height': 'layout',
  'spacing': 'spacing',
  'alignment': 'alignment',
  'contrast': 'contrast'
};

export const getTaxonomy = (property: string): string =>
  UX_TAXONOMY_MAP[property] || 'style';

const UX_SEVERITY_MAP: Record<string, string> = {
  color: 'critical',
  contrast: 'critical',
  typography: 'major',
  spacing: 'minor',
  border: 'minor',
  layout: 'minor',
  alignment: 'minor',
  'token-missing': 'major',
  'style-mismatch': 'major',
  'style-check': 'info'
};

export const getSeverity = (taxonomy: string, event: 'check' | 'violation'): string => {
  if (event === 'check') return 'info';
  return UX_SEVERITY_MAP[taxonomy] || 'major';
};

export const TOKEN_STYLE_PROPERTIES: CssProperty[] = [
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'font-family',
  'color',
  'background-color',
  'border-color',
  'border-width',
  'border-radius'
];

export const TYPOGRAPHY_PROPERTIES: CssProperty[] = [
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'font-family'
];

export const SPACING_PROPERTIES: CssProperty[] = [
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left'
];

export const COLOR_PROPERTIES: CssProperty[] = [
  'color',
  'background-color',
  'border-color'
];

export const LAYOUT_PROPERTIES: CssProperty[] = [
  'width',
  'height',
  'min-width',
  'min-height',
  'max-width',
  'max-height'
];
