const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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

test('disabled cleanup makes no changes and restores hidden nodes', () => {
  const cleaner = require('../content.js');
  const node = { style: { display: 'block' } };
  const doc = makeDocument({ selectors: { 'ytd-ad-slot-renderer': [node] } });
  cleaner.cleanPage(doc, true);
  const result = cleaner.cleanPage(doc, false);
  assert.equal(result.hiddenCount, 0);
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

test('production runtime has no post-ad bypass behavior', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');
  assert.equal(source.includes('playbackRate = 16'), false);
  assert.equal(source.includes('video.currentTime ='), false);
  assert.equal(source.includes('video.muted = true'), false);
  assert.equal(source.includes('ad-skip-button'), false);
});

test('companion and sidebar ad renderers are included in ad selectors', () => {
  const cleaner = require('../content.js');
  assert.ok(cleaner.AD_SELECTORS.includes('ytd-companion-slot-renderer'));
  assert.ok(cleaner.AD_SELECTORS.includes('ytd-action-companion-ad-renderer'));
  assert.ok(cleaner.AD_SELECTORS.includes('ytd-display-ad-renderer'));
});

test('Premium promo detector identifies Premium copy but not generic dialogs', () => {
  const cleaner = require('../content.js');
  assert.equal(cleaner.isPremiumPromoNode({ textContent: 'YouTube Premium 1 tháng miễn phí' }), true);
  assert.equal(cleaner.isPremiumPromoNode({ textContent: 'Bạn có muốn lưu thay đổi?' }), false);
});

test('sponsored label detector catches Vietnamese/English ad cards', () => {
  const cleaner = require('../content.js');
  assert.equal(cleaner.isSponsoredCard({ textContent: 'Rồi Text to 3D AI · Được tài trợ · hyper3d.ai' }), true);
  assert.equal(cleaner.isSponsoredCard({ textContent: 'Sponsored · example.com' }), true);
  assert.equal(cleaner.isSponsoredCard({ textContent: 'Video hướng dẫn lập trình STM32' }), false);
});

test('Premium dialog is hidden while unrelated dialog remains visible', () => {
  const cleaner = require('../content.js');
  const premium = { style: { display: 'block' }, textContent: 'YouTube Premium Miễn phí 1 tháng', tagName: 'TP-YT-PAPER-DIALOG' };
  const regular = { style: { display: 'block' }, textContent: 'Bạn có muốn lưu thay đổi?', tagName: 'TP-YT-PAPER-DIALOG' };
  const doc = makeDocument({ selectors: { 'tp-yt-paper-dialog': [premium, regular] } });
  cleaner.cleanPage(doc, true);
  assert.equal(premium.style.display, 'none');
  assert.equal(regular.style.display, 'block');
});
