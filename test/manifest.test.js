const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const manifestPath = path.join(__dirname, '..', 'manifest.json');

function readManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

test('manifest is MV3 version 1.0.0 with storage permission', () => {
  const manifest = readManifest();
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, '1.0.0');
  assert.ok(manifest.permissions.includes('storage'));
});

test('content script is restricted to YouTube and loads content.js', () => {
  const manifest = readManifest();
  assert.deepEqual(manifest.content_scripts[0].js, ['content.js']);
  assert.ok(manifest.content_scripts[0].matches.every((match) => match.includes('youtube.com')));
});

test('manifest configures popup.html', () => {
  const manifest = readManifest();
  assert.equal(manifest.action.default_popup, 'popup.html');
});
