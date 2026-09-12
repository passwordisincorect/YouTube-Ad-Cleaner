# YouTube Ad Cleaner v1.2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ngăn YouTube player đi vào trạng thái quảng cáo bằng cách sanitize player-response trước khi player dùng dữ liệu, đồng thời dọn companion/sidebar/Premium ads mà không gây black-screen stall.

**Architecture:** `page-hook.js` chạy MAIN world ở `document_start` để sanitize `ytInitialPlayerResponse` và fetch player JSON. `content.js` chạy ISOLATED world để đọc storage, phát cấu hình cho MAIN world và dọn quảng cáo DOM. `rules.json` chỉ giữ blocklist domain quảng cáo ngoài, không chặn endpoint player nội bộ YouTube.

**Tech Stack:** Chrome/Edge Extension Manifest V3, JavaScript, `chrome.storage`, `declarativeNetRequest`, Node.js built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-12-player-response-sanitizer-design.md`

## Global Constraints

- Version phát hành: `1.2.0`.
- Không skip quảng cáo, không mute, không seek và không tăng playbackRate.
- Không block `googlevideo.com`.
- Không block endpoint player nội bộ YouTube bằng DNR.
- Sanitizer phải fail-open: lỗi parse/schema phải trả response gốc.
- Mọi behavior mới phải đi qua RED → GREEN bằng Node test runner.

---

### Task 1: Player response sanitizer core

**Files:**
- Create: `page-hook.js`
- Create: `test/page-hook.test.js`

**Interfaces:**
- Produces: `sanitizePlayerResponse(value): any`
- Produces: `isPlayerApiUrl(url): boolean`
- Produces: `sanitizeJsonText(text): string | null`

- [ ] **Step 1: Write failing sanitizer tests**

```js
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

test('matches only YouTube player/next API URLs', () => {
  assert.equal(hook.isPlayerApiUrl('https://www.youtube.com/youtubei/v1/player?prettyPrint=false'), true);
  assert.equal(hook.isPlayerApiUrl('https://www.youtube.com/youtubei/v1/next'), true);
  assert.equal(hook.isPlayerApiUrl('https://rr1---sn.googlevideo.com/videoplayback'), false);
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
node --test test/page-hook.test.js
```

Expected: FAIL because `page-hook.js` does not exist.

- [ ] **Step 3: Implement minimal sanitizer module**

`page-hook.js` must expose CommonJS exports during tests and browser globals in MAIN world. Use a `Set` of exact ad keys plus recursive traversal with `WeakSet`.

Core implementation shape:

```js
const AD_KEYS = new Set([
  'adPlacements', 'playerAds', 'adSlots', 'adBreakParams',
  'adBreakHeartbeatParams', 'adBreakServiceRenderer',
  'adPlacementRenderer', 'linearAdSequenceRenderer',
  'instreamAdPlayerOverlayRenderer', 'instreamVideoAdRenderer',
  'playerLegacyDesktopWatchAdsRenderer', 'playerAdsRenderer',
  'companionAdRenderer', 'promotedSparklesWebRenderer'
]);

function sanitizePlayerResponse(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const key of Object.keys(value)) {
    if (AD_KEYS.has(key)) {
      delete value[key];
      continue;
    }
    sanitizePlayerResponse(value[key], seen);
  }
  return value;
}

function isPlayerApiUrl(url) {
  const text = String(url || '');
  return text.includes('/youtubei/v1/player') || text.includes('/youtubei/v1/next');
}
```

- [ ] **Step 4: Run GREEN**

```bash
node --test test/page-hook.test.js
node --check page-hook.js
```

Expected: all Task 1 tests pass and syntax check exits 0.

---

### Task 2: MAIN-world interception and initial-response hook

**Files:**
- Modify: `page-hook.js`
- Modify: `test/page-hook.test.js`

**Interfaces:**
- Consumes: `sanitizePlayerResponse`, `isPlayerApiUrl`
- Produces: `installFetchHook(targetWindow)`
- Produces: `installInitialPlayerResponseHook(targetWindow)`

- [ ] **Step 1: Add failing tests for fetch response sanitization and fail-open behavior**

Use a fake `targetWindow.fetch` returning a JSON `Response`. Verify player URLs return sanitized JSON and non-player URLs return untouched payload. Add malformed-JSON test asserting the original response body remains available.

- [ ] **Step 2: Run RED**

```bash
node --test test/page-hook.test.js
```

Expected: FAIL because hook installers are missing.

- [ ] **Step 3: Implement fetch hook**

Implementation rules:

```js
async function wrappedFetch(input, init) {
  const response = await originalFetch(input, init);
  const url = typeof input === 'string' ? input : input && input.url;
  if (!enabled || !isPlayerApiUrl(url)) return response;
  try {
    const clone = response.clone();
    const data = await clone.json();
    sanitizePlayerResponse(data);
    return new Response(JSON.stringify(data), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  } catch (_) {
    return response;
  }
}
```

Install accessor for `ytInitialPlayerResponse` using `Object.defineProperty`; sanitize existing value first if present. Wrap defineProperty in `try/catch` and fail open.

- [ ] **Step 4: Add configuration event support**

MAIN-world hook listens for `YAC_CONFIG` CustomEvent and changes local `enabled` state only when `event.detail.enabled` is boolean.

- [ ] **Step 5: Run GREEN**

```bash
node --test test/page-hook.test.js
node --check page-hook.js
```

Expected: all player-hook tests pass.

---

### Task 3: Remove post-ad bypass and extend DOM cleaner

**Files:**
- Modify: `content.js`
- Modify: `test/content.test.js`

**Interfaces:**
- Produces: `isPremiumPromoNode(node): boolean`
- Produces: DOM cleanup selectors for companion/sidebar/Premium containers
- Emits: `YAC_CONFIG` event with `{ enabled }`

- [ ] **Step 1: Write failing regression tests**

Add tests asserting:

```js
assert.equal(source.includes('playbackRate = 16'), false);
assert.equal(source.includes('video.currentTime ='), false);
assert.equal(source.includes('video.muted = true'), false);
```

Add DOM tests for:

```js
'ytd-companion-slot-renderer'
'ytd-action-companion-ad-renderer'
'ytd-display-ad-renderer'
```

and a Premium promo node whose text contains `YouTube Premium`, while a generic dialog without that text must not be hidden.

- [ ] **Step 2: Run RED**

```bash
node --test test/content.test.js
```

Expected: FAIL because v1.1.0 still contains bypass logic and lacks the new selectors/promo predicate.

- [ ] **Step 3: Remove bypass code**

Delete `PLAYER_AD_SELECTOR`, media state tracking, `bypassPlayerAd()`, skip-button clicking, mute, seek and playback-rate manipulation. `cleanPage()` should only clean DOM and return `{ hiddenCount }`.

- [ ] **Step 4: Add companion/sidebar and Premium cleanup**

Add safe selectors for YouTube companion renderers and detect Premium promo only when the matched promo/dialog container text includes `YouTube Premium` or known Premium CTA copy. Do not hide arbitrary `tp-yt-paper-dialog`.

- [ ] **Step 5: Emit MAIN-world config**

After reading storage and whenever storage changes:

```js
document.dispatchEvent(new CustomEvent('YAC_CONFIG', {
  detail: { enabled }
}));
```

Keep DOM cleanup gated by the same `enabled` flag.

- [ ] **Step 6: Run GREEN**

```bash
node --test test/content.test.js
node --check content.js
```

Expected: all content tests pass.

---

### Task 4: Manifest and safe DNR rules

**Files:**
- Modify: `manifest.json`
- Modify: `rules.json`
- Modify: `test/manifest.test.js`
- Create: `test/rules.test.js`

**Interfaces:**
- Manifest loads `page-hook.js` in MAIN world and `content.js` in ISOLATED world.

- [ ] **Step 1: Write failing manifest/rules tests**

Assertions:

```js
assert.equal(manifest.version, '1.2.0');
const page = manifest.content_scripts.find(x => x.js.includes('page-hook.js'));
assert.equal(page.world, 'MAIN');
assert.equal(page.run_at, 'document_start');
const isolated = manifest.content_scripts.find(x => x.js.includes('content.js'));
assert.equal(isolated.world, 'ISOLATED');
```

Rules test serializes JSON and asserts absence of:

```text
/api/stats/ads
/get_midroll_info
/youtubei/v1/player/ad_break
/get_video_info
/ptracking
googlevideo.com
```

and presence of external ad domains.

- [ ] **Step 2: Run RED**

```bash
node --test test/manifest.test.js test/rules.test.js
```

Expected: FAIL on old version/world/rules.

- [ ] **Step 3: Update manifest**

Use two content-script entries at `document_start`:

```json
{
  "matches": ["https://www.youtube.com/*", "https://youtube.com/*"],
  "js": ["page-hook.js"],
  "run_at": "document_start",
  "world": "MAIN"
},
{
  "matches": ["https://www.youtube.com/*", "https://youtube.com/*"],
  "js": ["content.js"],
  "run_at": "document_start",
  "world": "ISOLATED"
}
```

Set version to `1.2.0`.

- [ ] **Step 4: Reduce rules.json**

Keep only high-confidence external ad-domain blocking for `doubleclick.net`, `googlesyndication.com`, and `googleadservices.com`, scoped to YouTube initiators. Do not block YouTube-internal endpoints.

- [ ] **Step 5: Run GREEN**

```bash
node --test test/manifest.test.js test/rules.test.js
```

Expected: all tests pass.

---

### Task 5: Release packaging, docs and full verification

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `popup.html`
- Modify: `.github/workflows/release.yml`

**Interfaces:**
- Release ZIP must include `page-hook.js`, `content.js`, `background.js`, `rules.json`, popup files, manifest, license and docs.

- [ ] **Step 1: Update product copy and changelog**

Popup shows `v1.2.0` and describes prevention before player ad state rather than skip/bypass. README documents MAIN-world sanitizer and fail-open policy. CHANGELOG adds v1.2.0 bullets and explicitly notes removal of skip/mute/seek/playback-rate fallback.

- [ ] **Step 2: Update release workflow package list**

Ensure ZIP command includes:

```text
manifest.json
page-hook.js
content.js
background.js
rules.json
popup.html
popup.css
popup.js
LICENSE
README.md
CHANGELOG.md
```

- [ ] **Step 3: Run complete local verification**

```bash
node --test
node --check page-hook.js
node --check content.js
node --check background.js
node --check popup.js
node -e "JSON.parse(require('fs').readFileSync('manifest.json')); JSON.parse(require('fs').readFileSync('rules.json')); console.log('json ok')"
```

Expected: 0 failed tests, all syntax checks exit 0, output contains `json ok`.

- [ ] **Step 4: Review production source for banned fallback behavior**

Run:

```bash
grep -R "playbackRate\|currentTime\|muted = true\|ad-skip-button" -- page-hook.js content.js background.js
```

Expected: no matches.

- [ ] **Step 5: Push v1.2.0 to main only after verification**

Fast-forward the verified implementation commit to `main`.

- [ ] **Step 6: Verify GitHub Actions and Release**

Confirm workflow conclusion is `success`, release tag is `v1.2.0`, and release asset `YouTube-Ad-Cleaner-v1.2.0.zip` exists with a SHA-256 digest before reporting completion.
