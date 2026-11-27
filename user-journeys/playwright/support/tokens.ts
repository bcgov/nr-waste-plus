import { expect, type Locator, type Page } from "@playwright/test";

import type { UiuxRecorder } from "../fixtures/uiux.fixture.ts";

export type CssProperty =
  | "font-size"
  | "font-weight"
  | "line-height"
  | "letter-spacing"
  | "font-family"
  | "color"
  | "background-color"
  | "border-color"
  | "border-width"
  | "border-radius"
  | "padding"
  | "padding-top"
  | "padding-right"
  | "padding-bottom"
  | "padding-left"
  | "margin"
  | "margin-top"
  | "margin-right"
  | "margin-bottom"
  | "margin-left"
  | "width"
  | "height"
  | "min-width"
  | "min-height"
  | "max-width"
  | "max-height";

export type ContrastLevel = "AAA" | "AA" | "A" | "fail";

export const TOKEN_PREFIX = "--cds-";

/** `$layout-04` -> `--cds-layout-04` (the mapping in tokens.helpers.ts). */
export function tokenVar(name: string): string {
  let cleanName = name.trim();
  if (cleanName.startsWith(TOKEN_PREFIX)) return cleanName;
  if (cleanName.startsWith("$")) cleanName = cleanName.substring(1);
  cleanName = cleanName.replace(/^cds--/, "");
  return `${TOKEN_PREFIX}${cleanName}`;
}

export const tokenToCssVar = tokenVar;

export function propertyFromToken(tokenName: string, currentToken: string): string {
  const baseToken = tokenVar(tokenName);
  if (currentToken.startsWith(`${baseToken}-`)) {
    return currentToken.replace(`${baseToken}-`, "");
  }
  return currentToken;
}

/** Cypress tried `--cds-<token>-<property>` before the base `--cds-<token>`. */
export function pickTokenVar(
  baseVar: string,
  property: string,
  values: Readonly<Record<string, string>>,
): string {
  const specific = `${baseVar}-${property}`;
  return (values[specific] ?? "").trim() ? specific : baseVar;
}

export function normalizeToPx(value: string, fontSize = 16): number {
  const trimmed = value.trim();
  if (trimmed.endsWith("px")) return Number.parseFloat(trimmed);
  if (trimmed.endsWith("rem")) return Number.parseFloat(trimmed) * fontSize;
  if (trimmed.endsWith("em")) return Number.parseFloat(trimmed) * fontSize;
  return Number.parseFloat(trimmed);
}

export function pxToRem(px: number, fontSize = 16): number {
  return px / fontSize;
}

export function isColorValue(value: string): boolean {
  if (!value) return false;
  const trimmed = value.trim().toLowerCase();
  return (
    trimmed.startsWith("#") ||
    trimmed.startsWith("rgb") ||
    trimmed.startsWith("hsl") ||
    isNamedColor(trimmed)
  );
}

function isNamedColor(name: string): boolean {
  const namedColors = [
    "black", "silver", "gray", "grey", "white", "maroon", "red", "purple",
    "fuchsia", "green", "lime", "olive", "yellow", "navy", "blue", "teal",
    "aqua", "orange", "pink", "brown", "transparent", "inherit", "initial",
    "currentcolor", "none",
  ];
  return namedColors.includes(name);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((value) => {
      const hex = Math.round(value).toString(16);
      return hex.length === 1 ? `0${hex}` : hex;
    })
    .join("")}`;
}

export function parseColor(color: string): { r: number; g: number; b: number } | null {
  const trimmed = color.trim().toLowerCase();
  if (trimmed.startsWith("#")) return hexToRgb(trimmed);

  const rgbRegex =
    /rgba?\(\s*([0-9.]+)\s*[, ]\s*([0-9.]+)\s*[, ]\s*([0-9.]+)(?:\s*[,/]\s*([0-9.]+))?\s*\)/;
  const match = rgbRegex.exec(trimmed);
  if (match) {
    return {
      r: Math.round(Number.parseFloat(match[1])),
      g: Math.round(Number.parseFloat(match[2])),
      b: Math.round(Number.parseFloat(match[3])),
    };
  }

  if (typeof document !== "undefined") {
    const temp = document.createElement("div");
    temp.style.color = trimmed;
    document.body.appendChild(temp);
    const computed = getComputedStyle(temp).color;
    document.body.removeChild(temp);
    return parseColor(computed);
  }

  return null;
}

export function colorsMatch(
  color1: string,
  color2: string,
  tolerance = 0,
): boolean {
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

export function valuesMatch(
  tokenValue: string | null,
  elementValue: string,
  fontSize = 16,
  tolerance = 0.5,
): boolean {
  if (!tokenValue) return false;
  if (isColorValue(tokenValue) && isColorValue(elementValue)) {
    return colorsMatch(tokenValue, elementValue);
  }
  const tokenPx = normalizeToPx(tokenValue, fontSize);
  const elementPx = normalizeToPx(elementValue, fontSize);
  return Math.abs(tokenPx - elementPx) < tolerance;
}

export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
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
  if (!color || color === "transparent") return true;
  const match = /rgba?\(\s*([\d.]+)[^,]*,\s*([\d.]+)[^,]*,\s*([\d.]+)[^,]*,\s*([\d.]+)\s*\)/.exec(
    color,
  );
  if (match) return Number.parseFloat(match[4]) === 0;
  return false;
}

export const CONTRAST_RANK = {
  fail: 0,
  A: 1,
  AA: 2,
  AAA: 3,
} as const;

export const CONTRAST_THRESHOLDS = {
  AAA: { normal: 7, large: 4.5 },
  AA: { normal: 4.5, large: 3 },
  A: { normal: 3, large: 0 },
  fail: { normal: Infinity, large: Infinity },
} as const;

export function getContrastLevel(
  ratio: number,
  isLargeText = false,
): ContrastLevel {
  if (
    ratio >=
    (isLargeText ? CONTRAST_THRESHOLDS.AAA.large : CONTRAST_THRESHOLDS.AAA.normal)
  ) {
    return "AAA";
  }
  if (
    ratio >=
    (isLargeText ? CONTRAST_THRESHOLDS.AA.large : CONTRAST_THRESHOLDS.AA.normal)
  ) {
    return "AA";
  }
  if (
    ratio >=
    (isLargeText ? CONTRAST_THRESHOLDS.A.large : CONTRAST_THRESHOLDS.A.normal)
  ) {
    return "A";
  }
  return "fail";
}

export function meetsContrastRequirement(
  ratio: number,
  level: ContrastLevel,
  isLargeText = false,
): boolean {
  const thresholds = CONTRAST_THRESHOLDS[level];
  return ratio >= (isLargeText ? thresholds.large : thresholds.normal);
}

const UX_TAXONOMY_MAP: Readonly<Record<string, string>> = {
  "font-size": "typography",
  "font-weight": "typography",
  "line-height": "typography",
  "letter-spacing": "typography",
  "font-family": "typography",
  color: "color",
  "background-color": "color",
  "border-color": "border",
  "border-width": "border",
  "border-radius": "border",
  padding: "spacing",
  "padding-top": "spacing",
  "padding-right": "spacing",
  "padding-bottom": "spacing",
  "padding-left": "spacing",
  margin: "spacing",
  "margin-top": "spacing",
  "margin-right": "spacing",
  "margin-bottom": "spacing",
  "margin-left": "spacing",
  width: "layout",
  height: "layout",
  "min-width": "layout",
  "min-height": "layout",
  "max-width": "layout",
  "max-height": "layout",
  spacing: "spacing",
  alignment: "alignment",
  contrast: "contrast",
};

export const getTaxonomy = (property: string): string =>
  UX_TAXONOMY_MAP[property] ?? "style";

export type Severity = "info" | "minor" | "major" | "critical";

const UX_SEVERITY_MAP: Readonly<Record<string, Severity>> = {
  color: "critical",
  contrast: "critical",
  typography: "major",
  spacing: "minor",
  border: "minor",
  layout: "minor",
  alignment: "minor",
  "token-missing": "major",
  "style-mismatch": "major",
  "style-check": "info",
};

export const getSeverity = (
  taxonomy: string,
  event: "check" | "violation",
): Severity => {
  if (event === "check") return "info";
  return UX_SEVERITY_MAP[taxonomy] ?? "major";
};

export const TOKEN_STYLE_PROPERTIES: readonly CssProperty[] = [
  "font-size", "font-weight", "line-height", "letter-spacing", "font-family",
  "color", "background-color", "border-color", "border-width", "border-radius",
];

export const TYPOGRAPHY_PROPERTIES: readonly CssProperty[] = [
  "font-size", "font-weight", "line-height", "letter-spacing", "font-family",
];

export const SPACING_PROPERTIES: readonly CssProperty[] = [
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
];

export const COLOR_PROPERTIES: readonly CssProperty[] = [
  "color", "background-color", "border-color",
];

export const LAYOUT_PROPERTIES: readonly CssProperty[] = [
  "width", "height", "min-width", "min-height", "max-width", "max-height",
];

/** Properties a token's CSS variable supplies, with the Cypress fallback order. */
export async function tokenVarForProperty(
  page: Page,
  tokenName: string,
  property: string,
): Promise<string> {
  const baseVar = tokenVar(tokenName);
  const values = await page.evaluate(
    ({ baseVar, property }) => {
      const root = getComputedStyle(document.documentElement);
      return {
        [baseVar]: root.getPropertyValue(baseVar),
        [`${baseVar}-${property}`]: root.getPropertyValue(`${baseVar}-${property}`),
      };
    },
    { baseVar, property },
  );
  return pickTokenVar(baseVar, property, values);
}

/**
 * D-020: resolve a token on the live page with a block probe. A span would
 * compute `height`/`width` as `auto`, so layout tokens could never resolve.
 */
export async function resolveToken(
  locator: Locator,
  cssProp: string,
  tokenVarName: string,
): Promise<string> {
  return locator.evaluate(
    (element, { prop, token }) => {
      const probe = document.createElement("div");
      probe.style.position = "absolute";
      probe.style.visibility = "hidden";
      probe.style.display = "block";
      probe.style.setProperty(prop, `var(${token})`);
      (element.parentElement ?? document.body).appendChild(probe);
      const value = getComputedStyle(probe).getPropertyValue(prop).trim();
      probe.remove();
      return value;
    },
    { prop: cssProp, token: tokenVarName },
  );
}

export function computedProperty(locator: Locator, property: string): Promise<string> {
  return locator.evaluate(
    (element, prop) => getComputedStyle(element).getPropertyValue(prop).trim(),
    property,
  );
}

export function rootFontSize(locator: Locator): Promise<number> {
  return locator.evaluate(
    () => Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16,
  );
}

/** Effective (first non-transparent ancestor) background colour. */
export function effectiveBackgroundColor(locator: Locator): Promise<string> {
  return locator.evaluate((element) => {
    let current: Element | null = element;
    while (current) {
      const background = getComputedStyle(current).backgroundColor;
      if (!isTransparentInline(background)) return background;
      current = current.parentElement;
    }
    return "rgb(255, 255, 255)";

    function isTransparentInline(color: string): boolean {
      if (!color || color === "transparent") return true;
      const match =
        /rgba?\(\s*([\d.]+)[^,]*,\s*([\d.]+)[^,]*,\s*([\d.]+)[^,]*,\s*([\d.]+)\s*\)/.exec(
          color,
        );
      return match ? Number.parseFloat(match[4]) === 0 : false;
    }
  });
}

export interface UiuxElementMeta {
  element: string;
  selector: string;
}

/** A-004 / OQ-014: every soft assertion also emits one per-property event. */
export async function expectTokens(
  locator: Locator,
  map: Readonly<Record<string, string>>,
  uiux: UiuxRecorder,
  meta: UiuxElementMeta,
): Promise<void> {
  const page = locator.page();
  const fontSize = await rootFontSize(locator);
  for (const [property, token] of Object.entries(map)) {
    const varName = await tokenVarForProperty(page, token, property);
    const expected = await resolveToken(locator, property, varName);
    const actual = await computedProperty(locator, property);
    const isMissing = !expected;
    const isMismatch = !valuesMatch(expected || null, actual, fontSize);
    const event: "check" | "violation" =
      isMissing || isMismatch ? "violation" : "check";
    const type = isMissing
      ? "token-missing"
      : isMismatch
        ? "style-mismatch"
        : "style-check";
    const taxonomy = getTaxonomy(property);
    await uiux.record({
      event,
      type,
      taxonomy,
      severity: getSeverity(taxonomy, event),
      property,
      expected: expected || null,
      actual,
      element: meta.element,
      selector: meta.selector,
    });

    if (isMissing) {
      expect.soft(expected, `Token '${token}' is not defined (tried ${varName}).`).not.toBe("");
    } else {
      await expect.soft(locator).toHaveCSS(property, expected);
    }
  }
}

/** Pure filter behind the missing-token guard. */
export function emptyTokenVars(
  vars: readonly string[],
  values: Readonly<Record<string, string>>,
): string[] {
  return vars.filter((name) => !(values[name] ?? "").trim());
}

/** Guard against silently deleted tokens: empty `:root` values fail the step. */
export async function missingTokens(
  page: Page,
  names: readonly string[],
): Promise<string[]> {
  const vars = names.map(tokenVar);
  const values = await page.evaluate((candidates) => {
    const root = getComputedStyle(document.documentElement);
    return Object.fromEntries(
      candidates.map((name) => [name, root.getPropertyValue(name)]),
    );
  }, vars);
  const missingVars = emptyTokenVars(vars, values);
  return names.filter((_, index) => missingVars.includes(vars[index]));
}
