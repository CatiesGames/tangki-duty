# 待生圖清單（只列「還沒生的 / 要重生的」）

> 生好存到指定路徑即自動載入；缺圖會以 emoji/漸層 fallback，不會破版。
> 最後更新：轉盤改程式自繪+emoji、黑骰問天骰子改 SVG（都不生圖）。老虎機改用 6 張獨立正方置中圖 `slot/sym-0..5.png`（已從舊 strip 切好、停下保證置中）。賭場圖已全部就緒，可選擇重生升級畫風。
> 乩der 新增清純系角色與拆開撞圖的頭像仍待生。

## 風格基準
photorealistic, natural light, film grain, **no text in image, no watermark**。

---

## 一、乩der 角色頭像（5 張） — 路徑 `public/dating/`，直式 3:4

> 卡片大頭照。⚠️ 之前薇薇安/雅雯與別人共用同一張圖（撞圖），現拆開各自獨立；另新增 3 位「清純幼態系」。
> 共通：photorealistic 3:4 portrait, single Taiwanese person, dating-app profile vibe, no text。

| 對象 | 檔名 | 存放路徑 | 生圖提示詞 |
|---|---|---|---|
| 薇薇安（議員特助 35，幹練政商） | `date-vivian.jpg` | `public/dating/date-vivian.jpg` | elegant sharp Taiwanese woman ~35, political-aide vibe, tailored blazer, refined makeup, confident shrewd gaze, upscale office / banquet background, mature competent aura |
| 雅雯（財團千金 31，低調貴氣） | `date-arwen.jpg` | `public/dating/date-arwen.jpg` | understated ultra-wealthy Taiwanese heiress ~31, quiet luxury (no loud logos), serene slightly lonely elegance, soft expensive knit, blurred mountain-villa interior, refined |
| 小米歐（清純大一生 19） | `date-mio.jpg` | `public/dating/date-mio.jpg` | fresh innocent Taiwanese college freshman girl ~19, **youthful K-idol baby-face look**, minimal natural makeup, oversized soft sweater, bubble tea in hand, sweet shy smile, campus / cafe background, looks like a sweet high-schooler |
| YUNA（韓團練習生 18） | `date-yuna.jpg` | `public/dating/date-yuna.jpg` | Taiwanese K-pop trainee girl ~18, **trendy youthful idol styling**, baby-face aegyo look, light idol makeup, crop-top + designer-ish outfit, dance-studio / neon city background, camera-ready cute-sexy but age-appropriate |
| 林思涵（高三鄰家妹 17） | `date-shian.jpg` | `public/dating/date-shian.jpg` | wholesome girl-next-door Taiwanese high-school senior ~17, **very youthful innocent face**, school uniform or casual hoodie, holding milk tea, gentle tired-but-cute smile, classroom / convenience-store background, pure and approachable |

> ⭐ 整體方向：使用者希望**多一點清純、幼態感**（韓團那種看起來像高中生的長相），別都太成熟老氣。新角色都往這個方向。

---

## 二、乩der 自拍照（每人 3 張・共 42 張） — 路徑 `public/dating/`，直式 3:4

> 聊天中對方會不時「傳自拍」（曖昧期、好結局、交往後日常、黏人逆襲）。程式輪替使用同一人的多張。
>
> ⭐⭐ **最重要：每張自拍必須是「同一個人」** —— 五官/髮型/膚色/氣質要和該角色的「頭像基準圖」一致（同一人物、不同場景姿勢服裝），**絕不要變成另一個人**。生圖請以頭像為參考臉。
>
> ⭐ **尺度越後面越大膽**（編號 1→3 性感度遞增；清純系角色 3 張都維持清純可愛、最多到「俏皮小性感」不過火）：
> - **-1 初階**：日常、可愛、生活自拍。**-2 中階**：稍微撩、好身材、貼身小露。**-3 大膽**：性感誘惑感最強（泳裝/睡衣等，平台可接受不裸露）。
>
> 風格＝真實手機自拍感；檔名＝`selfie-<id>-<1|2|3>.jpg`；缺圖顯示「📷 傳了一張自拍」泡泡 fallback。

| 對象 | 頭像基準 | 3 張方向 | 檔名 |
|---|---|---|---|
| Yuki | `date-girl-1` | 夜店辣妹；1 包廂舉杯／2 貼身洋裝撩髮／3 微醺睡衣 | `selfie-t-yuki-1/2/3.jpg` |
| 安妮 | `date-girl-2` | 微網紅；1 咖啡廳精修／2 穿搭小露腰／3 浴袍泳池 | `selfie-t-anny-1/2/3.jpg` |
| 凜 | `date-girl-4` | Coser；1 cos 服俏皮／2 換裝半成品／3 暴露度高角色服 | `selfie-t-rin-1/2/3.jpg` |
| Tina | `date-girl-3` | 空姐；1 制服機艙／2 飯店浴袍／3 海島泳裝 | `selfie-t-tina-1/2/3.jpg` |
| Hana | `date-girl-5` | 日系藥師；1 素顏生活／2 居家露肩／3 浴後濕髮 | `selfie-t-hana-1/2/3.jpg` |
| Kevin（男） | `date-guy-2` | 健身教練；1 健身房／2 脫上衣秀腹肌／3 浴室濕身肌肉 | `selfie-t-kevin-1/2/3.jpg` |
| Leo（男） | `date-guy-1` | 新創 CEO；1 西裝商務／2 解襯衫放鬆／3 泳池邊半裸臂膀 | `selfie-t-leo-1/2/3.jpg` |
| Coco 姐 | `date-girl-7` | 離婚貴婦；1 名牌下午茶／2 低胸晚禮服／3 絲質睡袍 | `selfie-t-coco-1/2/3.jpg` |
| Céline | `date-girl-6` | 珠寶千金；1 戴珠寶冷豔／2 露背禮服／3 浴缸珠寶 | `selfie-t-celine-1/2/3.jpg` |
| 薇薇安 | `date-vivian` | 議員特助；1 套裝辦公／2 解開西裝小性感／3 飯店微醺 | `selfie-t-vivian-1/2/3.jpg` |
| 雅雯 | `date-arwen` | 財團千金；1 豪宅生活／2 泳池邊比基尼／3 遊艇大膽 | `selfie-t-arwen-1/2/3.jpg` |
| 小米歐 | `date-mio` | 清純大一；1 校園奶茶自拍／2 居家寬鬆毛衣俏皮／3 浴後可愛（仍清純不過火） | `selfie-t-mio-1/2/3.jpg` |
| YUNA | `date-yuna` | 韓團練習生；1 練舞室自拍／2 舞台妝俏皮／3 偶像感小性感（年齡得體） | `selfie-t-yuna-1/2/3.jpg` |
| 林思涵 | `date-shian` | 高三鄰家妹；1 制服自拍／2 居家衛衣抱娃娃／3 微微長大的可愛（保持純） | `selfie-t-shian-1/2/3.jpg` |

---

## 三、奇乩娛樂城・賭具圖

### 3-1 老虎機符號 — ✅ 改成 6 張獨立正方置中圖（已從舊 strip 切好處理）

> 舊的 `slot-strip.png`（單條 6 格）符號在格內位置不一、被拉長，停下會切到兩符號中間。
> 已把它**切成 6 張獨立圖**（`public/casino/slot/sym-0..5.png`，各 256×256、物品去黑邊後等比縮放至 ~86%、**正方置中**），程式改用這 6 張 → 每輪停下**保證符號在正中央**。
> 順序＝ sym-0 財神 / sym-1 金元寶 / sym-2 香爐 / sym-3 紅包 / sym-4 金錢龜 / sym-5 金7。
> 想升級畫風的話，重生這 6 張即可（規格：各 256×256 正方、物品置中佔 ~85%、黑底、同一風格），丟回原路徑自動替換。

### 3-2 發財法會轉盤 — ✅ 改用程式自繪 + emoji，不生圖（已移除 wheel-face.png）

- 轉盤用 CSS conic 8 扇區 + emoji 圖示自繪，順序＝`WHEEL_SEGS`。**不需要任何圖**。

### 3-3 黑骰問天・骰子 — ✅ 改用 SVG 程式繪製，不生圖（也不用骰盅）

- 六面骰子全用 SVG 立體繪製（清楚正面點數 + 金邊 + 立體斜邊），**不需要任何圖**，也拿掉了骰盅（三顆骰直接擺出、搖動後定格）。

---

## 小計（待生）
- 乩der 頭像 **5 張**（薇薇安、雅雯拆開撞圖 + 清純系 小米歐/YUNA/林思涵）。
- 乩der 自拍 **42 張**（14 角色 × 3，性感度遞增、臉要跟頭像一致）。
- 賭場：**無強制待生**。老虎機 6 張 `slot/sym-0..5.png` 已就緒（可選重生升級畫風、規格各 256×256 正方置中）。

## ✅ 已備齊（真圖，不用動）
- 商品 31、神明 5、回訪事件 6、town-map、背景圖、信眾 34。
- 賭場場景：`casino-hall`、`scene-fortune`、`scene-jiao`、`scene-slot`、`scene-vip`。
- 賭場零件：老虎機 `slot/sym-0..5.png`（6 符號正方置中）、`jiao-yang.png`／`jiao-yin.png`（聖筊陽/陰）。轉盤＝程式自繪、骰子＝SVG（皆不需圖）。
- 乩der 既有頭像：`date-girl-1/2/4/5/6/7`、`date-guy-1/2`（Tina 仍用 date-girl-3）。

---
※ 檔名完全照抄（含連字號）。selfie 性感度 1→3 遞增；清純系（mio/yuna/shian）即使到 -3 也要維持清純可愛、年齡得體。
