import { Given, Then } from "@badeball/cypress-cucumber-preprocessor";
import { findFieldColumnByLabel } from "../../helpers";

/**
 * Field-layout steps.
 *
 * Columns are resolved through each field's visible label text and measured
 * against the Carbon grid column boxes, so these steps pin the responsive
 * spans the screens were designed with (#1239 read-only alignment) without
 * depending on test ids or generated class names.
 *
 * Assertions are pixel-tolerant (2 px) and only meaningful at the viewport the
 * scenario sets; spans intentionally change at other breakpoints.
 */

const ROW_TOLERANCE_PX = 2;

/**
 * Largest Carbon grid gutter (16 px at most breakpoints, 32 px at `max`) plus
 * rounding slack. A full-row column may end this far inside its grid's right
 * edge, but no further.
 */
const GUTTER_TOLERANCE_PX = 40;

Given(
  "the viewport is {int} by {int} pixels",
  (width: number, height: number) => {
    cy.viewport(width, height);
  },
);

const columnTop = ($column: JQuery<HTMLElement>): number =>
  $column[0].getBoundingClientRect().top;

const columnLeft = ($column: JQuery<HTMLElement>): number =>
  $column[0].getBoundingClientRect().left;

Then(
  "the field {string} and the field {string} are on the same row",
  (first: string, second: string) => {
    findFieldColumnByLabel(first).then(($first) =>
      findFieldColumnByLabel(second).then(($second) => {
        const offset = Math.abs(columnTop($first) - columnTop($second));
        expect(
          offset,
          `vertical offset between "${first}" and "${second}"`,
        ).to.be.at.most(ROW_TOLERANCE_PX);
      }),
    );
  },
);

Then(
  "the field {string} and the field {string} are not on the same row",
  (first: string, second: string) => {
    findFieldColumnByLabel(first).then(($first) =>
      findFieldColumnByLabel(second).then(($second) => {
        const offset = Math.abs(columnTop($first) - columnTop($second));
        expect(
          offset,
          `vertical offset between "${first}" and "${second}"`,
        ).to.be.greaterThan(ROW_TOLERANCE_PX);
      }),
    );
  },
);

Then(
  "the field {string} is left-aligned with the field {string}",
  (first: string, second: string) => {
    findFieldColumnByLabel(first).then(($first) =>
      findFieldColumnByLabel(second).then(($second) => {
        const offset = Math.abs(columnLeft($first) - columnLeft($second));
        expect(
          offset,
          `left-edge offset between "${first}" and "${second}"`,
        ).to.be.at.most(ROW_TOLERANCE_PX);
      }),
    );
  },
);

Then("the field {string} spans the full row", (label: string) => {
  findFieldColumnByLabel(label).then(($column) => {
    const columnRect = $column[0].getBoundingClientRect();
    // The column's direct parent is the Carbon grid (subgrid) that owns the row.
    const gridRect = $column.parent()[0].getBoundingClientRect();

    expect(
      columnRect.left - gridRect.left,
      `left edge of "${label}" against its grid`,
    ).to.be.at.most(ROW_TOLERANCE_PX);
    expect(
      gridRect.right - columnRect.right,
      `right edge of "${label}" against its grid`,
    ).to.be.at.most(GUTTER_TOLERANCE_PX);
  });
});
