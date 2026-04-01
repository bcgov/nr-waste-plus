/* eslint-disable no-undef */
/// <reference types="cypress" />

import { 
  logAndScreenshot,
  runLighthouseAudit,
  validateContrast,
  validateStyle,
  validateTokenStyle,
  validateTypography,
  waitForPageLoad
} from "./helpers";

Cypress.Commands.add('waitForPageLoad', waitForPageLoad);
Cypress.Commands.add('logAndScreenshot', logAndScreenshot);

Cypress.Commands.add('runLighthouseAudit', runLighthouseAudit);

Cypress.Commands.add('validateStyle',{ prevSubject: true }, validateStyle);
Cypress.Commands.add('validateTokenStyle',{ prevSubject: true }, validateTokenStyle);
Cypress.Commands.add('validateContrast',{ prevSubject: true }, validateContrast);
Cypress.Commands.add('validateTypography', { prevSubject: true }, validateTypography);