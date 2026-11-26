import { test as base, createBdd } from "playwright-bdd";

import {
  createA11yRecorder,
  type A11yRecorder,
} from "./a11y.fixture.ts";
import {
  createLighthouseRecorder,
  type LighthouseRecorder,
} from "./lighthouse.fixture.ts";
import { createUiuxRecorder, type UiuxRecorder } from "./uiux.fixture.ts";

type QualityFixtures = {
  a11y: A11yRecorder;
  uiux: UiuxRecorder;
  lighthouse: LighthouseRecorder;
};

export const test = base.extend<QualityFixtures>({
  a11y: async ({}, use, testInfo) => {
    await use(createA11yRecorder(testInfo));
  },
  uiux: async ({}, use, testInfo) => {
    await use(createUiuxRecorder(testInfo));
  },
  lighthouse: async ({}, use, testInfo) => {
    await use(createLighthouseRecorder(testInfo));
  },
});

export const { Given, When, Then, Before, After } = createBdd(test);
