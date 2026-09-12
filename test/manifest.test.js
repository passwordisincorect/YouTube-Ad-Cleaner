const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const manifestPath = path.join(__dirname, '..', 'manifest.json');
const rulesPath = path.join(__dirname, '..', 'rules.json');
function readManifest() { return JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }

test('manifest is MV3 version 1.1.0 with storage and network blocking permissions', () => {
  const manifest = readManifest();
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, '1.1.0');
  assert.ok(manifest.permissions.includes('storage'));
  assert.ok(manifest.permissions.includes('declarativeNetRequestWithHostAccess'));
});

test('manifest loads a static YouTube ad-blocking ruleset', () => {
  const manifest = readManifest();
  assert.equal(manifest.declarative_net_request.rule_resources[0].id, 'youtube_ads');
  assert.equal(manifest.declarative_net_request.rule_resources[0].path, 'rules.json');
  assert.equal(manifest.declarative_net_request.rule_resources[0].enabled, true);
});

test('static rules file exists and does not block googlevideo playback CDN', () => {
  assert.equal(fs.existsSync(rulesPath), true);
  const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
  assert.ok(rules.length >= 4);
  assert.equal(rules.some((rule) => JSON.stringify(rule).includes('googlevideo.com')), false);
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

test('network rules avoid broad YouTube pagead blocking that can break playback transitions', () => {
  const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
  assert.equal(rules.some((rule) => rule.condition && rule.condition.urlFilter === '||youtube.com/pagead/'), false);
});
