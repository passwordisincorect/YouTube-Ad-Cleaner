const test = require('node:test');
const assert = require('node:assert/strict');
const hook = require('../page-hook.js');

function makeFakeXHRClass() {
  return class FakeXHR {
    constructor() {
      this.readyState = 0;
      this.responseType = '';
      this._listeners = new Map();
      this._rawText = '';
    }

    open(method, url) {
      this._url = url;
    }

    addEventListener(name, fn) {
      const list = this._listeners.get(name) || [];
      list.push(fn);
      this._listeners.set(name, list);
    }

    get responseText() {
      return this._rawText;
    }

    get response() {
      return this.responseType === 'json' ? JSON.parse(this._rawText) : this._rawText;
    }

    finish(payload) {
      this._rawText = typeof payload === 'string' ? payload : JSON.stringify(payload);
      this.readyState = 4;
      for (const fn of this._listeners.get('readystatechange') || []) {
        fn.call(this, { type: 'readystatechange' });
      }
    }
  };
}

test('XHR player response is sanitized before page handlers read responseText', () => {
  const FakeXHR = makeFakeXHRClass();
  const target = {
    XMLHttpRequest: FakeXHR,
    location: { href: 'https://www.youtube.com/watch?v=abc' }
  };

  assert.equal(typeof hook.installXHRHook, 'function');
  assert.equal(hook.installXHRHook(target), true);

  const xhr = new target.XMLHttpRequest();
  xhr.open('POST', '/youtubei/v1/player?prettyPrint=false');

  let seen;
  xhr.addEventListener('readystatechange', function () {
    if (this.readyState === 4) seen = JSON.parse(this.responseText);
  });

  xhr.finish({
    adPlacements: [{ adPlacementRenderer: {} }],
    videoDetails: { videoId: 'abc' }
  });

  assert.equal('adPlacements' in seen, false);
  assert.equal(seen.videoDetails.videoId, 'abc');
});

test('XHR json player response is sanitized before page handlers read response', () => {
  const FakeXHR = makeFakeXHRClass();
  const target = {
    XMLHttpRequest: FakeXHR,
    location: { href: 'https://www.youtube.com/' }
  };

  hook.installXHRHook(target);
  const xhr = new target.XMLHttpRequest();
  xhr.responseType = 'json';
  xhr.open('POST', 'https://www.youtube.com/youtubei/v1/player');

  let seen;
  xhr.addEventListener('readystatechange', function () {
    if (this.readyState === 4) seen = this.response;
  });

  xhr.finish({
    playerAds: [1],
    videoDetails: { videoId: 'json' }
  });

  assert.equal('playerAds' in seen, false);
  assert.equal(seen.videoDetails.videoId, 'json');
});

test('XHR non-player response is left untouched', () => {
  const FakeXHR = makeFakeXHRClass();
  const target = {
    XMLHttpRequest: FakeXHR,
    location: { href: 'https://www.youtube.com/' }
  };

  hook.installXHRHook(target);
  const xhr = new target.XMLHttpRequest();
  xhr.open('GET', '/api/search');

  let seen;
  xhr.addEventListener('readystatechange', function () {
    if (this.readyState === 4) seen = JSON.parse(this.responseText);
  });

  xhr.finish({ adPlacements: [1] });
  assert.deepEqual(seen.adPlacements, [1]);
});
