const test = require('node:test');
const assert = require('node:assert/strict');
const hook = require('../page-hook.js');

test('removes root player ad metadata and preserves video data', () => {
  const value = {
    adPlacements: [{ adPlacementRenderer: {} }],
    playerAds: [{ playerAdsRenderer: {} }],
    adSlots: [{ slot: 1 }],
    streamingData: { formats: [{ itag: 18 }] },
    videoDetails: { videoId: 'abc' }
  };
  hook.sanitizePlayerResponse(value);
  assert.equal('adPlacements' in value, false);
  assert.equal('playerAds' in value, false);
  assert.equal('adSlots' in value, false);
  assert.deepEqual(value.streamingData.formats[0], { itag: 18 });
  assert.equal(value.videoDetails.videoId, 'abc');
});

test('removes nested ad renderer keys inside arrays', () => {
  const value = { contents: [{ companionAdRenderer: { id: 1 }, title: 'keep' }] };
  hook.sanitizePlayerResponse(value);
  assert.equal('companionAdRenderer' in value.contents[0], false);
  assert.equal(value.contents[0].title, 'keep');
});

test('handles cyclic objects', () => {
  const value = { adSlots: [1] };
  value.self = value;
  assert.doesNotThrow(() => hook.sanitizePlayerResponse(value));
  assert.equal('adSlots' in value, false);
});

test('matches supported YouTube player response API URLs', () => {
  assert.equal(hook.isPlayerApiUrl('https://www.youtube.com/youtubei/v1/player?prettyPrint=false'), true);
  assert.equal(hook.isPlayerApiUrl('https://www.youtube.com/youtubei/v1/next'), true);
  assert.equal(hook.isPlayerApiUrl('https://www.youtube.com/youtubei/v1/get_watch'), true);
  assert.equal(hook.isPlayerApiUrl('https://www.youtube.com/youtubei/v1/playlist/watch'), true);
  assert.equal(hook.isPlayerApiUrl('https://rr1---sn.googlevideo.com/videoplayback'), false);
});

test('fetch hook sanitizes YouTube player JSON responses', async () => {
  const payload = { adPlacements: [{ adPlacementRenderer: {} }], videoDetails: { videoId: 'abc' } };
  const target = {
    Response,
    fetch: async () => new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    })
  };
  hook.installFetchHook(target);
  const response = await target.fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false');
  const json = await response.json();
  assert.equal('adPlacements' in json, false);
  assert.equal(json.videoDetails.videoId, 'abc');
});

test('fetch hook leaves non-player responses untouched', async () => {
  const response = new Response('{"adPlacements":[1]}');
  const target = { Response, fetch: async () => response };
  hook.installFetchHook(target);
  const result = await target.fetch('https://www.youtube.com/api/search');
  assert.equal(result, response);
});

test('fetch hook preserves malformed player body content', async () => {
  const response = new Response('not-json', { status: 200 });
  const target = { Response, fetch: async () => response };
  hook.installFetchHook(target);
  const result = await target.fetch('https://www.youtube.com/youtubei/v1/player');
  assert.equal(await result.text(), 'not-json');
  assert.equal(result.status, 200);
});

test('initial player response hook sanitizes existing and future assignments', () => {
  const target = {
    ytInitialPlayerResponse: { adSlots: [1], videoDetails: { videoId: 'old' } }
  };
  assert.equal(hook.installInitialPlayerResponseHook(target), true);
  assert.equal('adSlots' in target.ytInitialPlayerResponse, false);
  target.ytInitialPlayerResponse = { playerAds: [1], videoDetails: { videoId: 'new' } };
  assert.equal('playerAds' in target.ytInitialPlayerResponse, false);
  assert.equal(target.ytInitialPlayerResponse.videoDetails.videoId, 'new');
});

test('config event can disable sanitization for later responses', async () => {
  const listeners = new Map();
  const document = {
    addEventListener(name, fn) { listeners.set(name, fn); }
  };
  const target = {
    Response,
    document,
    fetch: async () => new Response(JSON.stringify({ adPlacements: [1] }))
  };
  hook.installConfigListener(target);
  hook.installFetchHook(target);
  listeners.get('YAC_CONFIG')({ detail: { enabled: false } });
  const json = await (await target.fetch('https://www.youtube.com/youtubei/v1/player')).json();
  assert.deepEqual(json.adPlacements, [1]);
});
