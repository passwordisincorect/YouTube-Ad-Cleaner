(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.YouTubeAdCleanerPageHook = api;
    if (root && root.document) api.startBrowserRuntime(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const AD_KEYS = new Set([
    'adPlacements', 'playerAds', 'adSlots', 'adBreakParams',
    'adBreakHeartbeatParams', 'adBreakServiceRenderer', 'adPlacementRenderer',
    'linearAdSequenceRenderer', 'instreamAdPlayerOverlayRenderer',
    'instreamVideoAdRenderer', 'playerLegacyDesktopWatchAdsRenderer',
    'playerAdsRenderer', 'companionAdRenderer', 'promotedSparklesWebRenderer'
  ]);

  const states = new WeakMap();

  function getState(targetWindow) {
    let state = states.get(targetWindow);
    if (!state) {
      state = {
        enabled: true,
        fetchInstalled: false,
        xhrInstalled: false,
        initialInstalled: false,
        configInstalled: false
      };
      states.set(targetWindow, state);
    }
    return state;
  }

  function sanitizePlayerResponse(value, seen = new WeakSet()) {
    if (!value || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    for (const key of Object.keys(value)) {
      if (AD_KEYS.has(key)) {
        try { delete value[key]; } catch (_) {}
        continue;
      }
      sanitizePlayerResponse(value[key], seen);
    }
    return value;
  }

  function isPlayerApiUrl(url) {
    const text = String(url || '');
    return text.includes('/youtubei/v1/player') ||
      text.includes('/youtubei/v1/next') ||
      text.includes('/youtubei/v1/get_watch') ||
      text.includes('/youtubei/v1/playlist/watch');
  }

  function isPlayerRequestUrl(url) {
    const text = String(url || '');
    return text.includes('/youtubei/v1/player') ||
      text.includes('/youtubei/v1/get_watch') ||
      text.includes('/youtubei/v1/playlist/watch');
  }

  function sanitizePlayerRequest(value) {
    if (!value || typeof value !== 'object') return value;

    try {
      if (Object.prototype.hasOwnProperty.call(value, 'adSignalsInfo')) {
        delete value.adSignalsInfo;
      }
    } catch (_) {}

    try {
      if (value.context && typeof value.context === 'object' &&
          Object.prototype.hasOwnProperty.call(value.context, 'adSignalsInfo')) {
        delete value.context.adSignalsInfo;
      }
    } catch (_) {}

    try {
      const contentPlaybackContext = value.playbackContext && value.playbackContext.contentPlaybackContext;
      if (contentPlaybackContext && typeof contentPlaybackContext === 'object') {
        contentPlaybackContext.isInlinePlaybackNoAd = true;
      }
    } catch (_) {}

    return value;
  }

  function sanitizeRequestBody(body) {
    if (typeof body !== 'string') return null;
    try {
      const value = JSON.parse(body);
      if (!value || typeof value !== 'object') return null;
      sanitizePlayerRequest(value);
      return JSON.stringify(value);
    } catch (_) {
      return null;
    }
  }

  function sanitizeJsonText(text) {
    try {
      const value = JSON.parse(text);
      sanitizePlayerResponse(value);
      return JSON.stringify(value);
    } catch (_) {
      return null;
    }
  }

  function installConfigListener(targetWindow) {
    if (!targetWindow) return false;
    const state = getState(targetWindow);
    if (state.configInstalled) return true;
    const doc = targetWindow.document;
    if (!doc || typeof doc.addEventListener !== 'function') return false;
    doc.addEventListener('YAC_CONFIG', (event) => {
      if (event && event.detail && typeof event.detail.enabled === 'boolean') {
        state.enabled = event.detail.enabled;
      }
    }, true);
    state.configInstalled = true;
    return true;
  }

  function installFetchHook(targetWindow) {
    if (!targetWindow || typeof targetWindow.fetch !== 'function') return false;
    const state = getState(targetWindow);
    if (state.fetchInstalled) return true;
    const originalFetch = targetWindow.fetch.bind(targetWindow);
    const ResponseCtor = targetWindow.Response || (typeof Response !== 'undefined' ? Response : null);

    targetWindow.fetch = async function yacFetch(input, init) {
      const url = typeof input === 'string' ? input : input && input.url;
      let nextInit = init;

      if (state.enabled && isPlayerRequestUrl(url) && init && typeof init.body === 'string') {
        const sanitizedBody = sanitizeRequestBody(init.body);
        if (sanitizedBody !== null) {
          nextInit = Object.assign({}, init, { body: sanitizedBody });
        }
      }

      const response = await originalFetch(input, nextInit);
      if (!state.enabled || !isPlayerApiUrl(url) || !response || typeof response.clone !== 'function') return response;
      try {
        const clone = response.clone();
        const data = await clone.json();
        if (!data || typeof data !== 'object') return response;
        sanitizePlayerResponse(data);
        if (!ResponseCtor) return response;
        const headers = typeof Headers !== 'undefined' ? new Headers(response.headers) : response.headers;
        if (headers && typeof headers.delete === 'function') {
          headers.delete('content-length');
          headers.delete('content-encoding');
        }
        return new ResponseCtor(JSON.stringify(data), {
          status: response.status,
          statusText: response.statusText,
          headers
        });
      } catch (_) {
        return response;
      }
    };

    state.fetchInstalled = true;
    return true;
  }

  function installXHRHook(targetWindow) {
    if (!targetWindow || !targetWindow.XMLHttpRequest || !targetWindow.XMLHttpRequest.prototype) return false;
    const state = getState(targetWindow);
    if (state.xhrInstalled) return true;
    const proto = targetWindow.XMLHttpRequest.prototype;
    if (typeof proto.open !== 'function') return false;

    const originalOpen = proto.open;
    const originalSend = typeof proto.send === 'function' ? proto.send : null;
    const responseTextDescriptor = Object.getOwnPropertyDescriptor(proto, 'responseText');
    const responseDescriptor = Object.getOwnPropertyDescriptor(proto, 'response');
    const nativeResponseTextGet = responseTextDescriptor && responseTextDescriptor.get;
    const nativeResponseGet = responseDescriptor && responseDescriptor.get;
    const requestUrls = new WeakMap();
    const listenerAttached = new WeakSet();

    function resolveUrl(url) {
      try {
        const base = targetWindow.location && targetWindow.location.href || 'https://www.youtube.com/';
        return new URL(String(url || ''), base).href;
      } catch (_) {
        return String(url || '');
      }
    }

    function sanitizeCompletedRequest(xhr) {
      if (!state.enabled || !xhr || xhr.readyState !== 4 || !isPlayerApiUrl(requestUrls.get(xhr))) return;
      try {
        const responseType = String(xhr.responseType || '');
        if (responseType === '' || responseType === 'text') {
          const raw = nativeResponseTextGet ? nativeResponseTextGet.call(xhr) : xhr.responseText;
          const sanitized = sanitizeJsonText(raw);
          if (sanitized === null) return;
          try {
            Object.defineProperty(xhr, 'responseText', { configurable: true, get() { return sanitized; } });
          } catch (_) {}
          try {
            Object.defineProperty(xhr, 'response', { configurable: true, get() { return sanitized; } });
          } catch (_) {}
          return;
        }
        if (responseType === 'json') {
          const value = nativeResponseGet ? nativeResponseGet.call(xhr) : xhr.response;
          if (value && typeof value === 'object') {
            sanitizePlayerResponse(value);
            try {
              Object.defineProperty(xhr, 'response', { configurable: true, get() { return value; } });
            } catch (_) {}
          }
        }
      } catch (_) {
        // Fail open if browser XHR internals differ.
      }
    }

    proto.open = function yacXhrOpen(method, url) {
      requestUrls.set(this, resolveUrl(url));
      try { delete this.responseText; } catch (_) {}
      try { delete this.response; } catch (_) {}
      const result = originalOpen.apply(this, arguments);
      if (!listenerAttached.has(this) && typeof this.addEventListener === 'function') {
        this.addEventListener('readystatechange', function yacXhrReadyState() {
          sanitizeCompletedRequest(this);
        });
        listenerAttached.add(this);
      }
      return result;
    };

    if (originalSend) {
      proto.send = function yacXhrSend(body) {
        let nextBody = body;
        if (state.enabled && isPlayerRequestUrl(requestUrls.get(this)) && typeof body === 'string') {
          const sanitizedBody = sanitizeRequestBody(body);
          if (sanitizedBody !== null) nextBody = sanitizedBody;
        }
        return originalSend.call(this, nextBody);
      };
    }

    state.xhrInstalled = true;
    return true;
  }

  function installInitialPlayerResponseHook(targetWindow) {
    if (!targetWindow) return false;
    const state = getState(targetWindow);
    if (state.initialInstalled) return true;
    try {
      const key = 'ytInitialPlayerResponse';
      const descriptor = Object.getOwnPropertyDescriptor(targetWindow, key);
      if (descriptor && descriptor.configurable === false) {
        try {
          const existing = targetWindow[key];
          if (state.enabled) sanitizePlayerResponse(existing);
        } catch (_) {}
        return false;
      }
      const enumerable = descriptor ? descriptor.enumerable : true;
      const originalGet = descriptor && descriptor.get;
      const originalSet = descriptor && descriptor.set;
      let current;
      if (descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value')) current = descriptor.value;
      else if (originalGet) {
        try { current = originalGet.call(targetWindow); } catch (_) { current = undefined; }
      } else current = targetWindow[key];
      if (state.enabled) sanitizePlayerResponse(current);
      Object.defineProperty(targetWindow, key, {
        configurable: true,
        enumerable,
        get() {
          let value = current;
          if (originalGet) {
            try { value = originalGet.call(this); } catch (_) { value = current; }
          }
          if (state.enabled) sanitizePlayerResponse(value);
          return value;
        },
        set(value) {
          if (state.enabled) sanitizePlayerResponse(value);
          if (originalSet) {
            try { originalSet.call(this, value); return; } catch (_) {}
          }
          current = value;
        }
      });
      state.initialInstalled = true;
      return true;
    } catch (_) {
      return false;
    }
  }

  function startBrowserRuntime(targetWindow) {
    if (!targetWindow) return false;
    installConfigListener(targetWindow);
    installInitialPlayerResponseHook(targetWindow);
    installFetchHook(targetWindow);
    installXHRHook(targetWindow);
    return true;
  }

  return {
    AD_KEYS,
    sanitizePlayerResponse,
    sanitizePlayerRequest,
    sanitizeRequestBody,
    isPlayerApiUrl,
    isPlayerRequestUrl,
    sanitizeJsonText,
    installConfigListener,
    installFetchHook,
    installXHRHook,
    installInitialPlayerResponseHook,
    startBrowserRuntime
  };
});
