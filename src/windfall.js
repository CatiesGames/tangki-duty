/**
 * 香火爆發鏈 — 讓「事件 × 策略 × 時機」疊乘出超高倍率。
 *
 * 設計（與使用者確認）：
 *  · 平常起乩一班 ~12 萬是合理基礎，不動。
 *  · 大額事件（富信眾最終好結局回饋、巨額機會）金額隨「名聲 × 身價」縮放，後期不再無感。
 *  · 真正的爆發＝把大額事件金額，再乘上你當下湊齊的乘數鏈（combo × 神技 × VIP × 名聲大方度）。
 *  · 一班一億＝極難奇蹟：要頂級富信眾好結局 + 滿 combo + 大招待命 + 名聲滿 + VIP 滿，全部完美結合。
 *    任何一項沒湊到就掉一個數量級 → 「神來之筆」的高潮感。
 */

import { generosity } from './economy.js';

/* 身價基準：隨名聲與「累積戰果」成長（log 收斂，避免爆走）。回傳倍率(>=1)。
   標定：rep5 新手 ≈ ×1；rep100＋滿收藏＋賺破億 ≈ ×9 上限。 */
export function networthMult(save) {
  const rep = save.rep || 0;
  const repPart = 1 + (rep / 100) * 2.0; // rep0→1、rep100→3
  const owned = save.owned || [];
  const luxe = owned.filter((id) => /^(car-(porsche|ferrari|bugatti)|watch-(ap|pp|rm)|wine-(lafite-82|macallan-fine|romanee)|jewelry-(diamond-ring|starry-watch|pigeon-ruby)|mansion-(villa|dibao|palm-island))$/.test(id)).length;
  const luxePart = 1 + Math.min(1, luxe * 0.12); // 頂級收藏總共最多 +100% 身價
  const inc = save.stats?.lifetimeIncome || 0;
  const incPart = 1 + Math.min(1.5, Math.log10(Math.max(1, inc / 1e5)) * 0.4); // 賺越多最多 +150%
  return repPart * luxePart * incPart; // 約 1 ~ 3×2×2.5 = 15 上限，實務多落在 1~9
}

/* 富信眾身價權重：高 repReq 的權貴回饋更猛（溫和指數，避免疊乘後爆掉）。 */
export function tycoonWeight(repReq = 0) {
  const table = { 0: 1, 15: 1.5, 30: 2.2, 45: 3.2, 60: 4.6, 75: 6.5 };
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  let w = 1;
  for (const k of keys) if (repReq >= k) w = table[k];
  return w;
}

/* 富信眾「最終好結局」謝神巨獻的基礎金額（還沒乘戰鬥倍率鏈）。
   標定：中期市議員 base ~數十萬；頂期總裁 base ~數百萬。乘上滿鏈(≈×30)才接近一億。 */
export function tycoonReward(save, repReq) {
  const BASE = 5000;
  return Math.round(BASE * networthMult(save) * tycoonWeight(repReq));
}

/* 機會命運大獎的縮放：把「設計時寫的小額」放大到符合當前身價。 */
export function scaleChance(save, baseAmount) {
  // 機會金額用較溫和的縮放（不像富信眾結局那麼猛），避免每場機會都太肥
  const m = 1 + (networthMult(save) - 1) * 0.55;
  return Math.round(baseAmount * m);
}

/**
 * 戰鬥倍率鏈：把一筆大額事件金額，乘上玩家「當下湊齊」的所有乘數。
 * ctx: { comboMult, godMult(神技 nextMult/shiftMult), vipHit(bool), rep }
 * 回傳 { amount, parts } — parts 供結算逐項顯示「靠什麼乘上去的」。
 */
export function applyPayoutChain(baseAmount, ctx = {}) {
  const { comboMult = 1, godMult = 1, vipHit = false, rep = 0 } = ctx;
  const gen = generosity(rep); // 名聲大方度 1~3
  const vipMult = vipHit ? 2 : 1;
  const total = baseAmount * comboMult * godMult * gen * vipMult;
  const parts = [];
  if (comboMult > 1.05) parts.push(`連段×${comboMult.toFixed(1)}`);
  if (godMult > 1.05) parts.push(`神技×${godMult.toFixed(1)}`);
  if (gen > 1.05) parts.push(`身價×${gen.toFixed(1)}`);
  if (vipHit) parts.push('VIP×2');
  return { amount: Math.round(total), parts };
}
