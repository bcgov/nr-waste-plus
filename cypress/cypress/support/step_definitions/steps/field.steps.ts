import { Then } from "@badeball/cypress-cucumber-preprocessor";
import { findFieldByLabel, findToggleByLabel } from "../../helpers";

/**
 * Field-value steps.
 *
 * Values are resolved through the field's visible label text — never through
 * `data-testid` — so each assertion checks what a user reads on screen.
 *
 * The label lookup is bounded (30 s ceiling in the helper) and resolves the
 * instant the React-Query content renders, matching the suite's async-render
 * contract in text.steps.ts.
 */

Then("the field {string} shows {string}", (label: string, expected: string) => {
  findFieldByLabel(label).then((field) => {
    const control = field.$value[0];
    if (
      field.kind === "control" &&
      (control instanceof HTMLInputElement ||
        control instanceof HTMLTextAreaElement)
    ) {
      expect(control.value, `field "${label}"`).to.eq(expected);
      return;
    }
    expect((field.$value.text() ?? "").trim(), `field "${label}"`).to.eq(
      expected,
    );
  });
});

/**
 * Asserts a Carbon toggle's state through its label. The switch exposes its
 * state via `aria-checked` (or `checked` for checkbox variants); the visible
 * "No"/"Yes" text is aria-hidden, so the semantic attribute is the source of
 * truth.
 */
const assertToggleState = (label: string, expected: string) => {
  findToggleByLabel(label).then(($control) => {
    const control = $control[0];
    const state =
      control.getAttribute("aria-checked") ??
      String((control as HTMLInputElement).checked);
    expect(state, `toggle "${label}" state`).to.eq(expected);
  });
};

Then("the toggle {string} is off", (label: string) => {
  assertToggleState(label, "false");
});

Then("the toggle {string} is on", (label: string) => {
  assertToggleState(label, "true");
});
