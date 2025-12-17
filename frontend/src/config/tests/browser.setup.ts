/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import { chromium, firefox, webkit, type FullConfig } from '@playwright/test';
import { injectAxe } from 'axe-playwright';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

const browserMap = {
  chromium,
  firefox,
  webkit,
} as const;

async function loadAndSaveStorage(metadata: Record<string, any> = {}) {
  const browserType = browserMap[metadata.browserName as keyof typeof browserMap];
  const browser = await browserType.launch();
  const page = await browser.newPage();
  await injectAxe(page);

  console.log(`Setup - Browser: ${metadata.browserName}[${metadata.category}]`);

  await page.goto(baseURL);
  await browser.close();
}

async function globalSetup(config: FullConfig) {
  for (const project of config.projects) {
    console.log(`Setup - Project name: ${project.name}`);
    await loadAndSaveStorage(project.metadata);
  }
}

export default globalSetup;
