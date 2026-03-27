const fs = require('node:fs');
const { parseMochawesomeReports } = require('./parsers/mochawesomeParser.js');
const { mochawesomeToMarkdown, testSummaryToMarkdown } = require('./modules/mochawesomeModule.js');
const { accessibilityToMarkdown } = require('./modules/accessibilityModule.js');
const { uiuxToMarkdown } = require('./modules/uiuxModule.js');
const { lighthouseToMarkdown } = require('./modules/lighthouseModule.js');
const { writeMarkdown } = require('./renderers/markdownWriter.js');

function generateSummary() {
  const timestamp = new Date().toISOString();


  const summaryMd = testSummaryToMarkdown(parseMochawesomeReports('./reports/mochawesome'));
  const mochawesomeMd = mochawesomeToMarkdown(parseMochawesomeReports('./reports/mochawesome'));

  /* a11y report */
  const accessibilityData = JSON.parse(
    fs.readFileSync('./reports/a11y/a11y-results.json', 'utf8')
  );
  const accessibilityMd = accessibilityToMarkdown(accessibilityData);

  /* lighthouse report */
  const lighthouseData = JSON.parse(
    fs.readFileSync('./reports/lighthouse/lighthouse-results.json', 'utf8')
  );
  const lighthouseMd = lighthouseToMarkdown(lighthouseData);

  /* UI/UX report */
  const uiuxData = JSON.parse(
    fs.readFileSync('./reports/uiux/uiux-results.json', 'utf8')
  );
  const uiuxMd = uiuxToMarkdown(uiuxData);

  const finalMd = `
# Cypress Test Summary

**Generated At:** ${timestamp}
${summaryMd}
${accessibilityMd}
${lighthouseMd}
${uiuxMd}
${mochawesomeMd}`;

  writeMarkdown('./summary.md', finalMd);
}

generateSummary();
