# 乩身值班系統

起乩流程體驗小應用。讓使用者親自走一遍「降駕前準備 → 請神 → 執務 → 退駕」的 SOP。

## 開發

```bash
npm install
npm run dev
```

預設開在 http://localhost:5188

## 建置

```bash
npm run build
npm run preview
```

靜態檔輸出至 `dist/`，可部署至任何靜態主機。

## 操作說明

| 階段 | 操作 |
|------|------|
| 選神 | 三太子 / 關聖 / 媽祖 / 濟公 / 王爺 — 各自 SOP 不同 |
| 準備 | 依神明動態清單（檳榔、跳七步、敬香…） |
| 請神 | 依神明儀式（狼牙棒 / 參拜 / 點香 / 拍頭 / 擲筊）後長按搖晃 |
| 退駕 | 畫面縮回、閃光、「元神退駕中」後結算 |
| 執務 | 從三則神諭中擇一回覆 |
| 退駕 | 複製結算報告或再玩一次 |

## 專案結構

```
tangki-duty/
├── index.html          # 進入點（沉浸式 HUD、無滾動軸）
├── src/
│   ├── main.js         # 流程與互動
│   ├── content.js      # 組合式文案引擎（問句／神諭）
│   ├── believers.js    # 信眾生成（archetype 多圖、加權，補圖即生效）
│   ├── gods.js         # 五位神明 SOP / fxKind / 回答風格
│   ├── godfx.js        # 每神明專屬起駕 canvas 特效引擎
│   ├── blood.js        # 狼牙棒全版流血（累積、漸強、不消失）
│   ├── assets.js       # 背景、粒子、信眾浮卡、主題色
│   └── styles.css      # 樣式（沉浸儀表板、RWD、降駕次元轉場）
└── vite.config.js
```

### 擴充

- **補信眾圖**：丟進 `public/believers/`（命名 `<archetype>-N.jpg`），在 `src/believers.js` 對應 archetype 的 `imgs` 陣列加一行檔名即可。
- **加新神明**：在 `src/gods.js` 新增物件（含 `fxKind`／`auraColor`／`prep`／`ritual`／`invoke`／`replyFlavor`）。

## 技術

- Vite + 原生 JS（零 AI、零後端）
- 文案由詞庫組合生成，避免固定模板感
- 寫實台灣信眾圖（正妹、8+9、鄉親、阿公…）+ 廟宇背景圖（Imagine 生成）
- 五位神明獨立降駕 SOP（`src/gods.js`）
- 信眾講白話（含不正經／來打卡的）；神諭維持文言