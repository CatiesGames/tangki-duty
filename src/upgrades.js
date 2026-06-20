/**
 * 廟務經營升級 — 用香火買的「永久乘數」，可疊加 → 收入指數成長的引擎。
 * 沒有掛機/離線收入（依使用者要求），但升級會放大每一班的主動收入。
 */

import { getSave, persist, spendCash } from './store.js';

/* 每項升級：等級上限、價格曲線、每級效果說明。
   price(level) = base * growth^level → 越買越貴，但效果相乘故會回本。 */
export const UPGRADES = [
  {
    id: 'incense', name: '擴建香爐', icon: '🔥', max: 8,
    desc: '香爐越大，每筆香火基礎收入越高。',
    base: 3000, growth: 1.9,
    perLevel: 0.18, // 每級 香火 +18%
    effect: (lv) => `香火收入 +${lv * 18}%`,
  },
  {
    id: 'marketing', name: '行銷小編', icon: '📱', max: 8,
    desc: '請小編炒聲量，名聲漲更快，滾雪球更猛。',
    base: 4000, growth: 1.95,
    perLevel: 0.15, // 每級 rep 增益 +15%
    effect: (lv) => `名聲成長 +${lv * 15}%`,
  },
  {
    id: 'branches', name: '分壇加盟', icon: '🏯', max: 5,
    desc: '開分壇，每班來的信眾上限提高（更多人＝更多香火）。',
    base: 20000, growth: 2.3,
    perLevel: 2, // 每間 +2 人上限
    effect: (lv) => `信眾上限 +${lv * 2} 人`,
  },
  {
    id: 'vip', name: 'VIP 包廂', icon: '💎', max: 5,
    desc: '富貴信眾專屬包廂，高香火信眾出現率提升。',
    base: 30000, growth: 2.2,
    perLevel: 0.2, // 每級 香火暴擊率 +20%
    effect: (lv) => `闊綽信眾機率 +${lv * 20}%`,
  },
  {
    id: 'staff', name: '法師團隊', icon: '🧑‍🦲', max: 6,
    desc: '養一團法師輪流頂著，元神更耐操，一班能多答幾位。',
    base: 12000, growth: 2.0,
    perLevel: 6, // 每級 元神上限/耐久 +6
    effect: (lv) => `元神耐久 +${lv * 6}`,
  },
  {
    id: 'comboCap', name: '心流修行', icon: '🌀', max: 6,
    desc: '修行心流，連段(combo)倍率上限拉高，好好答報酬爆炸。',
    base: 15000, growth: 2.1,
    perLevel: 0.5, // 每級 combo 每段倍率 +0.05、上限 +0.5
    effect: (lv) => `連段倍率上限 +${(lv * 0.5).toFixed(1)}`,
  },
];

export const UP_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

export function priceOf(u, level) {
  return Math.round(u.base * (u.growth ** level));
}

/* 目前各乘數（給 economy 用） */
export function multipliers() {
  const up = getSave().upgrades || {};
  return {
    incenseMult: 1 + (up.incense || 0) * UP_BY_ID.incense.perLevel,
    repGain: 1 + (up.marketing || 0) * UP_BY_ID.marketing.perLevel,
    crowdBonus: (up.branches || 0) * UP_BY_ID.branches.perLevel,
    vipChance: (up.vip || 0) * UP_BY_ID.vip.perLevel,
    staminaBonus: (up.staff || 0) * UP_BY_ID.staff.perLevel,
    comboCapBonus: (up.comboCap || 0) * UP_BY_ID.comboCap.perLevel,
  };
}

/* 嘗試升一級：成功扣香火、回 true */
export function buyUpgrade(id) {
  const u = UP_BY_ID[id];
  const save = getSave();
  const lv = save.upgrades[id] || 0;
  if (lv >= u.max) return { ok: false, reason: 'max' };
  const price = priceOf(u, lv);
  if (!spendCash(price)) return { ok: false, reason: 'cash', price };
  save.upgrades[id] = lv + 1;
  persist();
  return { ok: true, level: lv + 1, price };
}

/* 列出升級狀態（給 UI） */
export function upgradeList() {
  const up = getSave().upgrades || {};
  return UPGRADES.map((u) => {
    const lv = up[u.id] || 0;
    return {
      ...u, level: lv, maxed: lv >= u.max,
      nextPrice: lv >= u.max ? null : priceOf(u, lv),
      curEffect: lv > 0 ? u.effect(lv) : '尚未投資',
      nextEffect: lv >= u.max ? '已滿級' : u.effect(lv + 1),
    };
  });
}
