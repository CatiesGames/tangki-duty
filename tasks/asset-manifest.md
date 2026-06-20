# 待生圖清單（只列「還沒生 / 要重生」的圖）

> 生好後存到指定路徑即自動載入；缺圖會以 emoji／漸層 fallback，不會破版。
> **所有圖統一用 `.webp`**（全專案已從 jpg/png 轉成 webp，省 ~70% 體積、畫質無損）。
> 生圖工具若只能輸出 jpg/png，丟到 `raw-assets/` 後用 `cwebp -q 82 -m 6 來源 -o public/<路徑>.webp` 轉一下即可。

## 風格基準
photorealistic, natural light, film grain, **no text in image, no watermark**，直式 3:4。

---

## 🔴 優先：要「重生」的圖

| 項目 | 檔名 | 問題 | 生圖提示詞 |
|---|---|---|---|
| 小米歐 自拍-3 | `public/dating/selfie-t-mio-3.webp` | **舊圖是幼兒/小寶寶，已移除**，暫用 mio-2 頂著。需生一張「同一位大一生本人」的居家可愛自拍 | same Taiwanese **college freshman ~19** as `selfie-t-mio-1/2`（同一張臉、同髮型膚色），cozy dorm after-shower selfie, oversized white sweater, towel-dried hair, sweet playful smile, **adult young woman, age-appropriate, 不性感不過火**, phone-selfie look |

> ⚠️ 鐵則：小米歐／YUNA／林思涵等「清純系」角色一律要是**成年年輕女性的長相**，五官與該角色頭像一致；**絕不可出現孩童**。

---

## 一、乩der 角色頭像（待生 5 張） — `public/dating/`，直式 3:4

> 卡片大頭照。薇薇安/雅雯原本和別人撞圖，需各自獨立；另補 3 位「清純幼態系」。
> 共通：photorealistic 3:4 portrait, single Taiwanese **adult**, dating-app profile vibe, no text。

| 對象 | 檔名 | 生圖提示詞 |
|---|---|---|
| 薇薇安（議員特助 35） | `date-vivian.webp` | elegant sharp Taiwanese woman ~35, political-aide vibe, tailored blazer, refined makeup, confident shrewd gaze, upscale office/banquet background |
| 雅雯（財團千金 31） | `date-arwen.webp` | understated ultra-wealthy Taiwanese heiress ~31, quiet luxury (no loud logos), serene slightly lonely elegance, soft expensive knit, blurred mountain-villa interior |
| 小米歐（清純大一 19） | `date-mio.webp` | fresh innocent Taiwanese **college freshman ~19**, youthful K-idol baby-face but clearly adult, minimal natural makeup, oversized sweater, bubble tea, sweet shy smile, campus/cafe background |
| YUNA（韓團練習生 18） | `date-yuna.webp` | Taiwanese K-pop trainee **young woman ~18**, trendy idol styling, light idol makeup, crop-top + designer outfit, dance-studio/neon background, cute, age-appropriate |
| 林思涵（鄰家妹 17→以大學生呈現） | `date-shian.webp` | wholesome girl-next-door Taiwanese **young woman**, very youthful innocent face but adult, casual hoodie, holding milk tea, gentle cute smile, convenience-store background |

---

## 二、乩der 自拍照（待生：每人 3 張，臉要跟頭像同一人）— `public/dating/`

> 聊天中對方會「傳自拍」（曖昧→好結局→交往日常）。程式輪替同一人的多張，檔名 `selfie-<id>-<1|2|3>.webp`。
> ⭐⭐ **每張必須是「同一個人」**：五官/髮型/膚色/氣質與該角色頭像一致（不同場景姿勢服裝），絕不換臉。
> ⭐ 尺度 1→3 遞增（-1 日常可愛 / -2 貼身小露 / -3 性感不裸露）；**清純系（mio/yuna/shian）三張都維持清純可愛、年齡得體、成年人。**

| 對象 | 頭像基準 | 3 張方向 | 檔名 |
|---|---|---|---|
| 薇薇安 | `date-vivian` | 議員特助；1 套裝辦公／2 解開西裝小性感／3 飯店微醺 | `selfie-t-vivian-1/2/3.webp` |
| 雅雯 | `date-arwen` | 財團千金；1 豪宅生活／2 泳池比基尼／3 遊艇大膽 | `selfie-t-arwen-1/2/3.webp` |
| YUNA | `date-yuna` | 韓團練習生；1 練舞室／2 舞台妝俏皮／3 偶像感小性感（得體） | `selfie-t-yuna-1/2/3.webp` |
| 林思涵 | `date-shian` | 鄰家妹；1 日常自拍／2 居家衛衣／3 微長大可愛（保持純） | `selfie-t-shian-1/2/3.webp` |

> 其餘角色（Yuki/安妮/凜/Tina/Hana/Kevin/Leo/Coco/Céline/小米歐）3 張自拍**皆已備齊**。

---

## ✅ 已就緒（不用生）

- **賭場全部不缺圖**：場景 `casino-hall / scene-fortune / scene-jiao / scene-slot / scene-vip`；老虎機 6 符號 `slot/sym-0..5.webp`（256×256 正方置中）；聖筊 `jiao-yang / jiao-yin`。轉盤＝CSS 自繪+emoji、骰子＝SVG（皆不需圖）。
- 商品 31、神明 5、回訪事件 6、town-map、背景、信眾 34 皆為真圖。
- 乩der 既有頭像：`date-girl-1/2/3/4/5/6/7`、`date-guy-1/2`、`date-mio`。

---
※ 檔名完全照抄（含連字號、`.webp` 副檔名）。清純系角色一律成年人長相，嚴禁孩童。
