# YouTube Ad Cleaner

Extension Chrome/Edge Manifest V3 giúp làm sạch một số quảng cáo giao diện trên YouTube và tự bấm nút **Skip Ad** khi YouTube cung cấp nút bỏ qua.

## Tính năng v1.0.0

- Ẩn một số vùng quảng cáo/promoted phổ biến trên YouTube.
- Tự bấm nút Skip Ad khi nút khả dụng.
- Popup bật/tắt extension.
- Lưu trạng thái bằng `chrome.storage.sync`.
- Chỉ chạy trên `youtube.com`.
- Không analytics, telemetry hoặc gửi dữ liệu ra ngoài.
- Không chặn request mạng trong v1.0.

## Cài trên Chrome

1. Giải nén file ZIP.
2. Mở `chrome://extensions`.
3. Bật **Developer mode**.
4. Chọn **Load unpacked**.
5. Chọn thư mục chứa `manifest.json`.

## Cài trên Microsoft Edge

1. Giải nén file ZIP.
2. Mở `edge://extensions`.
3. Bật **Developer mode**.
4. Chọn **Load unpacked**.
5. Chọn thư mục chứa `manifest.json`.

## Lưu ý

YouTube thường xuyên thay đổi HTML và cơ chế quảng cáo, vì vậy selector có thể cần cập nhật ở các phiên bản sau. Bản v1.0.0 ưu tiên cách làm nhẹ và ít can thiệp: dọn DOM và bấm Skip khi có thể, không cố can thiệp request phát video.

## Kiểm thử

Yêu cầu Node.js 22+:

```bash
node --test
node --check content.js
node --check popup.js
```

## Giấy phép

MIT License.
