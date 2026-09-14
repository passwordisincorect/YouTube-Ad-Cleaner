# YouTube Ad Cleaner

Extension Chrome/Edge Manifest V3 dành riêng cho YouTube. Bản v1.3.1 chính thức hóa cơ chế đã thử ở **LOCAL TEST 3**: giữ request sanitizer của v1.3.0, mở rộng xử lý `Request` object và dùng response sanitizer không clone/tee stream.

## Tính năng v1.3.1

- `page-hook.js` chạy trong **MAIN world** từ `document_start`.
- Sanitize outbound request tới `/youtubei/v1/player`, `/youtubei/v1/get_watch` và `/youtubei/v1/playlist/watch`.
- Loại `adSignalsInfo` ở root/context và thêm `playbackContext.contentPlaybackContext.isInlinePlaybackNoAd = true` khi cấu trúc request hỗ trợ.
- Hỗ trợ cả `fetch(url, init)`, `fetch(Request)` và `XMLHttpRequest.send()`.
- Sanitize player response từ `/youtubei/v1/player`, `/youtubei/v1/next`, `/youtubei/v1/get_watch` và `/youtubei/v1/playlist/watch`.
- Fetch player response được đọc một lần và dựng lại sau khi sanitize, **không dùng `Response.clone()`/tee stream**.
- Tiếp tục làm sạch `ytInitialPlayerResponse` và XHR response.
- DNR chỉ chặn các domain quảng cáo ngoài có độ tin cậy cao: DoubleClick, Google Syndication và Google Ad Services.
- Không chặn `googlevideo.com` và không dùng Skip Ad, mute, seek hoặc tăng tốc quảng cáo.
- Nếu request/response không thể xử lý an toàn, extension ưu tiên fail-open.

## Cài trên Chrome / Edge

1. Tải ZIP trong GitHub Release và giải nén.
2. Mở `chrome://extensions` hoặc `edge://extensions`.
3. Bật **Developer mode**.
4. Chọn **Load unpacked**.
5. Chọn thư mục chứa `manifest.json`.
6. Khi nâng cấp, bấm **Reload**, đóng toàn bộ tab YouTube rồi mở lại để MAIN-world hook chạy từ đầu trang.

## Cách hoạt động

```text
YouTube tạo player request
        │
        ▼
request sanitizer (Fetch + Request object + XHR send)
        │
        ▼
YouTube server
        │
        ▼
response sanitizer (Fetch + XHR + initial response)
        │
        ▼
YouTube Player
```

## Giới hạn

YouTube thường xuyên thay đổi schema và cơ chế quảng cáo. v1.3.1 không đảm bảo chặn 100% mọi biến thể quảng cáo. Cơ chế Fetch của bản này phải đọc và dựng lại player response sau khi sanitize, vì vậy trên một số phiên có thể làm tăng thời gian bắt đầu video hoặc gây loading lâu hơn. Đây là đánh đổi đã biết của dòng v1.x và sẽ được xem xét lại ở kiến trúc v2.0.

## Kiểm thử

```bash
node --test
node --check page-hook.js
node --check content.js
node --check background.js
node --check popup.js
node --check scripts/extract-release-notes.js
```

## Giấy phép

MIT License.
