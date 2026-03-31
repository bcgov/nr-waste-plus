
import {
  getElementSpacing,
  getElementRect,
  normalizeToPx,
  parseSpacingValue
} from '../tokens';

export interface ElementTarget {
  text?: string;
  selector?: string;
  elementType?: 'button' | 'heading' | 'link' | 'input' | 'label' | 'paragraph' | 'container' | 'image' | 'icon';
}

export type Direction = 'top' | 'right' | 'bottom' | 'left';

export const DIRECTION_ALIASES: Record<string, Direction> = {
  'top': 'top',
  't': 'top',
  'upper': 'top',
  'above': 'top',
  'right': 'right',
  'r': 'right',
  'bottom': 'bottom',
  'b': 'bottom',
  'lower': 'bottom',
  'below': 'bottom',
  'left': 'left',
  'l': 'left'
};

export function resolveElement(target: ElementTarget): Cypress.Chainable<JQuery> {
  if (target.selector) {
    return cy.get(target.selector);
  }

  if (target.elementType && target.text) {
    return resolveElementByType(target.elementType, target.text);
  }

  if (target.text) {
    return cy.contains(target.text);
  }

  throw new Error('No valid selector, element type, or text provided');
}

function resolveElementByType(type: ElementTarget['elementType'], text: string): Cypress.Chainable<JQuery> {
  switch (type) {
    case 'button':
      return resolveButton(text);
    case 'heading':
      return findHeading(text);
    case 'link':
      return resolveLink(text);
    case 'input':
      return resolveInput(text);
    case 'label':
      return findLabel(text);
    case 'paragraph':
      return cy.contains('p', text);
    case 'container':
      return findContainer(text);
    case 'image':
      return findImage(text);
    case 'icon':
      return findIcon(text);
    default:
      return cy.contains(text);
  }
}

function resolveButton(text: string): Cypress.Chainable<JQuery> {
  return cy.contains('button', text, { matchCase: false }).first();
}

function resolveLink(text: string): Cypress.Chainable<JQuery> {
  return cy.contains('a', text, { matchCase: false }).first();
}

function resolveInput(text: string): Cypress.Chainable<JQuery> {
  return cy.get(`input[placeholder*="${text}"], input[aria-label*="${text}"]`).first();
}

export function findHeading(text: string): Cypress.Chainable<JQuery> {
  return cy.contains('h1,h2,h3,h4,h5,h6', text, { matchCase: false });
}

export function findLabel(text: string): Cypress.Chainable<JQuery> {
  return cy.contains('label', text, { matchCase: false });
}

export function findContainer(text: string): Cypress.Chainable<JQuery> {
  return cy.contains('div,section,article,main,aside,header,footer,nav', text, { matchCase: false }).first();
}

export function findImage(text: string): Cypress.Chainable<JQuery> {
  return cy.get(`img[alt*="${text}"], svg[aria-label*="${text}"]`);
}

export function findIcon(text: string): Cypress.Chainable<JQuery> {
  return cy.get(`[aria-label*="${text}"], svg[class*="${text}"]`);
}

export function parseDirection(input: string): Direction | 'all' {
  const normalized = input.toLowerCase().trim();
  if (normalized === 'all' || normalized === '*') {
    return 'all';
  }
  return DIRECTION_ALIASES[normalized] || 'top';
}

export function getSpacingDifference(
  actual: { top: number; right: number; bottom: number; left: number },
  expected: { top: number; right: number; bottom: number; left: number }
): { top: number; right: number; bottom: number; left: number } {
  return {
    top: actual.top - expected.top,
    right: actual.right - expected.right,
    bottom: actual.bottom - expected.bottom,
    left: actual.left - expected.left
  };
}

export function getSpacingDifferenceFromValues(
  actualValue: string,
  expectedValue: string,
  direction: Direction | 'all',
  fontSize: number = 16
): number | { top: number; right: number; bottom: number; left: number } {
  const actual = parseSpacingValue(actualValue);
  const expected = parseSpacingValue(expectedValue);

  if (direction === 'all') {
    return {
      top: actual.top - expected.top,
      right: actual.right - expected.right,
      bottom: actual.bottom - expected.bottom,
      left: actual.left - expected.left
    };
  }

  return actual[direction] - expected[direction];
}

export function validateSpacing(
  element: Element,
  type: 'padding' | 'margin',
  direction: Direction | 'all',
  expectedValue: string,
  fontSize: number = 16
): { valid: boolean; actual: number; expected: number; diff: number } {
  const spacing = getElementSpacing(element);
  const spacingType = type === 'padding' ? spacing.padding : spacing.margin;
  const expected = parseSpacingValue(expectedValue);

  const actual = direction === 'all'
    ? spacingType
    : { top: spacingType.top, right: spacingType.right, bottom: spacingType.bottom, left: spacingType.left }[direction];

  const expectedVal = direction === 'all'
    ? expected
    : { top: expected.top, right: expected.right, bottom: expected.bottom, left: expected.left }[direction];

  const diff = typeof actual === 'object'
    ? getSpacingDifference(actual as any, expectedVal as any)
    : (actual as number) - (expectedVal as number);

  if (direction === 'all') {
    const tolerances = { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 };
    const diffObj = diff as { top: number; right: number; bottom: number; left: number };
    const valid = Object.keys(diffObj).every(key => Math.abs(diffObj[key as keyof typeof diffObj]) < tolerances[key as keyof typeof tolerances]);
    const firstActual = actual as unknown as { top: number; right: number; bottom: number; left: number };
    return { valid, actual: firstActual.top, expected: firstActual.top, diff: diffObj.top };
  }

  return {
    valid: Math.abs((actual as number) - (expectedVal as number)) < 0.5,
    actual: actual as number,
    expected: expectedVal as number,
    diff: diff as number
  };
}

export function getElementPosition(element: Element): {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
} {
  const rect = getElementRect(element);
  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height
  };
}

export function getViewportDimensions(): { width: number; height: number } {
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
}

export function calculateVerticalCenter(element: Element): number {
  const rect = getElementRect(element);
  return rect.top + rect.height / 2;
}

export function calculateHorizontalCenter(element: Element): number {
  const rect = getElementRect(element);
  return rect.left + rect.width / 2;
}

export function isElementVerticallyAligned(element1: Element, element2: Element, tolerance: number = 2): boolean {
  const center1 = calculateVerticalCenter(element1);
  const center2 = calculateVerticalCenter(element2);
  return Math.abs(center1 - center2) <= tolerance;
}

export function isElementHorizontallyAligned(element1: Element, element2: Element, tolerance: number = 2): boolean {
  const center1 = calculateHorizontalCenter(element1);
  const center2 = calculateHorizontalCenter(element2);
  return Math.abs(center1 - center2) <= tolerance;
}

export function isElementCenteredHorizontally(element: Element, container: Element | null = null): boolean {
  const rect = getElementRect(element);
  const viewportWidth = window.innerWidth;

  if (container) {
    const containerRect = getElementRect(container);
    const center = (rect.left + rect.right) / 2;
    const containerCenter = (containerRect.left + containerRect.right) / 2;
    return Math.abs(center - containerCenter) <= 2;
  }

  const center = (rect.left + rect.right) / 2;
  return Math.abs(center - viewportWidth / 2) <= 2;
}

export function isElementCenteredVertically(element: Element, container: Element | null = null): boolean {
  const rect = getElementRect(element);
  const viewportHeight = window.innerHeight;

  if (container) {
    const containerRect = getElementRect(container);
    const center = (rect.top + rect.bottom) / 2;
    const containerCenter = (containerRect.top + containerRect.bottom) / 2;
    return Math.abs(center - containerCenter) <= 2;
  }

  const center = (rect.top + rect.bottom) / 2;
  return Math.abs(center - viewportHeight / 2) <= 2;
}

export function hasMinSpacing(element1: Element, element2: Element, direction: Direction, minPx: number): boolean {
  const rect1 = getElementRect(element1);
  const rect2 = getElementRect(element2);

  switch (direction) {
    case 'top':
      return rect2.bottom - rect1.top >= minPx;
    case 'bottom':
      return rect1.bottom - rect2.top >= minPx;
    case 'left':
      return rect2.left - rect1.right >= minPx;
    case 'right':
      return rect1.right - rect2.left >= minPx;
  }
}
