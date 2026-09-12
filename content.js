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
    'ytd-video-masthead-ad-renderer',
    '#masthead-ad',
    '#player-ads',
    '.video-ads.ytp-ad-module',
    '.ytp-ad-overlay-container',
    'tp-yt-paper-dialog ytd-mealbar-promo-renderer'
  ];

  const FEED_CARD_SELECTOR = [
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-grid-video-renderer',
    'ytd-compact-video-renderer'
  ].join(', ');

  const SKIP_SELECTORS = [
    '.ytp-ad-skip-button-modern',
    '.ytp-ad-skip-button',
    '.ytp-skip-ad-button',
    'button.ytp-ad-skip-button-modern',
    'button[class*="skip"]'
  ];

  const PLAYER_AD_SELECTOR = [
    '.html5-video-player.ad-showing',
    '.html5-video-player.ad-interrupting'
  ].join(', ');

  const originalDisplay = new WeakMap();
  const hiddenTargets = new Set();
  const mediaState = new WeakMap();

  function queryAll(doc, selector) {
    try {
      return Array.from(doc.querySelectorAll(selector) || []);
    } catch (_) {
      return [];
    }
  }

  function queryOne(doc, selector) {
    try {
      return doc.querySelector(selector);
    } catch (_) {
      return null;
    }
  }

  function getHideTarget(node) {
    if (!node) return null;
    if (typeof node.closest === 'function') {
      try {
        const card = node.closest(FEED_CARD_SELECTOR);
        if (card) return card;
      } catch (_) {
        // Fall back to hiding the ad node itself.
      }
    }
    return node;
  }

  function hideKnownAds(doc) {
    let hiddenCount = 0;
    const handled = new Set();

    for (const selector of AD_SELECTORS) {
      for (const node of queryAll(doc, selector)) {
        const target = getHideTarget(node);
        if (!target || !target.style || handled.has(target)) continue;
        handled.add(target);

        if (!originalDisplay.has(target)) {
          originalDisplay.set(target, target.style.display || '');
        }
        hiddenTargets.add(target);

        if (target.style.display !== 'none') {
          target.style.display = 'none';
          hiddenCount += 1;
        }
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

  function findSkipButton(doc) {
    for (const selector of SKIP_SELECTORS) {
      const button = queryOne(doc, selector);
      if (button && !button.disabled) return button;
    }
    return null;
  }

  function restorePlayerState(video) {
    if (!video || !mediaState.has(video)) return false;
    const state = mediaState.get(video);
    try { video.muted = state.muted; } catch (_) {}
    try { video.playbackRate = state.playbackRate; } catch (_) {}
    mediaState.delete(video);
    return true;
  }

  function bypassPlayerAd(doc) {
    const video = queryOne(doc, 'video.html5-main-video, video');
    if (!video) return false;

    const adShowing = !!queryOne(doc, PLAYER_AD_SELECTOR);
    if (!adShowing) {
      restorePlayerState(video);
      return false;
    }

    if (!mediaState.has(video)) {
      mediaState.set(video, {
        muted: !!video.muted,
        playbackRate: Number(video.playbackRate) || 1
      });
    }

    let handled = false;

    try {
      video.muted = true;
      handled = true;
    } catch (_) {}

    try {
      video.playbackRate = 16;
      handled = true;
    } catch (_) {}

    const duration = Number(video.duration);
    if (Number.isFinite(duration) && duration > 0) {
      try {
        video.currentTime = Math.max(0, duration - 0.05);
        handled = true;
      } catch (_) {
        // Playback-rate acceleration remains as the fallback.
      }
    }

    return handled;
  }

  function cleanPage(doc, enabled) {
    if (!enabled) {
      restoreKnownAds();
      const video = queryOne(doc, 'video.html5-main-video, video');
      if (video) restorePlayerState(video);
      return { hiddenCount: 0, skipped: false, bypassed: false };
    }

    const hiddenCount = hideKnownAds(doc);
    const skipButton = findSkipButton(doc);
    let skipped = false;

    if (skipButton && typeof skipButton.click === 'function') {
      try {
        skipButton.click();
        skipped = true;
      } catch (_) {}
    }

    const bypassed = bypassPlayerAd(doc);
    return { hiddenCount, skipped, bypassed };
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
    window.setInterval(schedule, 500);
  }

  startBrowserRuntime();

  return {
    AD_SELECTORS,
    FEED_CARD_SELECTOR,
    SKIP_SELECTORS,
    PLAYER_AD_SELECTOR,
    findSkipButton,
    getHideTarget,
    bypassPlayerAd,
    cleanPage
  };
});
