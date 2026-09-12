const test = require('node:test');
const assert = require('node:assert/strict');
const { extractReleaseNotes } = require('../scripts/extract-release-notes.js');

const changelog = `# Changelog\n\n## 1.2.1 - 2026-09-12\n\n- Fix XHR.\n- Keep fail-open.\n\n## 1.2.0 - 2026-09-12\n\n- Add MAIN hook.\n- Remove skip.\n\n## 1.1.0 - 2026-09-12\n\n- Add DNR.\n`;

test('extracts only the requested version section', () => {
  const notes = extractReleaseNotes(changelog, '1.2.0');
  assert.match(notes, /^## 1\.2\.0 - 2026-09-12/);
  assert.match(notes, /Add MAIN hook/);
  assert.match(notes, /Remove skip/);
  assert.doesNotMatch(notes, /1\.2\.1/);
  assert.doesNotMatch(notes, /1\.1\.0/);
  assert.doesNotMatch(notes, /Fix XHR/);
  assert.doesNotMatch(notes, /Add DNR/);
});

test('throws when version is missing', () => {
  assert.throws(() => extractReleaseNotes(changelog, '9.9.9'), /not found/i);
});
