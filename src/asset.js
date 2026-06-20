/**
 * 資源路徑解析：把以「/」開頭的 public 資源路徑，接上 Vite 的 base（BASE_URL）。
 * 本地 dev base='/' → 不變；GitHub Pages project page base='/tangki-duty/' → 自動加前綴。
 * 已是 http(s):// 或 data: 或相對路徑的就原樣回傳。
 */
const BASE = import.meta.env.BASE_URL || '/';

export function asset(p) {
  if (!p) return p;
  if (/^(https?:|data:|blob:)/.test(p)) return p; // 外部/內嵌資源不動
  if (p[0] === '/') return BASE.replace(/\/$/, '') + p; // /casino/x.png → /tangki-duty/casino/x.png
  return p; // 相對路徑原樣
}
