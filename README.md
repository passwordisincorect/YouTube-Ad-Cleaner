# YouTube Ad Cleaner

Extension Chrome/Edge Manifest V3 dành riêng cho YouTube. Bản v1.3.0 bổ sung lớp **request sanitizer trước khi request player được gửi**, thay vì chỉ xử lý metadata quảng cáo sau khi response quay về.

## Tính năng v1.3.0

- `page-hook.js` chạy trong **MAIN world** từ `document_start`.
- Với request JSON tới `/youtubei/v1/player`, `/youtubei/v1/get_watch` và `/youtubei/v1/playlist/watch`, extension đặt `playbackContext.contentPlaybackContext.isInlinePlaybackNoAd = true` khi cấu trúc đó tồn tại.
- Loại `adSignalsInfo` ở root/context của request player khi có, nhưng giữ nguyên `videoId`, client name/version, visitor data, auth/attestation, captions và content-check fields.
- Hỗ trợ cả outbound Fetch và `XMLHttpRequest.send()`.
- Tiếp tục làm sạch response player từ Fetch/XHR và `ytInitialPlayerResponse` như lớp dự phòng.
- Nếu body/response không parse được hoặc browser không cho override an toàn, extension **fail-open** và dùng dữ liệu gốc để ưu tiên playback.
- DNR chỉ chặn domain quảng cáo ngoài có độ tin cậy cao: DoubleClick, Google Syndication và Google Ad Services.
- Không chặn endpoint player nội bộ YouTube và không chặn `googlevideo.com`.
- Dọn companion/sidebar ads, promoted feed cards, sponsored cards và popup YouTube Premium.
- Không dùng Skip Ad, mute, seek hoặc tăng tốc quảng cáo.

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
request sanitizer (Fetch + XHR send)
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

YouTube thường xuyên thay đổi schema và cơ chế quảng cáo. v1.3.0 nhắm vào luồng web player/SABR đã quan sát được, nhưng không đảm bảo chặn 100% mọi biến thể quảng cáo hoặc cơ chế tương lai. Chính sách của extension là ưu tiên **không phá playback** khi gặp dữ liệu chưa nhận diện.

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
