# ScopeGraph — Brand Kit v2 (ready to use)

## v2.1 — những gì vừa sửa (27/10)
- Role AI-Agent: vẽ lại thành đầu Scout thật (hood trắng, visor đen, mắt xanh, chỏm lime, ăng-ten lime)
  thay cho mặt robot nhỏ cũ. Observer: mắt đặt trong khung focus lime (đúng nghĩa “scope / quan sát”),
  không còn là mắt trơn. Project Owner: vương miện tô trắng đặc + đế lime, đọc rõ ở size nhỏ.
- Status (10 file): vẽ lại toàn bộ theo 1 bố cục trung tâm — halo nhạt sau motif, graph lớn hơn,
  badge (tick / X / spinner / cảnh báo) gắn liền góc dưới-phải của motif thay vì trôi ở góc card.
- Scout animation frames, ở `scout/frames/` (mỗi frame 1 file SVG + PNG riêng):
  - `blink/` 5 frame: open → half → closed → half → open. Thân đứng yên 100%, chỉ mắt đổi
    (đúng gu idle của Thiên, không giật).
  - `bounce/` 4 frame: hover nhẹ 0 → -6 → -12 → -6px, dùng cho loading / idle phụ.
  - `wave/` 4 frame: chỉ tay phải vẫy sang bên, thân không đổi.
  - Kèm GIF sẵn: `scout-blink.gif` (700/120/180/120/700ms), `scout-bounce.gif`, `scout-wave.gif`,
    và `scout-blink-sprite-sheet.png` (5 frame xếp 1 hàng, mỗi frame 240×240, dùng cho dev/game).
- Các phần còn lại (logo, Scout 7 pose, 404, dashboard) giữ nguyên v2.

## v2.2 — frame animation cho từng trạng thái Scout
Đúng rồi, 7 pose tĩnh ban đầu giờ đều có animation riêng. Default = blink (đã có).
Mỗi trạng thái còn lại có 1 loop 4 frame, mỗi frame 1 file SVG + PNG riêng trong `scout/frames/<pose>/`,
kèm GIF và sprite sheet 4 frame xếp 1 hàng (960×240) ở `scout/frames/scout-<pose>.gif` và
`scout-<pose>-sprite-sheet.png`. Pose giữ nguyên trong mọi frame, chỉ chi tiết đặc trưng của nó chuyển động nhẹ:
- `exploring/` — kính lúp quét sang phải/trái ±8px, mắt nhìn theo (260ms/frame)
- `success/` — badge tick lime phồng lên 1.15× rồi về, thân nhún 0/-4/-8/-4px (220ms/frame)
- `confused/` — dấu ? nhích lên/xuống ±6px, mắt đảo sang trái/phải ±3px (300ms/frame)
- `warning/` — tam giác cảnh báo pulse 1.0 → 1.12 → 1.0 → 0.92× (260ms/frame)
- `sleeping/` — chữ z bay lên 0/-6/-12/-6px, thân thở nhẹ ±1px, mắt luôn nhắm (450ms/frame)
- `celebration/` — thân nhún 0/-6/-12/-6px, confetti rơi xuống 0/6/12/6px (200ms/frame)
Tổng số frame Scout hiện tại: blink 5 + bounce 4 + wave 4 + 6 trạng thái × 4 = 37 frame SVG/PNG,
cộng 9 GIF (blink, bounce, wave + 6 trạng thái) và 7 sprite sheet.

## v2.3 — animation mắt cho mọi trạng thái (fix “nhìn đơ”)
Trước đây mắt của 6 trạng thái gần như đứng yên, chỉ đạo cụ chuyển động. Giờ mắt chuyển động
trong mọi frame, cùng nhịp với đạo cụ, thân vẫn giữ nguyên pose:
- `exploring/` — mắt quét trái → giữa → phải → chớp nửa (mắt theo hướng kính lúp)
- `success/` — mắt cười ^ ^ nhún lên xuống (cung mắt cao/thấp theo nhịp tick)
- `confused/` — mắt đảo trái/phải, 1 mắt to 1 mắt nhỏ luân phiên, frame cuối chớp nửa
- `warning/` — mắt mở to (cảnh giác) → bình thường → nheo lại (squint)
- `sleeping/` — mắt nhắm di chuyển theo nhịp thở, frame 2 mắt phải giật nhẹ (twitch)
- `celebration/` — mắt cười ^ ^ nhún lên xuống theo nhịp nhún thân
File frame, GIF và sprite sheet của 6 trạng thái đã làm lại toàn bộ theo mắt mới.

Bản này thay thế bộ v1 (robot). Nó bám đúng board concept bạn gửi: **logo Concept 1 — Recommended**
và **Scout mới** (trắng, visor đen, mắt xanh dương, chỏm lime), vẽ lại hoàn toàn bằng **SVG thật**,
không phải ảnh AI rời rạc. Vì vậy mọi asset giữ đúng 1 hình học, 1 palette, phóng to không vỡ,
dùng được từ favicon 16px tới slide pitch.

## Palette
- Ink: `#151923` — chữ, sidebar, nền tối
- Warm White: `#F7F8F5` — nền chính
- Electric Lime: `#C7F36B` — node trigger, điểm nhấn, nút chính (dùng tiết chế)
- Graph Blue: `#526BEE` — node, đường ảnh hưởng
- Muted Gray: `#8B929E` — chữ phụ
- Border Gray: `#E4E7E1` — viền card
- Cảnh báo: Amber `#F5A623`, lỗi: Red `#E5484D` (chỉ dùng cho trạng thái, không phải màu brand chính)

## Typography
- Wordmark / UI: Inter, system-ui, sans-serif, weight 800 cho wordmark
- Code / node label / metadata: monospace (trong dashboard mẫu)

## Thư mục
- `logo/` — mark, horizontal, stacked, app icon, favicon, mono dark/light, bản nền tối
  - `scopegraph-mark.svg` — symbol chính, dùng độc lập được
  - `scopegraph-logo-horizontal.svg` — dùng cho header, slide, README repo
  - `scopegraph-logo-stacked.svg` — dùng cho bìa, poster
  - `scopegraph-app-icon.svg` — icon app (nền Ink, bo tròn)
  - `scopegraph-favicon.svg` — mark tối giản, đọc được ở 16×16 / 32×32
  - `scopegraph-mark-mono-dark.svg` / `-mono-light.svg` — in 1 màu, watermark
  - `scopegraph-logo-horizontal-dark.svg` — chữ + bracket trắng, dùng trên nền tối
- `scout/` — cùng 1 cấu trúc, chỉ đổi biểu cảm / đạo cụ
  - `scout-default.svg` — mặc định, onboarding
  - `scout-exploring.svg` — đang soi graph (ống nhòm)
  - `scout-success.svg` — tìm đúng path (tick lime)
  - `scout-confused.svg` — đang điều tra (dấu ?)
  - `scout-warning.svg` — phát hiện impact tiềm ẩn (tam giác !)
  - `scout-sleeping.svg` — empty state / idle (zzz)
  - `scout-celebration.svg` — phân tích xong, ăn mừng
- `roles/` — icon vuông Ink, glyph trắng, phân biệt bằng hình + accent, không chỉ bằng màu
  - developer, ai-agent, reviewer, maintainer, project-owner, tester, observer
  - Dùng ở 24 / 32 / 48px cạnh username, activity log, comment, graph node
- `status/` — mỗi file = 1 trạng thái, nền card Warm White, motif graph lặp lại
  - empty-graph, no-impact, analysis-progress, potentially-affected,
    missing-references, analysis-completed, disconnected-repo,
    agent-working, agent-awaiting-review, integration-failure
- `illustrations/`
  - `scopegraph-404-illustration.svg` — Scout confused + đường graph đứt tới node ? đỏ.
    Illustration riêng, không kèm headline, để bạn tự đặt text/button theo layout.
  - `scopegraph-dashboard.svg` — dashboard mẫu: sidebar, summary 2/1/0,
    dependency graph (api-service là node lime trung tâm), AI Agent panel, affected components
- `png/` — bản render PNG của toàn bộ SVG trên (nền Warm White, trừ bản dark/app-icon),
  dùng ngay cho slide, Google Docs, nơi không nhận SVG
- `404-page.html` — trang 404 mẫu, dùng illustration + headline trong brief
- `build_kit.py` — script sinh toàn bộ SVG. Sửa 1 chỗ (màu, hình Scout, logo) rồi chạy lại là cả bộ đổi theo.
- `preview-contact-sheet.png` — ảnh tổng quan để xem nhanh cả bộ

## Cách dùng nhanh cho hackathon
- README repo / slide bìa: `logo/scopegraph-logo-horizontal.svg` (hoặc PNG tương ứng)
- Favicon: `logo/scopegraph-favicon.svg`
- App / avatar: `logo/scopegraph-app-icon.svg`
- Dashboard đang phân tích: `scout/scout-exploring.svg` + `status/status-analysis-progress.svg`
- Phân tích xong: `scout/scout-success.svg` / `scout/scout-celebration.svg`
- Không tìm thấy / lỗi: `illustrations/scopegraph-404-illustration.svg` hoặc `404-page.html`
- Đừng stretch, đừng đổi màu lime/blue, đừng vẽ thêm gradient / 3D bóng — bộ này cố tình flat, 1px–5px stroke, giống Linear / Raycast.

## Lưu ý về v1
Bộ v1 ở `../scopegraph-brand/` dùng Scout robot cũ (tai lime, ăng-ten) — không dùng chung với v2,
vì 2 Scout khác nhau sẽ làm brand loạn. Nếu cần, mình có thể xóa / archive v1 sau khi bạn chốt v2.
