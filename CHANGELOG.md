# Changelog

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
