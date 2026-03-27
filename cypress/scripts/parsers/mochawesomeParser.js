const fs = require('node:fs');
const path = require('node:path');

function parseMochawesomeReports(reportDir) {
  const files = fs.readdirSync(reportDir)
    .filter(f => f.endsWith('.json'));

  const reports = files.map(file => {
    const content = fs.readFileSync(path.join(reportDir, file), 'utf8');
    return JSON.parse(content);
  });

  return reports;
}

module.exports = {
  parseMochawesomeReports,
};
