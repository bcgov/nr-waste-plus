const fs = require('node:fs');

function writeMarkdown(outputPath, content) {
  fs.writeFileSync(outputPath, content, 'utf8');
}

module.exports = {
  writeMarkdown,
};