/* eslint-disable no-undef */
/// <reference types="cypress" />

import { logAndScreenshot, runLighthouseAudit, waitForPageLoad } from "./helpers";

Cypress.Commands.add('waitForPageLoad', waitForPageLoad);
Cypress.Commands.add('logAndScreenshot', logAndScreenshot);
Cypress.Commands.add('runLighthouseAudit', runLighthouseAudit);
