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
    'ytd-promoted-sparkles-web-renderer',
    'ytd-promoted-video-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-banner-promo-renderer',
    '#masthead-ad',
    '.video-ads.ytp-ad-module',
    '.ytp-ad-overlay-container',
    'tp-yt-paper-dialog ytd-mealbar-promo-renderer'
  ];

  const SKIP_SELECTORS = [
    '.ytp-ad-skip-button-modern',
    '.ytp-ad-skip-button',
    '.ytp-skip-ad-button',
    'button.ytp-ad-skip-button-modern',
    'button[class*="skip"]'
  ];

  const originalDisplay = new WeakMap();

  function queryAll(doc, selector) {
    try {
      return Array.from(doc.querySelectorAll(selector) || []);
    } catch (_) {
      return [];
    }
  }

  function hideKnownAds(doc) {
    let hiddenCount = 0;
    for (const selector of AD_SELECTORS) {
      for (const node of queryAll(doc, selector)) {
        if (!node || !node.style) continue;
        if (!originalDisplay.has(node)) {
          originalDisplay.set(node, node.style.display || '');
        }
        if (node.style.display !== 'none') {
          node.style.display = 'none';
          hiddenCount += 1;
        }
      }
    }
    return hiddenCount;
  }

  function restoreKnownAds(doc) {
    for (const selector of AD_SELECTORS) {
      for (const node of queryAll(doc, selector)) {
        if (!node || !node.style || !originalDisplay.has(node)) continue;
        node.style.display = originalDisplay.get(node);
        originalDisplay.delete(node);
      }
    }
  }

  function findSkipButton(doc) {
    for (const selector of SKIP_SELECTORS) {
      let button = null;
      try {
        button = doc.querySelector(selector);
      } catch (_) {
        button = null;
      }
      if (button && !button.disabled) return button;
    }
    return null;
  }

  function cleanPage(doc, enabled) {
    if (!enabled) {
      restoreKnownAds(doc);
      return { hiddenCount: 0, skipped: false };
    }

    const hiddenCount = hideKnownAds(doc);
    const skipButton = findSkipButton(doc);
    let skipped = false;

    if (skipButton && typeof skipButton.click === 'function') {
      skipButton.click();
      skipped = true;
    }

    return { hiddenCount, skipped };
  }

  function startBrowserRuntime() {
    if (
      typeof document === 'undefined' ||
      typeof window === 'undefined' ||
      typeof chrome === 'undefined' ||
      !chrome.storage ||
      !chrome.storage.sync
    ) {
      return;
    }

    let enabled = true;
    let scheduled = false;

    const run = () => {
      scheduled = false;
      cleanPage(document, enabled);
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(run);
      } else {
        window.setTimeout(run, 50);
      }
    };

    chrome.storage.sync.get({ enabled: true }, (settings) => {
      enabled = settings.enabled !== false;
      schedule();
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'sync' || !changes.enabled) return;
      enabled = changes.enabled.newValue !== false;
      schedule();
    });

    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('yt-navigate-finish', schedule, true);
    window.setInterval(schedule, 1500);
  }

  startBrowserRuntime();

  return {
    AD_SELECTORS,
    SKIP_SELECTORS,
    findSkipButton,
    cleanPage
  };
});
