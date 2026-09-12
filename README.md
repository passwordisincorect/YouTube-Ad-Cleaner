# YouTube Ad Cleaner

Extension Chrome/Edge Manifest V3 dành riêng cho YouTube. Bản v1.1.0 kết hợp chặn request quảng cáo bằng `declarativeNetRequest`, dọn quảng cáo/promoted trong giao diện và bỏ qua nhanh quảng cáo video còn lọt qua.

## Tính năng v1.1.0

- Chặn request quảng cáo phổ biến từ DoubleClick, Google Syndication và Google Ad Services khi request được khởi tạo từ YouTube.
- Chặn một số endpoint quảng cáo riêng của YouTube như `api/stats/ads`, `get_midroll_info` và `player/ad_break`.
- Không chặn `googlevideo.com`, tránh làm hỏng luồng phát video chính.
- Thu gọn cả card quảng cáo trong feed để không còn ô/vùng đen trống.
- Tự bấm **Skip Ad** khi nút xuất hiện.
- Nếu quảng cáo player không có nút Skip nhưng vẫn lọt qua, extension tắt tiếng, tăng tốc và đưa quảng cáo tới cuối; sau đó khôi phục trạng thái âm thanh/tốc độ ban đầu.
- Popup bật/tắt đồng bộ cả DOM cleanup và ruleset chặn mạng.
- Không analytics, telemetry hoặc gửi dữ liệu của người dùng ra ngoài.

## Cài trên Chrome / Edge

1. Tải ZIP trong GitHub Release và giải nén.
2. Mở `chrome://extensions` hoặc `edge://extensions`.
3. Bật **Developer mode**.
4. Chọn **Load unpacked**.
5. Chọn thư mục chứa `manifest.json`.

## Nâng cấp từ v1.0.0

Thay thư mục extension bằng v1.1.0, vào trang Extensions và bấm **Reload**, sau đó tải lại tab YouTube một lần.

## Giới hạn

YouTube thay đổi cơ chế quảng cáo thường xuyên. Một số quảng cáo có thể được phân phối chung với luồng video chính nên không thể chặn an toàn bằng rule mạng mà không làm hỏng video. Bản v1.1.0 vì vậy dùng chặn mạng trước và cơ chế bỏ qua player làm lớp dự phòng.

## Kiểm thử

```bash
node --test
node --check content.js
node --check background.js
node --check popup.js
```

## Giấy phép

MIT License.
