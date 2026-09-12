const test = require('node:test');
const assert = require('node:assert/strict');

function makeDocument({ selectors = {}, skipButtons = [] } = {}) {
  return {
    querySelectorAll(selector) {
      return selectors[selector] || [];
    },
    querySelector(selector) {
      if (selector.includes('skip')) return skipButtons.find((button) => !button.disabled) || null;
      return null;
    },
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
  const node = { style: { display: 'block' }, dataset: {} };
  const doc = makeDocument({ selectors: { 'ytd-ad-slot-renderer': [node] } });

  cleaner.cleanPage(doc, true);
  cleaner.cleanPage(doc, false);

  assert.equal(node.style.display, 'block');
});
