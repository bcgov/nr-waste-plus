const fs = require('node:fs');
const { parseMochawesomeReports } = require('./parsers/mochawesomeParser.js');
const { mochawesomeToMarkdown, testSummaryToMarkdown } = require('./modules/mochawesomeModule.js');
const { accessibilityToMarkdown } = require('./modules/accessibilityModule.js');
const { uiuxToMarkdown } = require('./modules/uiuxModule.js');
const { lighthouseToMarkdown } = require('./modules/lighthouseModule.js');
const { writeMarkdown } = require('./renderers/markdownWriter.js');

function generateSummary({ reportRoot = './reports', outputPath = './summary.md', now = new Date() } = {}) {
  const timestamp = now.toISOString();
  const reportPath = (name) => `${reportRoot}/${name}`;

  const summaryMd = testSummaryToMarkdown(parseMochawesomeReports(reportPath('mochawesome')));
  const mochawesomeMd = mochawesomeToMarkdown(parseMochawesomeReports(reportPath('mochawesome')));

  /* a11y report */
  const accessibilityData = JSON.parse(
    fs.readFileSync(reportPath('a11y/a11y-results.json'), 'utf8')
  );
  const accessibilityMd = accessibilityToMarkdown(accessibilityData);

  /* lighthouse report */
  const lighthouseData = JSON.parse(
    fs.readFileSync(reportPath('lighthouse/lighthouse-results.json'), 'utf8')
  );
  const lighthouseMd = lighthouseToMarkdown(lighthouseData);

  /* UI/UX report */
  const uiuxData = JSON.parse(
    fs.readFileSync(reportPath('uiux/uiux-results.json'), 'utf8')
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

  writeMarkdown(outputPath, finalMd);
  return finalMd;
}

if (require.main === module) {
  generateSummary();
}

module.exports = { generateSummary };
