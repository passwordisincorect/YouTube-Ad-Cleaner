# Changelog

## 1.2.0 - 2026-09-12

- Thêm MAIN-world `page-hook.js` chạy từ `document_start` để sanitize player response trước khi YouTube Player sử dụng.
- Làm sạch `ytInitialPlayerResponse` và JSON từ `/youtubei/v1/player` / `/youtubei/v1/next` theo chính sách fail-open.
- Xóa các DNR rule chặn endpoint player nội bộ YouTube từng có thể gây màn hình đen/chờ slot quảng cáo.
- DNR v1.2.0 chỉ giữ blocklist cho DoubleClick, Google Syndication và Google Ad Services; tiếp tục không chặn `googlevideo.com`.
- Bổ sung dọn companion/sidebar ads, sponsored cards và popup YouTube Premium.
- Giữ cơ chế thu gọn card quảng cáo để không để lại vùng trống trong feed.
- Loại bỏ hoàn toàn cơ chế click Skip Ad, mute, seek `currentTime` và tăng `playbackRate`.
- Cập nhật popup, tài liệu, test và release packaging cho kiến trúc v1.2.0.

## 1.1.0 - 2026-09-12

- Thêm `declarativeNetRequest` ruleset để chặn các request quảng cáo phổ biến trên YouTube.
- Không chặn CDN `googlevideo.com` để tránh làm hỏng video chính.
- Thêm service worker đồng bộ ruleset với nút bật/tắt extension.
- Sửa lỗi quảng cáo feed bị ẩn nhưng vẫn để lại vùng đen/trống trong grid.
- Thêm cơ chế xử lý quảng cáo player không có nút Skip: tắt tiếng, tăng tốc và đưa tới cuối rồi khôi phục trạng thái media.
- Tăng tần suất kiểm tra player để phản ứng nhanh hơn với quảng cáo mới xuất hiện.
- Mở rộng bộ test từ 7 lên 15 test.

## 1.0.0 - 2026-09-12

- Phát hành đầu tiên.
- Hỗ trợ Chrome/Edge Manifest V3.
- Ẩn các container quảng cáo/promoted phổ biến trên YouTube.
- Tự bấm nút Skip Ad khi khả dụng.
- Thêm popup bật/tắt và lưu trạng thái qua `chrome.storage.sync`.
- Không thu thập dữ liệu và không gọi dịch vụ bên ngoài.
