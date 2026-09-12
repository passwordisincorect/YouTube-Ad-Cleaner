# YouTube Ad Cleaner

Extension Chrome/Edge Manifest V3 dành riêng cho YouTube. Bản v1.2.0 chuyển từ xử lý quảng cáo sau khi player đã vào trạng thái quảng cáo sang **làm sạch metadata quảng cáo trước khi player sử dụng response**.

## Tính năng v1.2.0

- `page-hook.js` chạy trong **MAIN world** từ `document_start`.
- Làm sạch các trường quảng cáo như `adPlacements`, `playerAds`, `adSlots` và các renderer quảng cáo lồng nhau trong `ytInitialPlayerResponse` và response `/youtubei/v1/player` / `/youtubei/v1/next`.
- Nếu response không parse được hoặc gặp tình huống không an toàn, extension **fail-open** và trả response gốc để ưu tiên video phát bình thường.
- DNR chỉ chặn domain quảng cáo ngoài có độ tin cậy cao: DoubleClick, Google Syndication và Google Ad Services.
- Không chặn endpoint player nội bộ YouTube và không chặn `googlevideo.com`, tránh lỗi chờ màn hình đen do slot quảng cáo bị giữ lại.
- Dọn companion/sidebar ads, promoted feed cards và popup YouTube Premium.
- Thu gọn cả card quảng cáo trong feed để không để lại vùng trống.
- Không còn cơ chế Skip Ad, mute, seek hoặc tăng tốc quảng cáo.
- Popup bật/tắt đồng bộ MAIN-world sanitizer, DOM cleanup và ruleset DNR.
- Không analytics, telemetry hoặc gửi dữ liệu người dùng ra ngoài.

## Cài trên Chrome / Edge

1. Tải ZIP trong GitHub Release và giải nén.
2. Mở `chrome://extensions` hoặc `edge://extensions`.
3. Bật **Developer mode**.
4. Chọn **Load unpacked**.
5. Chọn thư mục chứa `manifest.json`.
6. Nếu nâng cấp từ bản cũ, bấm **Reload** extension và tải lại tab YouTube.

## Cách hoạt động

```text
YouTube page
   ├─ ytInitialPlayerResponse
   └─ /youtubei/v1/player, /youtubei/v1/next
              │
              ▼
page-hook.js (MAIN world, document_start)
              │
              ├─ xóa metadata quảng cáo đã biết
              └─ fail-open khi không thể xử lý an toàn
              │
              ▼
        YouTube Player

content.js (ISOLATED world)
   └─ dọn companion/sidebar/feed/Premium UI

rules.json
   └─ chỉ chặn domain quảng cáo ngoài
```

## Giới hạn

YouTube có thể thay đổi schema player hoặc cơ chế phân phối quảng cáo. Extension không đảm bảo chặn 100% mọi dạng quảng cáo vĩnh viễn. Chính sách v1.2.0 là **ưu tiên không làm hỏng playback**: nếu không chắc chắn, dữ liệu gốc được giữ lại.

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
