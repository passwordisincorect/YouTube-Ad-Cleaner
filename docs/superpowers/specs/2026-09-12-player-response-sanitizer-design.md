# YouTube Ad Cleaner v1.2.0 — Player Response Sanitizer Design

## Goal

Ngăn YouTube player đi vào trạng thái quảng cáo ngay từ đầu bằng cách làm sạch metadata quảng cáo trước khi player tiêu thụ dữ liệu, thay vì đợi quảng cáo xuất hiện rồi skip/tăng tốc.

## Current problem

v1.1.0 chặn một số request quảng cáo ở tầng mạng và xử lý player sau khi class `ad-showing`/`ad-interrupting` xuất hiện. Cách này có thể khiến YouTube vẫn giữ slot quảng cáo nhưng không tải được media quảng cáo, tạo màn hình đen chờ khoảng vài giây. Đồng thời một số companion/sidebar ads và popup YouTube Premium vẫn lọt qua.

## Architecture

v1.2.0 tách thành ba lớp rõ ràng:

1. **MAIN-world player hook** chạy ở `document_start` và sanitize dữ liệu player trước khi YouTube đọc nó.
2. **DOM cleaner** chỉ chịu trách nhiệm dọn quảng cáo giao diện: promoted feed cards, companion/sidebar ads, masthead, overlay promo và Premium promo.
3. **DNR ruleset tối giản** chỉ chặn domain quảng cáo bên ngoài có độ an toàn cao; không chặn endpoint player nội bộ của YouTube và không chặn `googlevideo.com`.

## MAIN-world player hook

Tạo `page-hook.js` chạy với `world: "MAIN"` ở `document_start`.

### Player response sanitizer

Hàm thuần:

```js
sanitizePlayerResponse(value)
```

- Nhận object/array bất kỳ.
- Trả về cùng object sau khi xóa các trường quảng cáo ở mọi cấp lồng nhau.
- Các key cần loại bỏ theo tên chính xác hoặc nhóm tên quảng cáo:
  - `adPlacements`
  - `playerAds`
  - `adSlots`
  - `adBreakParams`
  - `adBreakHeartbeatParams`
  - `adBreakServiceRenderer`
  - `adPlacementRenderer`
  - `linearAdSequenceRenderer`
  - `instreamAdPlayerOverlayRenderer`
  - `instreamVideoAdRenderer`
  - `playerLegacyDesktopWatchAdsRenderer`
  - `playerAdsRenderer`
  - `companionAdRenderer`
  - `promotedSparklesWebRenderer`
- Không xóa dữ liệu video bình thường như `streamingData`, `videoDetails`, `playabilityStatus`, captions hoặc metadata channel.
- Phải chịu được object có cycle bằng `WeakSet`.

### Fetch interception

Monkey-patch `window.fetch` trong MAIN world:

- Chỉ xem xét request URL chứa `/youtubei/v1/player` hoặc `/youtubei/v1/next`.
- Gọi fetch gốc trước.
- Với response JSON tương ứng, clone response, parse JSON, sanitize, rồi tạo `Response` mới với status/statusText/headers cũ.
- Nếu parse lỗi hoặc schema không phù hợp, trả response gốc không sửa.
- Không block request và không tạo lỗi playback.

### XHR interception

Không can thiệp thô vào transport. Chỉ đánh dấu XHR player request để theo dõi; nếu runtime browser không cho ghi đè response an toàn thì bỏ qua thay vì phá request. Fetch là đường chính. Mục tiêu là fail-open, không gây black screen.

### Initial player response

Hook accessor cho `window.ytInitialPlayerResponse` càng sớm càng tốt:

- Khi YouTube assign object, sanitize trước khi lưu.
- Nếu property đã tồn tại trước hook, sanitize ngay giá trị hiện tại.
- Nếu browser không cho redefine property, bỏ qua an toàn.

## Extension enable/disable behavior

`page-hook.js` chạy MAIN world nhưng nhận trạng thái từ `content.js` qua CustomEvent trên `window/document`:

```text
YAC_CONFIG { enabled: boolean }
```

- Mặc định `enabled = true` ở page hook để bảo vệ request sớm.
- `content.js` đọc `chrome.storage.sync.enabled` ngay ở `document_start` và phát event cấu hình.
- Khi người dùng tắt extension, sanitizer dừng sửa response mới; trạng thái trang hiện tại có thể cần reload để khôi phục hoàn toàn các response đã sanitize.

## DOM cleaner

Giữ `content.js` ở isolated world để dùng `chrome.storage`.

Bổ sung selector/logic cho:

- Companion/sidebar ads bên cạnh player.
- Các card có badge/text `Sponsored` hoặc `Được tài trợ` khi nằm trong container quảng cáo YouTube.
- `ytd-companion-slot-renderer` và các renderer companion mới.
- YouTube Premium promo/modal/toast/banner, nhưng không ẩn các dialog không liên quan.
- Khi ẩn feed ad phải ẩn card/grid item cha để không để lại vùng đen/trống.

Loại bỏ hoàn toàn logic:

- click Skip Ad;
- tăng `playbackRate`;
- mute quảng cáo;
- seek `currentTime` đến cuối;
- theo dõi `ad-showing`/`ad-interrupting` để bypass sau khi quảng cáo bắt đầu.

## DNR rules

`rules.json` v1.2.0 chỉ giữ rule cho domain quảng cáo bên ngoài như:

- `doubleclick.net`
- `googlesyndication.com`
- `googleadservices.com`

Xóa các rule chặn endpoint nội bộ YouTube như `/api/stats/ads`, `/get_midroll_info`, `/youtubei/v1/player/ad_break`, `/get_video_info?...adunit`, `/ptracking` nếu chúng có thể làm player chờ slot quảng cáo.

Không bao giờ block `googlevideo.com`.

## Manifest

- Version: `1.2.0`.
- `page-hook.js` là content script MAIN world ở `document_start`.
- `content.js` là content script ISOLATED world ở `document_start`.
- Giữ `storage` và DNR permissions cần thiết.

## Testing

TDD bắt buộc.

Automated tests phải phủ:

1. `sanitizePlayerResponse()` xóa `adPlacements`, `playerAds`, `adSlots` ở root.
2. Sanitizer xóa ad keys ở nested object/array nhưng giữ metadata video.
3. Sanitizer chịu được cyclic object.
4. Helper nhận diện player endpoint đúng, không bắt request video bình thường.
5. DOM cleaner ẩn companion/sidebar ad container.
6. DOM cleaner ẩn Premium promo nhưng không ẩn dialog thường.
7. Không còn code path skip/mute/seek/playbackRate trong runtime production.
8. `rules.json` không còn block endpoint nội bộ player YouTube và không chứa `googlevideo.com`.
9. Manifest có hai script với đúng `world` và `run_at`.

## Failure policy

Fail-open: nếu sanitizer không chắc chắn hoặc gặp schema lạ, trả dữ liệu gốc. Ưu tiên video phát bình thường hơn là chặn quảng cáo bằng cách làm hỏng player.

## Release

Sau khi toàn bộ test pass và syntax/manifest/rules validation pass:

- cập nhật README và CHANGELOG;
- push commit v1.2.0 lên `main`;
- GitHub Actions build ZIP;
- tạo tag/release `v1.2.0`;
- xác nhận release asset tồn tại trước khi báo hoàn tất.
