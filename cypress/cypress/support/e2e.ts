import './commands'
import '@testing-library/cypress/add-commands';
import 'cypress-axe';
import 'cypress-audit/commands';
import 'cypress-real-events';

Cypress.on('window:before:load', (win) => {
  // Listen to browser console logs and pass them to the Cypress console
  const originalConsoleLog = win.console.log;
  win.console.log = (...args) => {
    originalConsoleLog(...args);
    // Pass logs to Cypress terminal
    Cypress.log({
      name: 'console.log',
      message: [...args],
    });
  };
});

Cypress.on('uncaught:exception', (err, runnable) => {
  console.log(err);

  // Only ignore known, non-breaking third-party errors.
  // Adjust the condition below to match specific benign errors in your app.
  if (err?.message?.includes('ResizeObserver')) {
    return false;
  }

  // Let all other errors fail the test so real regressions are not hidden.
  return true;
})