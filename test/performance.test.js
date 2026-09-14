const test = require('node:test');
const assert = require('node:assert/strict');
const hook = require('../page-hook.js');

test('player response sanitization does not clone or tee the response stream', async () => {
  let cloneCalls = 0;
  const response = new Response(JSON.stringify({
    adPlacements: [{ adPlacementRenderer: {} }],
    videoDetails: { videoId: 'abc' }
  }), { status: 200, headers: { 'content-type': 'application/json' } });
  const originalClone = response.clone.bind(response);
  response.clone = function () { cloneCalls += 1; return originalClone(); };

  const target = { Response, fetch: async () => response };
  hook.installFetchHook(target);
  const result = await target.fetch('https://www.youtube.com/youtubei/v1/player');
  const json = await result.json();

  assert.equal(cloneCalls, 0);
  assert.equal('adPlacements' in json, false);
  assert.equal(json.videoDetails.videoId, 'abc');
});

test('sanitized player body cannot be bypassed through Response.prototype.json', async () => {
  const response = new Response(JSON.stringify({
    adPlacements: [{ adPlacementRenderer: {} }],
    videoDetails: { videoId: 'abc' }
  }), { headers: { 'content-type': 'application/json' } });
  const target = { Response, fetch: async () => response };

  hook.installFetchHook(target);
  const result = await target.fetch('https://www.youtube.com/youtubei/v1/player');
  const json = await Response.prototype.json.call(result);

  assert.equal('adPlacements' in json, false);
  assert.equal(json.videoDetails.videoId, 'abc');
});

test('get_watch and playlist/watch responses are sanitized without cloning', async () => {
  for (const path of ['/youtubei/v1/get_watch', '/youtubei/v1/playlist/watch']) {
    let cloneCalls = 0;
    const response = new Response(JSON.stringify({ adPlacements: [1], videoDetails: { videoId: 'abc' } }), {
      headers: { 'content-type': 'application/json' }
    });
    const originalClone = response.clone.bind(response);
    response.clone = function () { cloneCalls += 1; return originalClone(); };
    const target = { Response, Request, fetch: async () => response };

    hook.installFetchHook(target);
    const result = await target.fetch(`https://www.youtube.com${path}`, {
      method: 'POST',
      body: JSON.stringify({ playbackContext: { contentPlaybackContext: {} } })
    });
    const json = await result.json();

    assert.equal(cloneCalls, 0);
    assert.equal('adPlacements' in json, false);
    assert.equal(json.videoDetails.videoId, 'abc');
  }
});

test('fetch Request object player body is sanitized before dispatch', async () => {
  let sentRequest;
  const target = {
    Response,
    Request,
    fetch: async (input) => {
      sentRequest = input;
      return new Response(JSON.stringify({ videoDetails: { videoId: 'abc' } }), {
        headers: { 'content-type': 'application/json' }
      });
    }
  };
  hook.installFetchHook(target);

  const request = new Request('https://www.youtube.com/youtubei/v1/player', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      adSignalsInfo: { params: [{ key: 'dt', value: '1' }] },
      playbackContext: { contentPlaybackContext: {} },
      videoId: 'abc'
    })
  });

  await target.fetch(request);
  const sent = JSON.parse(await sentRequest.clone().text());
  assert.equal('adSignalsInfo' in sent, false);
  assert.equal(sent.playbackContext.contentPlaybackContext.isInlinePlaybackNoAd, true);
  assert.equal(sent.videoId, 'abc');
});
