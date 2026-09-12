(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.YouTubeAdCleaner = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const AD_SELECTORS = [
    'ytd-ad-slot-renderer',
    'ytd-display-ad-renderer',
    'ytd-companion-slot-renderer',
    'ytd-action-companion-ad-renderer',
    'ytd-companion-display-ad-renderer',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-promoted-sparkles-text-search-renderer',
    'ytd-promoted-video-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-ad-inline-playback-renderer',
    'ytd-banner-promo-renderer',
    'ytd-video-masthead-ad-renderer',
    '#masthead-ad',
    '#player-ads',
    '.video-ads.ytp-ad-module',
    '.ytp-ad-overlay-container'
  ];

  const FEED_CARD_SELECTOR = [
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-grid-video-renderer',
    'ytd-compact-video-renderer'
  ].join(', ');

  const SPONSORED_CARD_SELECTOR = [
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-compact-video-renderer',
    'ytd-ad-slot-renderer',
    'ytd-companion-slot-renderer',
    'ytd-action-companion-ad-renderer'
  ].join(', ');

  const PREMIUM_PROMO_SELECTORS = [
    'tp-yt-paper-dialog',
    'ytd-mealbar-promo-renderer',
    'ytd-banner-promo-renderer'
  ];

  const originalDisplay = new WeakMap();
  const hiddenTargets = new Set();

  function queryAll(doc, selector) {
    try { return Array.from(doc.querySelectorAll(selector) || []); } catch (_) { return []; }
  }

  function normalizedText(node) {
    return String(node && node.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function isPremiumPromoNode(node) {
    const text = normalizedText(node).toLowerCase();
    if (!text) return false;
    return text.includes('youtube premium') ||
      (text.includes('premium') && (
        text.includes('miễn phí 1 tháng') ||
        text.includes('free for 1 month') ||
        text.includes('1 month free') ||
        text.includes('dùng thử miễn phí') ||
        text.includes('free trial')
      ));
  }

  function isSponsoredCard(node) {
    const text = normalizedText(node).slice(0, 500);
    return /(^|\s|·)(được tài trợ|sponsored)(\s|·|$)/i.test(text);
  }

  function getHideTarget(node) {
    if (!node) return null;
    if (typeof node.closest === 'function') {
      try {
        const card = node.closest(FEED_CARD_SELECTOR);
        if (card) return card;
      } catch (_) {}
    }
    return node;
  }

  function hideTarget(target) {
    if (!target || !target.style) return false;
    if (!originalDisplay.has(target)) originalDisplay.set(target, target.style.display || '');
    hiddenTargets.add(target);
    if (target.style.display === 'none') return false;
    target.style.display = 'none';
    return true;
  }

  function hideKnownAds(doc) {
    let hiddenCount = 0;
    const handled = new Set();

    for (const selector of AD_SELECTORS) {
      for (const node of queryAll(doc, selector)) {
        const target = getHideTarget(node);
        if (!target || handled.has(target)) continue;
        handled.add(target);
        if (hideTarget(target)) hiddenCount += 1;
      }
    }

    for (const card of queryAll(doc, SPONSORED_CARD_SELECTOR)) {
      if (!card || handled.has(card) || !isSponsoredCard(card)) continue;
      handled.add(card);
      if (hideTarget(card)) hiddenCount += 1;
    }

    let premiumDialogHidden = false;
    for (const selector of PREMIUM_PROMO_SELECTORS) {
      for (const node of queryAll(doc, selector)) {
        if (!node || handled.has(node) || !isPremiumPromoNode(node)) continue;
        let target = node;
        if (typeof node.closest === 'function') {
          try { target = node.closest('tp-yt-paper-dialog') || node; } catch (_) {}
        }
        if (handled.has(target)) continue;
        handled.add(target);
        if (hideTarget(target)) hiddenCount += 1;
        premiumDialogHidden = premiumDialogHidden || String(target.tagName || '').toLowerCase() === 'tp-yt-paper-dialog' || selector === 'tp-yt-paper-dialog';
      }
    }

    if (premiumDialogHidden) {
      for (const backdrop of queryAll(doc, 'tp-yt-iron-overlay-backdrop.opened')) {
        if (hideTarget(backdrop)) hiddenCount += 1;
      }
    }

    return hiddenCount;
  }

  function restoreKnownAds() {
    for (const target of Array.from(hiddenTargets)) {
      if (!target || !target.style) {
        hiddenTargets.delete(target);
        continue;
      }
      if (originalDisplay.has(target)) {
        target.style.display = originalDisplay.get(target);
        originalDisplay.delete(target);
      }
      hiddenTargets.delete(target);
    }
  }

  function cleanPage(doc, enabled) {
    if (!enabled) {
      restoreKnownAds();
      return { hiddenCount: 0 };
    }
    return { hiddenCount: hideKnownAds(doc) };
  }

  function emitConfig(doc, enabled) {
    if (!doc || typeof doc.dispatchEvent !== 'function' || typeof CustomEvent === 'undefined') return false;
    try {
      doc.dispatchEvent(new CustomEvent('YAC_CONFIG', { detail: { enabled: !!enabled } }));
      return true;
    } catch (_) {
      return false;
    }
  }

  function startBrowserRuntime() {
    if (
      typeof document === 'undefined' ||
      typeof window === 'undefined' ||
      typeof chrome === 'undefined' ||
      !chrome.storage ||
      !chrome.storage.sync
    ) return;

    let enabled = true;
    let scheduled = false;

    const run = () => {
      scheduled = false;
      cleanPage(document, enabled);
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(run);
      else window.setTimeout(run, 50);
    };

    const applyEnabled = (nextEnabled) => {
      enabled = nextEnabled !== false;
      emitConfig(document, enabled);
      schedule();
    };

    chrome.storage.sync.get({ enabled: true }, (settings) => applyEnabled(settings.enabled));
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'sync' || !changes.enabled) return;
      applyEnabled(changes.enabled.newValue);
    });

    const observer = new MutationObserver(schedule);
    const observe = () => {
      if (document.documentElement) {
        observer.observe(document.documentElement, { childList: true, subtree: true });
        schedule();
      }
    };
    if (document.documentElement) observe();
    else document.addEventListener('readystatechange', observe, { once: true });

    document.addEventListener('yt-navigate-finish', schedule, true);
    window.setInterval(schedule, 2000);
  }

  startBrowserRuntime();

  return {
    AD_SELECTORS,
    FEED_CARD_SELECTOR,
    SPONSORED_CARD_SELECTOR,
    PREMIUM_PROMO_SELECTORS,
    isPremiumPromoNode,
    isSponsoredCard,
    getHideTarget,
    cleanPage,
    emitConfig
  };
});
