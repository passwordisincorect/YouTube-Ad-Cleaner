const test = require('node:test');
const assert = require('node:assert/strict');

function makeDocument({ selectors = {}, skipButtons = [], adShowing = false, video = null } = {}) {
  return {
    querySelectorAll(selector) { return selectors[selector] || []; },
    querySelector(selector) {
      if (selector.includes('ad-showing') || selector.includes('ad-interrupting')) return adShowing ? { className: 'ad-showing' } : null;
      if (selector.includes('video')) return video;
      if (selector.includes('skip')) return skipButtons.find((button) => !button.disabled) || null;
      return null;
    }
  };
}

test('disabled cleanup makes no changes', () => {
  const cleaner = require('../content.js');
  let hidden = false;
  const node = { style: { set display(value) { hidden = value === 'none'; } } };
  const doc = makeDocument({ selectors: { 'ytd-ad-slot-renderer': [node] } });
  const result = cleaner.cleanPage(doc, false);
  assert.equal(result.hiddenCount, 0);
  assert.equal(result.skipped, false);
  assert.equal(hidden, false);
});

test('enabled cleanup hides known ad containers', () => {
  const cleaner = require('../content.js');
  const node = { style: {} };
  const doc = makeDocument({ selectors: { 'ytd-ad-slot-renderer': [node] } });
  const result = cleaner.cleanPage(doc, true);
  assert.equal(result.hiddenCount, 1);
  assert.equal(node.style.display, 'none');
});

test('enabled cleanup clicks a detected skip button once', () => {
  const cleaner = require('../content.js');
  let clicks = 0;
  const button = { disabled: false, click() { clicks += 1; } };
  const doc = makeDocument({ skipButtons: [button] });
  const result = cleaner.cleanPage(doc, true);
  assert.equal(result.skipped, true);
  assert.equal(clicks, 1);
});

test('disabling restores nodes previously hidden by the cleaner', () => {
  const cleaner = require('../content.js');
  const node = { style: { display: 'block' } };
  const doc = makeDocument({ selectors: { 'ytd-ad-slot-renderer': [node] } });
  cleaner.cleanPage(doc, true);
  cleaner.cleanPage(doc, false);
  assert.equal(node.style.display, 'block');
});

test('feed ads collapse the whole YouTube layout card so no blank gap remains', () => {
  const cleaner = require('../content.js');
  const card = { style: { display: 'block' } };
  const ad = { style: {}, closest(selector) { return selector.includes('ytd-rich-item-renderer') ? card : null; } };
  const doc = makeDocument({ selectors: { 'ytd-ad-slot-renderer': [ad] } });
  cleaner.cleanPage(doc, true);
  assert.equal(card.style.display, 'none');
});

test('a non-skippable player ad is immediately advanced and muted', () => {
  const cleaner = require('../content.js');
  const video = { muted: false, playbackRate: 1, duration: 30, currentTime: 0 };
  const doc = makeDocument({ adShowing: true, video });
  const result = cleaner.cleanPage(doc, true);
  assert.equal(result.bypassed, true);
  assert.equal(video.muted, true);
  assert.equal(video.playbackRate, 16);
  assert.ok(video.currentTime >= 29.9);
});

test('player media state is restored after the ad ends', () => {
  const cleaner = require('../content.js');
  const video = { muted: false, playbackRate: 1.25, duration: 15, currentTime: 0 };
  cleaner.cleanPage(makeDocument({ adShowing: true, video }), true);
  cleaner.cleanPage(makeDocument({ adShowing: false, video }), true);
  assert.equal(video.muted, false);
  assert.equal(video.playbackRate, 1.25);
});
