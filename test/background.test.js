const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const backgroundPath = path.join(__dirname, '..', 'background.js');

test('background module exists to keep network blocking in sync with the toggle', () => {
  assert.equal(fs.existsSync(backgroundPath), true);
});

test('network ruleset can be disabled and enabled without disabling the extension', async () => {
  const background = require('../background.js');
  const calls = [];
  const dnr = { updateEnabledRulesets(options) { calls.push(options); return Promise.resolve(); } };
  await background.setNetworkBlocking(dnr, false);
  await background.setNetworkBlocking(dnr, true);
  assert.deepEqual(calls[0], { enableRulesetIds: [], disableRulesetIds: ['youtube_ads'] });
  assert.deepEqual(calls[1], { enableRulesetIds: ['youtube_ads'], disableRulesetIds: [] });
});
