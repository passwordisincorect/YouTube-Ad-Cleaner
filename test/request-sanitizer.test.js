const test = require('node:test');
const assert = require('node:assert/strict');
const hook = require('../page-hook.js');

test('recognizes supported player request endpoints only', () => {
  assert.equal(hook.isPlayerRequestUrl('https://www.youtube.com/youtubei/v1/player?prettyPrint=false'), true);
  assert.equal(hook.isPlayerRequestUrl('/youtubei/v1/get_watch'), true);
  assert.equal(hook.isPlayerRequestUrl('/youtubei/v1/playlist/watch'), true);
  assert.equal(hook.isPlayerRequestUrl('/youtubei/v1/next'), false);
  assert.equal(hook.isPlayerRequestUrl('https://rr1---sn.googlevideo.com/videoplayback'), false);
});

test('request sanitizer adds no-ad playback hint, removes ad signals and preserves identity data', () => {
  const body = {
    videoId: 'abc123',
    context: {
      client: { clientName: 'WEB', clientVersion: '2.20260912', visitorData: 'visitor' },
      adSignalsInfo: { params: [{ key: 'x', value: 'y' }] }
    },
    playbackContext: {
      contentPlaybackContext: { lactMilliseconds: '25' }
    },
    attestationRequest: { omitBotguardData: false },
    captionsRequested: true,
    contentCheckOk: false,
    racyCheckOk: false
  };

  hook.sanitizePlayerRequest(body);

  assert.equal(body.playbackContext.contentPlaybackContext.isInlinePlaybackNoAd, true);
  assert.equal('adSignalsInfo' in body.context, false);
  assert.equal(body.videoId, 'abc123');
  assert.equal(body.context.client.clientName, 'WEB');
  assert.equal(body.context.client.clientVersion, '2.20260912');
  assert.equal(body.context.client.visitorData, 'visitor');
  assert.deepEqual(body.attestationRequest, { omitBotguardData: false });
  assert.equal(body.captionsRequested, true);
  assert.equal(body.contentCheckOk, false);
  assert.equal(body.racyCheckOk, false);
});

test('request body sanitizer fails open on malformed or unsupported bodies', () => {
  assert.equal(hook.sanitizeRequestBody('not-json'), null);
  assert.equal(hook.sanitizeRequestBody(null), null);
  assert.equal(hook.sanitizeRequestBody(new Uint8Array([1, 2, 3])), null);
});

test('request body sanitizer returns sanitized JSON string', () => {
  const output = hook.sanitizeRequestBody(JSON.stringify({
    context: { adSignalsInfo: { params: [] } },
    playbackContext: { contentPlaybackContext: {} },
    videoId: 'x'
  }));
  const value = JSON.parse(output);
  assert.equal(value.playbackContext.contentPlaybackContext.isInlinePlaybackNoAd, true);
  assert.equal('adSignalsInfo' in value.context, false);
  assert.equal(value.videoId, 'x');
});

test('fetch sanitizes outbound player JSON before calling original fetch', async () => {
  let seenInput;
  let seenInit;
  const target = {
    Response,
    fetch: async (input, init) => {
      seenInput = input;
      seenInit = init;
      return new Response(JSON.stringify({ videoDetails: { videoId: 'x' } }), { headers: { 'content-type': 'application/json' } });
    }
  };
  hook.installFetchHook(target);
  await target.fetch('https://www.youtube.com/youtubei/v1/player', {
    method: 'POST',
    body: JSON.stringify({
      context: { client: { clientName: 'WEB' }, adSignalsInfo: { params: [] } },
      playbackContext: { contentPlaybackContext: {} },
      videoId: 'x'
    })
  });
  const sent = JSON.parse(seenInit.body);
  assert.equal(seenInput, 'https://www.youtube.com/youtubei/v1/player');
  assert.equal(sent.playbackContext.contentPlaybackContext.isInlinePlaybackNoAd, true);
  assert.equal('adSignalsInfo' in sent.context, false);
  assert.equal(sent.context.client.clientName, 'WEB');
});

test('fetch leaves malformed and non-player request bodies unchanged', async () => {
  const calls = [];
  const target = {
    Response,
    fetch: async (input, init) => {
      calls.push([input, init]);
      return new Response('{}', { headers: { 'content-type': 'application/json' } });
    }
  };
  hook.installFetchHook(target);
  await target.fetch('https://www.youtube.com/youtubei/v1/player', { body: 'not-json' });
  await target.fetch('https://www.youtube.com/api/search', { body: '{"x":1}' });
  assert.equal(calls[0][1].body, 'not-json');
  assert.equal(calls[1][1].body, '{"x":1}');
});

function makeFakeXHRClass() {
  return class FakeXHR {
    constructor() {
      this.readyState = 0;
      this.responseType = '';
      this._listeners = new Map();
      this.sentBody = undefined;
    }
    open(method, url) { this._url = url; }
    send(body) { this.sentBody = body; }
    addEventListener(name, fn) {
      const list = this._listeners.get(name) || [];
      list.push(fn);
      this._listeners.set(name, list);
    }
    get responseText() { return '{}'; }
    get response() { return this.responseType === 'json' ? {} : '{}'; }
  };
}

test('XHR sanitizes outbound player JSON before original send', () => {
  const FakeXHR = makeFakeXHRClass();
  const target = { XMLHttpRequest: FakeXHR, location: { href: 'https://www.youtube.com/' } };
  hook.installXHRHook(target);
  const xhr = new target.XMLHttpRequest();
  xhr.open('POST', '/youtubei/v1/player');
  xhr.send(JSON.stringify({
    context: { adSignalsInfo: { params: [] } },
    playbackContext: { contentPlaybackContext: {} },
    videoId: 'x'
  }));
  const sent = JSON.parse(xhr.sentBody);
  assert.equal(sent.playbackContext.contentPlaybackContext.isInlinePlaybackNoAd, true);
  assert.equal('adSignalsInfo' in sent.context, false);
});

test('XHR leaves non-player and malformed request bodies unchanged', () => {
  const FakeXHR = makeFakeXHRClass();
  const target = { XMLHttpRequest: FakeXHR, location: { href: 'https://www.youtube.com/' } };
  hook.installXHRHook(target);

  const malformed = new target.XMLHttpRequest();
  malformed.open('POST', '/youtubei/v1/player');
  malformed.send('not-json');
  assert.equal(malformed.sentBody, 'not-json');

  const other = new target.XMLHttpRequest();
  other.open('POST', '/youtubei/v1/search');
  other.send('{"x":1}');
  assert.equal(other.sentBody, '{"x":1}');
});
