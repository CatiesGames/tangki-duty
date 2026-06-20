/**
 * 神明技能 — 每位神明：1 個被動 + 3 個小招 + 1 個大招（ult）。
 *
 * passive：每班自動生效（影響 economy 乘數 / 規則）。
 * actives：值班中可手動施放的技能列；前 3 個是小招、最後 1 個是大招（ult:true）。
 *   每個技能各有 uses（每班次數）。效果 kind 由 main.js 的 castSkill 解讀。
 *
 * kind 對照（main.js）：
 *   nextAnswerMult  下一筆香火 ×value
 *   nextCrit        下一筆必爆擊（×value）
 *   refundStamina   立刻回復 value 點元神
 *   calm            下一題滿意度不會掉（穩住）
 *   halfOverhead    本班廟務開銷減半
 *   shield          本班不被鬧場/掉粉
 *   shiftMult       本班結算香火 ×value（大招常見）
 *   drunk           下一題三選項都高香火（元神狂掉）
 *   comboLock       本班 combo 不會因任何事中斷（維持連段）
 *   repNext         下一筆名聲收益 ×value
 *   allInNext       下一筆香火 ×value 但元神 -value2（高風險大招）
 */

const small = (o) => ({ tier: 'small', uses: 1, ...o });
const ult = (o) => ({ tier: 'ult', ult: true, uses: 1, ...o });

/* 狼牙棒 icon（SVG）：黑色棒身 + 整排尖刺的釘錘，斜放，參考實體狼牙棒。emoji 沒有合適的，所以自繪。 */
const MACE_ICON = `<svg class="ico-svg" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="maceShaft" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a4a52"/><stop offset="1" stop-color="#1c1c22"/></linearGradient>
    <linearGradient id="maceHead" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#55555f"/><stop offset="1" stop-color="#222229"/></linearGradient>
  </defs>
  <g transform="rotate(38 16 16)">
    <!-- 握把 -->
    <rect x="14.4" y="20.5" width="3.2" height="8.5" rx="1.4" fill="url(#maceShaft)" stroke="#000" stroke-width="0.5"/>
    <ellipse cx="16" cy="29.2" rx="2.4" ry="1.1" fill="#15151a"/>
    <!-- 棒身（帶尖刺的釘錘） -->
    <rect x="12" y="5" width="8" height="16" rx="3.4" fill="url(#maceHead)" stroke="#000" stroke-width="0.6"/>
    <!-- 左右兩排尖刺 -->
    <g fill="#2a2a31" stroke="#000" stroke-width="0.4">
      <path d="M12 7 L8.5 8 L12 9.4 Z"/><path d="M12 11 L8 12 L12 13.4 Z"/><path d="M12 15 L8.5 16 L12 17.4 Z"/>
      <path d="M20 7 L23.5 8 L20 9.4 Z"/><path d="M20 11 L24 12 L20 13.4 Z"/><path d="M20 15 L23.5 16 L20 17.4 Z"/>
    </g>
    <!-- 頂端尖刺 -->
    <path d="M14 5 L16 1.5 L18 5 Z" fill="#2a2a31" stroke="#000" stroke-width="0.4"/>
    <!-- 中排小釘 -->
    <g fill="#1a1a20"><circle cx="16" cy="8.5" r="1.1"/><circle cx="16" cy="12.5" r="1.1"/><circle cx="16" cy="16.5" r="1.1"/></g>
    <!-- 高光 -->
    <rect x="13" y="6" width="1.6" height="13" rx="0.8" fill="rgba(255,255,255,.14)"/>
  </g>
</svg>`;

export const SKILLS = {
  santaizi: {
    passive: { name: '陣頭氣盛', desc: '連段(combo)累積速度 +50%，衝倍率最快。', comboRate: 1.5 },
    actives: [
      small({ name: '小爆擊', icon: '🥁', desc: '下一筆香火 ×2。', kind: 'nextAnswerMult', value: 2 }),
      small({ name: '定神', icon: '🧘', desc: '下一題滿意度不會掉。', kind: 'calm' }),
      small({ name: '續氣', icon: '⚡', desc: '立刻回復 25 點元神。', kind: 'refundStamina', value: 25 }),
      ult({ name: '狼牙棒・神威', icon: MACE_ICON, desc: '【大招】下一筆香火直接 ×6！', kind: 'nextAnswerMult', value: 6 }),
    ],
  },
  guan: {
    passive: { name: '正氣凜然', desc: '名聲成長 +50%、滿意度較不易掉。', repGain: 1.5, faithDecay: 0.6 },
    actives: [
      small({ name: '鎮場', icon: '🛡️', desc: '下一題滿意度不會掉。', kind: 'calm' }),
      small({ name: '揚名', icon: '📣', desc: '本班名聲 +3。', kind: 'repNext', value: 3 }),
      small({ name: '凝神', icon: '⚡', desc: '立刻回復 25 點元神。', kind: 'refundStamina', value: 25 }),
      ult({ name: '義薄雲天', icon: '⚔️', desc: '【大招】本班廟務開銷減半。', kind: 'halfOverhead' }),
    ],
  },
  mazu: {
    passive: { name: '慈航護佑', desc: '元神消耗減半，可多答好幾位信眾。', staminaDrain: 0.5 },
    actives: [
      small({ name: '安神', icon: '🕯️', desc: '下一題滿意度不會掉。', kind: 'calm' }),
      small({ name: '回元', icon: '⚡', desc: '立刻回復 35 點元神。', kind: 'refundStamina', value: 35 }),
      small({ name: '穩浪', icon: '🪢', desc: '本班 combo 不再因任何事中斷。', kind: 'comboLock' }),
      ult({ name: '聖母庇佑', icon: '🌊', desc: '【大招】本班不會被鬧場、不掉粉。', kind: 'shield' }),
    ],
  },
  jigong: {
    passive: { name: '醉中乾坤', desc: '香火高方差：每筆有機率暴擊 ×5（也可能很少）。', variance: true, critChance: 0.18, critMult: 5 },
    actives: [
      small({ name: '小醉', icon: '🍶', desc: '下一題三個選項香火全變高（元神狂掉）。', kind: 'drunk' }),
      small({ name: '靈光', icon: '🎯', desc: '下一筆必定暴擊 ×5。', kind: 'nextCrit', value: 5 }),
      small({ name: '裝瘋', icon: '🤪', desc: '下一題滿意度不會掉。', kind: 'calm' }),
      ult({ name: '醉打乾坤', icon: '🍷', desc: '【大招】下一筆香火 ×8，但元神 -40。', kind: 'allInNext', value: 8, value2: 40 }),
    ],
  },
  wangye: {
    passive: { name: '開壇斂財', desc: '香火 +25%，但滿意度更難拉。', incenseMult: 1.25, faithPenalty: 0.7 },
    actives: [
      small({ name: '催香', icon: '🔥', desc: '下一筆香火 ×2.5。', kind: 'nextAnswerMult', value: 2.5 }),
      small({ name: '安撫', icon: '🧧', desc: '下一題滿意度不會掉。', kind: 'calm' }),
      small({ name: '提氣', icon: '⚡', desc: '立刻回復 25 點元神。', kind: 'refundStamina', value: 25 }),
      ult({ name: '開壇大法', icon: '📜', desc: '【大招】本班結算香火直接 ×2。', kind: 'shiftMult', value: 2 }),
    ],
  },
};

export function skillOf(godId) { return SKILLS[godId] || SKILLS.santaizi; }
export function passiveOf(godId) { return skillOf(godId).passive; }
/* 回傳該神明的主動技列（3 小招 + 1 大招） */
export function activesOf(godId) { return skillOf(godId).actives; }
/* 相容舊呼叫：回大招當代表 */
export function activeOf(godId) { return skillOf(godId).actives.find((a) => a.ult) || skillOf(godId).actives[0]; }
