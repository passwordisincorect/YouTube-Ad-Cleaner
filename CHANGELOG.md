# Changelog

## 1.3.1 - 2026-09-14

- Chính thức hóa cơ chế từ `LOCAL TEST 3`.
- Khôi phục response sanitizer cho `/youtubei/v1/player`, `/youtubei/v1/next`, `/youtubei/v1/get_watch` và `/youtubei/v1/playlist/watch`.
- Với Fetch player response, đọc body một lần và tạo response đã sanitize mà không dùng `Response.clone()`/tee stream.
- Bổ sung sanitize outbound body khi YouTube gọi `fetch()` bằng một `Request` object.
- Giữ request sanitizer của v1.3.0: loại `adSignalsInfo` và thêm `isInlinePlaybackNoAd = true` khi cấu trúc request hỗ trợ.
- Tiếp tục sanitize XHR và `ytInitialPlayerResponse` theo chính sách fail-open.
- Không dùng Skip Ad, mute, seek hoặc tăng `playbackRate`.
- Lưu ý: do Fetch player response vẫn phải được đọc và dựng lại trước khi trả cho YouTube, một số phiên có thể có độ trễ khởi động player cao hơn.

## 1.3.0 - 2026-09-12

- Thêm request sanitizer chạy trước khi Fetch/XHR gửi request player tới YouTube.
- Hỗ trợ `/youtubei/v1/player`, `/youtubei/v1/get_watch` và `/youtubei/v1/playlist/watch`.
- Thêm `isInlinePlaybackNoAd = true` vào `contentPlaybackContext` khi request có cấu trúc tương ứng.
- Loại `adSignalsInfo` khỏi request player trong khi giữ nguyên client identity, video data, auth/attestation, captions và content-check fields.
- Giữ response sanitizer hiện tại làm lớp dự phòng cho `ytInitialPlayerResponse`, Fetch và XHR.
- Tiếp tục fail-open khi request/response không thể xử lý an toàn.
- Không thêm Skip Ad, mute, seek, tăng `playbackRate`, client spoofing hoặc DNR chặn player endpoint.
- Thêm regression test cho outbound Fetch/XHR request bodies.

## 1.2.1 - 2026-09-12

- Sửa trường hợp quảng cáo video vẫn xuất hiện khi YouTube lấy player response qua `XMLHttpRequest` thay vì `fetch`.
- Thêm MAIN-world XHR interception cho `/youtubei/v1/player` và `/youtubei/v1/next`.
- Hỗ trợ cả XHR text/default response và `responseType = "json"`.
- Giữ chính sách fail-open: nếu response không thể sanitize an toàn, trả dữ liệu gốc.
- Không thêm lại Skip Ad, mute, seek hoặc tăng tốc quảng cáo.

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
