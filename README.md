# YouTube Ad Cleaner

Extension Chrome/Edge Manifest V3 dành riêng cho YouTube. Bản v1.2.1 mở rộng cơ chế phòng quảng cáo trước player bằng cách xử lý cả **Fetch và XMLHttpRequest (XHR)**.

## Tính năng v1.2.1

- `page-hook.js` chạy trong **MAIN world** từ `document_start`.
- Làm sạch metadata quảng cáo trong `ytInitialPlayerResponse`, response Fetch và response XHR của `/youtubei/v1/player` / `/youtubei/v1/next`.
- Hỗ trợ XHR text/default và `responseType = "json"`.
- Nếu response không parse hoặc browser không cho override an toàn, extension **fail-open** để ưu tiên playback.
- DNR chỉ chặn domain quảng cáo ngoài có độ tin cậy cao: DoubleClick, Google Syndication và Google Ad Services.
- Không chặn endpoint player nội bộ YouTube và không chặn `googlevideo.com`.
- Dọn companion/sidebar ads, promoted feed cards, sponsored cards và popup YouTube Premium.
- Không dùng Skip Ad, mute, seek hoặc tăng tốc quảng cáo.
- Popup bật/tắt đồng bộ sanitizer, DOM cleanup và DNR.

## Cài trên Chrome / Edge

1. Tải ZIP trong GitHub Release và giải nén.
2. Mở `chrome://extensions` hoặc `edge://extensions`.
3. Bật **Developer mode**.
4. Chọn **Load unpacked**.
5. Chọn thư mục chứa `manifest.json`.
6. Khi nâng cấp, bấm **Reload**, đóng toàn bộ tab YouTube rồi mở lại để MAIN-world hook chạy từ đầu trang.

## Cách hoạt động

```text
YouTube page
   ├─ ytInitialPlayerResponse
   ├─ Fetch /youtubei/v1/player
   ├─ XHR   /youtubei/v1/player
   └─ /youtubei/v1/next
              │
              ▼
page-hook.js (MAIN world, document_start)
              │
              ├─ xóa metadata quảng cáo đã biết
              └─ fail-open khi không thể xử lý an toàn
              │
              ▼
        YouTube Player
```

## Giới hạn

YouTube có thể thay đổi schema hoặc cơ chế phân phối quảng cáo. Extension không đảm bảo chặn 100% mọi dạng quảng cáo vĩnh viễn. Chính sách là ưu tiên không phá playback khi gặp cơ chế chưa nhận diện.

## Kiểm thử

```bash
node --test
node --check page-hook.js
node --check content.js
node --check background.js
node --check popup.js
```

## Giấy phép

MIT License.
