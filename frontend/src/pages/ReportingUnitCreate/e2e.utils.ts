import { expect, type Page } from '@playwright/test';

/**
 * Blurs any focused element to avoid focus-driven race conditions in
 * TanStack Form before clicking a submit button.
 *
 * When a Carbon ComboBox has focus and the submit button is clicked, the
 * browser fires `blur` on the ComboBox **before** the `click` event. The
 * blur triggers the field's `onBlurAsync` validator, which sets
 * `isValidating = true` synchronously in the form store. By the time the
 * click handler runs `form.handleSubmit()`, `canSubmit` is `false`, and
 * the submission is silently aborted.
 *
 * Blurring the active element first lets validators settle so the submit
 * button is truly enabled when clicked.
 *
 * @param page Playwright page.
 */
export const blurActiveElement = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
};

/**
 * Selects an option from a Carbon ComboBox by clicking the option directly.
 * This avoids Carbon keyboard-navigation quirks that can select the wrong item.
 *
 * @param page        Playwright page.
 * @param comboBoxName Accessible name of the combobox (matches the visible label text).
 * @param optionText  Visible text of the option to select.
 */
export const selectComboBoxOption = async (
  page: Page,
  comboBoxName: string,
  optionText: string,
): Promise<void> => {
  await page.getByRole('combobox', { name: comboBoxName }).click({ force: true });
  await page.getByRole('option', { name: optionText }).click();
};

/**
 * Selects a client from the client input field based on the user type.
 *
 * - BCeID users: opens the ActiveMultiSelect and clicks an option. The
 *   dropdown is closed with Escape and a short yield is added because
 *   ActiveMultiSelect defers `onChange` via `queueMicrotask`.
 * - IDIR users: fills the autocomplete and waits for options to appear.
 *
 * @param page     Playwright page.
 * @param userType Value from `testInfo.project.metadata.userType` ('bceid' | 'idir').
 */
export const selectClient = async (page: Page, userType: string): Promise<void> => {
  if (userType === 'bceid') {
    await page.getByRole('combobox', { name: 'Client' }).click();
    await page.getByRole('option', { name: '90000001', exact: false }).click();
    await page.keyboard.press('Escape'); // Close the dropdown
    // ActiveMultiSelect defers onChange via queueMicrotask; yield before the next interaction
    await page.waitForTimeout(200);
  } else {
    await page.getByRole('combobox', { name: 'Client' }).fill('ZORO');
    await page.getByRole('option', { name: 'RORONOA ZORO SAWMILLS', exact: false }).click();
  }
};

/**
 * Fills in all required form fields with valid data and clicks the Create button.
 * Does NOT mock the POST endpoint — each test is responsible for that.
 *
 * Handles the TanStack Form `isValidating` race by focusing the submit button
 * before asserting enabled. Clicking the button fires a blur on the previously
 * focused field, which schedules a validator via `setTimeout(0)` and briefly
 * sets `canSubmit=false`. Focusing first flushes those validators before the
 * `toBeEnabled` check.
 *
 * @param page     Playwright page.
 * @param userType Value from `testInfo.project.metadata.userType` ('bceid' | 'idir').
 */
export const fillFormAndSubmit = async (page: Page, userType: string): Promise<void> => {
  // Select district (non-DKM)
  await selectComboBoxOption(page, 'District', 'Cariboo-Chilcotin');

  // Select sampling option
  await selectComboBoxOption(page, 'Sampling option', 'Ocular');

  // Select client
  await selectClient(page, userType);

  // Blur any focused element first to let field validators settle
  // (avoids a TanStack Form race where blur → onBlurAsync → isValidating →
  // canSubmit=false).
  await blurActiveElement(page);

  // Wait for the submit button to be enabled (all field validators have passed).
  const submitButton = page.getByRole('button', { name: 'Create' });
  await expect(submitButton).toBeEnabled({ timeout: 5000 });

  await submitButton.click();
};
