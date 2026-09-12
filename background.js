(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.YouTubeAdCleanerBackground = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const RULESET_ID = 'youtube_ads';

  function setNetworkBlocking(dnr, enabled) {
    if (!dnr || typeof dnr.updateEnabledRulesets !== 'function') {
      return Promise.resolve(false);
    }
    return Promise.resolve(dnr.updateEnabledRulesets({
      enableRulesetIds: enabled ? [RULESET_ID] : [],
      disableRulesetIds: enabled ? [] : [RULESET_ID]
    })).then(() => true);
  }

  function startBrowserRuntime() {
    if (
      typeof chrome === 'undefined' ||
      !chrome.storage ||
      !chrome.storage.sync ||
      !chrome.declarativeNetRequest
    ) {
      return;
    }

    const sync = () => {
      chrome.storage.sync.get({ enabled: true }, (settings) => {
        setNetworkBlocking(chrome.declarativeNetRequest, settings.enabled !== false);
      });
    };

    if (chrome.runtime && chrome.runtime.onInstalled) {
      chrome.runtime.onInstalled.addListener(sync);
    }
    if (chrome.runtime && chrome.runtime.onStartup) {
      chrome.runtime.onStartup.addListener(sync);
    }
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes.enabled) {
        setNetworkBlocking(chrome.declarativeNetRequest, changes.enabled.newValue !== false);
      }
    });

    sync();
  }

  startBrowserRuntime();

  return { RULESET_ID, setNetworkBlocking };
});
