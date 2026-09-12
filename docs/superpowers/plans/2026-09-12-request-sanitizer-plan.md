# YouTube Ad Cleaner v1.3.0 Request Sanitizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sanitize supported YouTube player request bodies before network dispatch so the player is less likely to enter an ad state, while preserving fail-open playback behavior.

**Architecture:** Extend `page-hook.js` with request-body helpers used by both Fetch and XHR. Keep existing response sanitization as a secondary layer. Avoid client spoofing and preserve all unrelated request fields.

**Tech Stack:** Chrome/Edge Manifest V3, JavaScript, MAIN-world content scripts, Fetch/XHR interception, Node.js built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-12-request-sanitizer-design.md`

## Global Constraints

- Release version: `1.3.0`.
- No Skip Ad, mute, seek or playback-rate manipulation.
- Do not block `googlevideo.com` or YouTube player endpoints.
- Do not spoof client/auth/attestation/content-check identity fields.
- Every sanitizer is fail-open.
- TDD: every production behavior begins with a failing test.

---

### Task 1: Request sanitizer core

**Files:**
- Modify: `page-hook.js`
- Create: `test/request-sanitizer.test.js`

**Interfaces:**
- Produces: `isPlayerRequestUrl(url): boolean`
- Produces: `sanitizePlayerRequest(value): any`
- Produces: `sanitizeRequestBody(body): string | null`

- [ ] **Step 1: Write failing tests**

Tests must verify supported URLs include `/youtubei/v1/player`, `/youtubei/v1/get_watch`, `/youtubei/v1/playlist/watch`; non-player URLs are rejected. Verify `sanitizePlayerRequest()` sets `playbackContext.contentPlaybackContext.isInlinePlaybackNoAd = true`, removes root/context `adSignalsInfo`, and preserves `videoId`, client identity, captions, attestation and unrelated fields.

- [ ] **Step 2: Run RED**

Run: `node --test test/request-sanitizer.test.js`

Expected: FAIL because the new request helper exports do not exist.

- [ ] **Step 3: Implement minimal request helpers**

Use exact URL matching by pathname substring, mutate only known-safe fields, parse only string JSON bodies, return `null` on malformed input.

- [ ] **Step 4: Run GREEN**

Run: `node --test test/request-sanitizer.test.js && node --check page-hook.js`

Expected: all Task 1 tests pass.

---

### Task 2: Fetch outbound sanitizer

**Files:**
- Modify: `page-hook.js`
- Modify: `test/request-sanitizer.test.js`

**Interfaces:**
- Consumes: `isPlayerRequestUrl`, `sanitizeRequestBody`
- Extends: `installFetchHook(targetWindow)`

- [ ] **Step 1: Add failing tests**

Capture arguments received by a fake original `fetch`. For a player URL with JSON `init.body`, assert the original fetch receives sanitized JSON before returning its response. Verify non-player and malformed bodies remain unchanged. Verify disabling through `YAC_CONFIG` leaves body unchanged.

- [ ] **Step 2: Run RED**

Run: `node --test test/request-sanitizer.test.js`

Expected: outbound body assertions fail on v1.2.1 behavior.

- [ ] **Step 3: Implement minimal Fetch request mutation**

Clone `init` only when a supported player URL has a string body that can be sanitized. Call original fetch with unchanged arguments otherwise. Preserve current response sanitizer.

- [ ] **Step 4: Run GREEN**

Run: `node --test test/request-sanitizer.test.js test/page-hook.test.js`

Expected: request and existing Fetch response tests pass.

---

### Task 3: XHR outbound sanitizer

**Files:**
- Modify: `page-hook.js`
- Modify: `test/request-sanitizer.test.js`
- Preserve: `test/xhr-player-response.test.js`

**Interfaces:**
- Consumes: request URL recorded by `open()`
- Extends: `installXHRHook(targetWindow)` by wrapping `send()`

- [ ] **Step 1: Add failing tests**

Fake XHR must record the body passed to its original `send`. Assert supported player JSON is sanitized before dispatch, non-player/malformed bodies are untouched, and current response interception still works.

- [ ] **Step 2: Run RED**

Run: `node --test test/request-sanitizer.test.js test/xhr-player-response.test.js`

Expected: send-body assertions fail before implementation.

- [ ] **Step 3: Implement minimal XHR send wrapper**

Store the original `send`, inspect URL recorded by wrapped `open`, sanitize only string JSON bodies for supported URLs, otherwise pass through unchanged.

- [ ] **Step 4: Run GREEN**

Run: `node --test test/request-sanitizer.test.js test/xhr-player-response.test.js`

Expected: all request/response XHR tests pass.

---

### Task 4: Version, docs and regression verification

**Files:**
- Modify: `manifest.json`
- Modify: `popup.html`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Verify: `.github/workflows/release.yml`

**Interfaces:**
- Release version `1.3.0`

- [ ] **Step 1: Update version and product copy**

Set manifest/popup to `1.3.0`. README explains request-before-response architecture and SABR-targeted behavior without claiming guaranteed universal blocking. Add only a new `1.3.0` changelog section above `1.2.1`.

- [ ] **Step 2: Run complete suite**

Run:

```bash
node --test
node --check page-hook.js
node --check content.js
node --check background.js
node --check popup.js
node --check scripts/extract-release-notes.js
node -e "JSON.parse(require('fs').readFileSync('manifest.json')); JSON.parse(require('fs').readFileSync('rules.json')); console.log('json ok')"
```

Expected: zero failed tests, all checks exit 0.

- [ ] **Step 3: Confirm forbidden post-ad behavior is absent**

Search production JS for `ad-skip-button`, `playbackRate`, media `currentTime` assignment and `muted = true`.

Expected: no post-ad bypass implementation.

- [ ] **Step 4: Fast-forward main only after verification**

Compare `main...v1.3-request-sanitizer`; require `behind_by = 0`. Fast-forward `main` to the verified commit.

- [ ] **Step 5: Verify CI and Release**

Wait for GitHub Actions `test-and-release` to complete successfully. Verify `v1.3.0` release exists, ZIP asset exists, and release body contains only the `1.3.0` changelog section.
