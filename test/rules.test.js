const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rules = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'rules.json'), 'utf8'));
const serialized = JSON.stringify(rules).toLowerCase();

test('rules do not block YouTube player-internal endpoints or googlevideo', () => {
  for (const forbidden of ['/api/stats/ads', '/get_midroll_info', '/youtubei/v1/player/ad_break', '/get_video_info', '/ptracking', 'googlevideo.com']) {
    assert.equal(serialized.includes(forbidden), false, `found forbidden rule fragment: ${forbidden}`);
  }
});

test('rules retain high-confidence external ad domains only', () => {
  assert.equal(serialized.includes('doubleclick.net'), true);
  assert.equal(serialized.includes('googlesyndication.com'), true);
  assert.equal(serialized.includes('googleadservices.com'), true);
});
