/**
 * Label-based field resolution for the submission-details blocks.
 *
 * Values are read through the visible/accessible label text — never through
 * `data-testid` — so scenarios assert what a user reads. Two DOM shapes exist
 * on these screens:
 *
 * 1. ReadonlyInput cards: `<dl class="card-item"><dt>{label}</dt><dd>{value}</dd></dl>`
 * 2. Carbon form controls: `<label for="{id}">` associated with an
 *    input/textarea/button (combobox, date picker, toggle switch)
 *
 * Every lookup is a single bounded `cy.get().should()` (the same pattern as
 * `findButton`): the assertion retries against the live DOM until the label
 * renders or the timeout ceiling is hit, so it tolerates the Vite SPA's async
 * React-Query render race without blind waits.
 */

const CONTENT_TIMEOUT = 30 * 1000;

/** Grid column wrapper Carbon renders around every field in a `Grid`/`Column` layout. */
const GRID_COLUMN_SELECTOR = ".cds--css-grid-column";

/**
 * A resolved field value element.
 * - `card`: the `<dd>` of a ReadonlyInput card (value is text content).
 * - `control`: the form control associated with a Carbon `<label>` (value is
 *   the input/textarea `value`, or the switch's `aria-checked`).
 */
export interface FieldTarget {
  kind: "card" | "control";
  $value: JQuery<HTMLElement>;
}

const byExactText = (
  $elements: JQuery<HTMLElement>,
  labelText: string,
): JQuery<HTMLElement> =>
  $elements.filter(
    (_index, element) => (element.textContent ?? "").trim() === labelText,
  );

/**
 * Resolves the value element behind a field label, synchronously against the
 * current DOM. Returns `null` while the field has not rendered yet.
 *
 * Priority: ReadonlyInput `<dt>` → Carbon `<label for>` → Carbon label sharing
 * a `.cds--form-item` container with its control.
 */
const locateField = (labelText: string): FieldTarget | null => {
  const $scope = Cypress.$("body");

  const $dt = byExactText($scope.find("dt"), labelText).first();
  if ($dt.length > 0) {
    const $dd = $dt.next("dd");
    if ($dd.length > 0) {
      return { kind: "card", $value: $dd };
    }
  }

  const $label = byExactText($scope.find("label"), labelText).first();
  if ($label.length === 0) {
    return null;
  }

  const forId = $label.attr("for");
  if (forId) {
    const $control = $scope.find(`#${CSS.escape(forId)}`).first();
    if ($control.length > 0) {
      return { kind: "control", $value: $control };
    }
  }

  const $contained = $label
    .closest(".cds--form-item")
    .find("input, textarea")
    .first();
  return $contained.length > 0 ? { kind: "control", $value: $contained } : null;
};

/**
 * Finds a field by its visible/accessible label text and yields its value
 * element (ReadonlyInput `<dd>` or the associated form control).
 *
 * @param labelText Exact label text as rendered on screen.
 */
export const findFieldByLabel = (
  labelText: string,
): Cypress.Chainable<FieldTarget> =>
  cy
    .get("body", { timeout: CONTENT_TIMEOUT })
    .should(() => {
      expect(locateField(labelText), `field "${labelText}" is rendered`).to
        .exist;
    })
    .then(() => cy.wrap(locateField(labelText) as FieldTarget));

/**
 * Finds the Carbon grid column that hosts a field, located through the
 * field's label text (never a test id or generated class name).
 *
 * @param labelText Exact label text as rendered on screen.
 */
export const findFieldColumnByLabel = (
  labelText: string,
): Cypress.Chainable<JQuery<HTMLElement>> =>
  findFieldByLabel(labelText).then((field) => {
    const $column = field.$value.closest(GRID_COLUMN_SELECTOR);
    expect(
      $column.length,
      `grid column hosting field "${labelText}"`,
    ).to.be.greaterThan(0);
    return cy.wrap($column.first());
  });

/**
 * Resolves the toggle switch controlled by a visible label text.
 *
 * Supports both Carbon v11 shapes: `<button role="switch" aria-checked>` and
 * a plain checkbox input.
 *
 * @param labelText Exact label text as rendered on screen.
 */
export const findToggleByLabel = (
  labelText: string,
): Cypress.Chainable<JQuery<HTMLElement>> =>
  cy
    .get("body", { timeout: CONTENT_TIMEOUT })
    .should(() => {
      expect(locateToggle(labelText), `toggle "${labelText}" is rendered`).to
        .exist;
    })
    .then(() => cy.wrap(Cypress.$(locateToggle(labelText) as HTMLElement)));

const locateToggle = (labelText: string): HTMLElement | null => {
  const $scope = Cypress.$("body");
  const $label = byExactText($scope.find("label"), labelText).first();
  if ($label.length === 0) {
    return null;
  }

  const forId = $label.attr("for");
  if (!forId) {
    return null;
  }

  const control = $scope.find(`#${CSS.escape(forId)}`)[0];
  if (!control) {
    return null;
  }

  const isSwitch = control.getAttribute("aria-checked") !== null;
  const isCheckbox =
    control instanceof HTMLInputElement && control.type === "checkbox";
  return isSwitch || isCheckbox ? control : null;
};
