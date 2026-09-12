'use strict';

const fs = require('node:fs');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractReleaseNotes(changelog, version) {
  const lines = changelog.split(/\r?\n/);
  const heading = new RegExp(`^##\\s+${escapeRegExp(version)}\\s+-`);
  const versionHeading = /^##\s+\d+\.\d+\.\d+\s+-/;
  const start = lines.findIndex((line) => heading.test(line));

  if (start === -1) {
    throw new Error(`Version ${version} not found in changelog`);
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (versionHeading.test(lines[i])) {
      end = i;
      break;
    }
  }

  return lines.slice(start, end).join('\n').trim() + '\n';
}

if (require.main === module) {
  const [, , changelogPath, version] = process.argv;
  if (!changelogPath || !version) {
    console.error('Usage: node scripts/extract-release-notes.js <CHANGELOG.md> <version>');
    process.exit(2);
  }

  const changelog = fs.readFileSync(changelogPath, 'utf8');
  process.stdout.write(extractReleaseNotes(changelog, version));
}

module.exports = { extractReleaseNotes };
