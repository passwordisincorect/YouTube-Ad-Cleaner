const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const manifestPath = path.join(__dirname, '..', 'manifest.json');
function readManifest() { return JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }

test('manifest is MV3 version 1.2.0 with required permissions', () => {
  const manifest = readManifest();
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, '1.2.0');
  assert.ok(manifest.permissions.includes('storage'));
  assert.ok(manifest.permissions.includes('declarativeNetRequestWithHostAccess'));
});

test('page hook runs in MAIN world at document_start and cleaner runs isolated', () => {
  const manifest = readManifest();
  const page = manifest.content_scripts.find((entry) => entry.js.includes('page-hook.js'));
  const isolated = manifest.content_scripts.find((entry) => entry.js.includes('content.js'));
  assert.ok(page);
  assert.equal(page.world, 'MAIN');
  assert.equal(page.run_at, 'document_start');
  assert.ok(isolated);
  assert.equal(isolated.world, 'ISOLATED');
  assert.equal(isolated.run_at, 'document_start');
  assert.ok(page.matches.every((match) => match.includes('youtube.com')));
});

test('manifest loads the static ruleset and popup', () => {
  const manifest = readManifest();
  assert.equal(manifest.declarative_net_request.rule_resources[0].id, 'youtube_ads');
  assert.equal(manifest.declarative_net_request.rule_resources[0].path, 'rules.json');
  assert.equal(manifest.action.default_popup, 'popup.html');
});
