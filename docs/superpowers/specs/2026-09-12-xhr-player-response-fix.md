# v1.2.1 XHR Player Response Fix

## Root cause

v1.2.0 sanitizes `ytInitialPlayerResponse` and Fetch responses, but it does not intercept `XMLHttpRequest`. YouTube can retrieve player responses through XHR, so `adPlacements`, `playerAds` and `adSlots` can still reach the player and trigger a real ad state.

## Fix

- Add `installXHRHook()` in `page-hook.js`.
- Wrap `XMLHttpRequest.prototype.open()` at `document_start`.
- Resolve relative URLs against the current YouTube page URL.
- Attach an internal `readystatechange` listener before page code can attach its later handlers.
- At `readyState === 4`, sanitize only `/youtubei/v1/player` and `/youtubei/v1/next` responses.
- Support both text/default XHR responses and `responseType = "json"`.
- Leave non-player XHR responses unchanged.
- Fail open on parse/descriptor errors.
- Do not add skip, mute, seek or playback-rate behavior.
