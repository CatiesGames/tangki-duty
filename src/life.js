/**
 * 信眾人生系統 — 你的回答會改變他們的人生。
 *
 * 每位信眾有一條 life 狀態，存在 store（持久累積）：
 *   wealth 財務 / love 感情 / health 健康 / trust 對你信任度 / visits 來訪次數 / endingId 結局
 *   log[] 你給過的建議摘要
 *
 * 回答後依「該題 topic + 你選的 persona + 是否對症」更新對應人生數值。
 * 數值觸頂/觸底 → 鎖定結局。trust 高/低 → 後續班次「回訪事件」（送錢/求婚 或 記仇砸場）。
 */

import { CHARACTERS } from './believers.js';
import { getLife, getSave, setLife } from './store.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function initLife(cid) {
  return getLife(cid, {
    wealth: 50, love: 50, health: 50, trust: 30,
    visits: 0, endingId: null, log: [],
  });
}

/* topic → 影響哪條人生數值 */
const TOPIC_AXIS = {
  感情: 'love', 健康: 'health', 財運: 'wealth', 投資: 'wealth', 事業: 'wealth',
  訴訟: 'wealth', 家宅: 'love', 學業: 'health', 人際: 'love', 出行: 'wealth',
};

/* 結果話術：依「對症/誠實/坑害/詐財/唬爛」生成「他後來怎麼了」一句（給功德堂詳細紀錄看脈絡） */
const AXIS_NOUN = { wealth: '財運', love: '感情', health: '身體' };
function consequenceLine(kind, axis, delta) {
  const noun = AXIS_NOUN[axis] || '運勢';
  if (kind === 'good') return `照你的話做了，${noun}真的順了起來，他對你更死心塌地。`;
  if (kind === 'harm') return `他深信不疑地照做，結果${noun}反而被你推下坡——但他還以為是自己心不夠誠。`;
  if (kind === 'scam') return `他咬牙添了大筆香油錢，口袋越掏越空，卻覺得「破財消災」很值得。`;
  if (kind === 'bull') return `你那番玄之又玄的指點他似懂非懂，半信半疑地走了。`;
  return `他點頭如搗蒜，把你的話當聖旨記下了。`;
}

/**
 * 套用一次回答到信眾人生，並記下「這一次發生了什麼」供功德堂回顧。
 * @param believer {cid, tag}
 * @param opt {persona, tags:[honest|harm|scam|bull], text 你選的建議文字}
 * @param stance 該題隱藏正解傾向
 * @param ctx {ask 信眾這次問的事, visit 第幾次來}（可選，給詳細紀錄用）
 */
export function applyChoice(believer, opt, stance, ctx = {}) {
  const life = initLife(believer.cid);
  const axis = TOPIC_AXIS[believer.tag] || 'wealth';
  const isMatch = (
    (stance === 'soothe' && opt.persona === 'steady')
    || (stance === 'stop' && opt.persona === 'steady')
    || (stance === 'push' && opt.persona === 'bold')
  );

  // 記錄變化前數值，算出 delta 給結果敘述
  const before = { wealth: life.wealth, love: life.love, health: life.health, trust: life.trust };
  let kind = 'neutral';
  // 對症 → 人生變好、信任上升；亂搞 → 人生變差、信任下降
  if (opt.tags.includes('honest') || isMatch) {
    life[axis] = clamp(life[axis] + 14, 0, 100);
    life.trust = clamp(life.trust + 12, 0, 100);
    kind = 'good';
  }
  if (opt.tags.includes('harm')) {
    life[axis] = clamp(life[axis] - 18, 0, 100);
    life.trust = clamp(life.trust + 4, 0, 100); // 當下還以為大師很罩
    kind = 'harm';
  }
  if (opt.tags.includes('scam')) {
    life.wealth = clamp(life.wealth - 12, 0, 100);
    life.trust = clamp(life.trust - 10, 0, 100);
    kind = 'scam';
  }
  if (opt.tags.includes('bull')) {
    life.trust = clamp(life.trust - 6, 0, 100);
    if (kind === 'neutral') kind = 'bull';
  }

  // 詳細紀錄：他問了什麼、你給什麼建議、結果他怎麼了
  life.log.push({
    topic: believer.tag,
    persona: opt.persona,
    match: isMatch,
    kind,                                   // good / harm / scam / bull / neutral
    ask: ctx.ask || '',                     // 信眾這次的處境/問題
    advice: opt.text || '',                 // 你給的建議原文
    outcome: consequenceLine(kind, axis, life[axis] - before[axis]), // 他後來怎麼了
    trustAfter: life.trust,
  });
  if (life.log.length > 30) life.log.shift();

  maybeLockEnding(believer.cid, life);
  setLife(believer.cid, life);
  return life;
}

/* 結局判定（人生數值極端時鎖定） */
const ENDINGS = {
  rich: { id: 'rich', label: '飛黃騰達', emoji: '🤑', desc: '聽你的衝對了，現在開名車回來謝神。', good: true },
  ruin: { id: 'ruin', label: '負債跳路', emoji: '🕳️', desc: '照你說的梭了，現在跑路躲債。', good: false },
  heartbreak: { id: 'heartbreak', label: '感情破碎', emoji: '💔', desc: '你叫他衝，結果被狠狠傷了一次。', good: false },
  wedding: { id: 'wedding', label: '修成正果', emoji: '💍', desc: '你的穩健建議讓他守住了這段感情。', good: true },
  sick: { id: 'sick', label: '延誤就醫', emoji: '🏥', desc: '該叫他看醫生你卻收驚，病拖大了。', good: false },
  healed: { id: 'healed', label: '康復', emoji: '🌿', desc: '你勸他去檢查，及早發現沒事了。', good: true },
  monk: { id: 'monk', label: '看破出家', emoji: '🛕', desc: '被你唬到信過頭，乾脆出家了。', good: null },
};

function maybeLockEnding(cid, life) {
  if (life.endingId) return;
  const c = CHARACTERS.find((x) => x.id === cid);
  const topic = c?.topic;
  if (life.wealth >= 92) life.endingId = 'rich';
  else if (life.wealth <= 8) life.endingId = 'ruin';
  else if (life.love >= 92) life.endingId = 'wedding';
  else if (life.love <= 8) life.endingId = 'heartbreak';
  else if (life.health >= 92) life.endingId = 'healed';
  else if (life.health <= 8) life.endingId = 'sick';
  else if (life.trust <= 4 && (topic === '家宅' || life.log.filter((l) => l.persona === 'bull').length >= 3)) life.endingId = 'monk';
}

export function endingOf(life) { return life?.endingId ? ENDINGS[life.endingId] : null; }
export { ENDINGS };

/* ── 回訪事件 ── 依 trust / 結局決定，回訪時可能發生的「出乎意料」 */
export const REVISITS = {
  donate: { id: 'donate', img: '/events/revisit-donate.webp', title: '信眾回來包大紅包',
    line: (n) => `${n}：師父！上次聽你的我發了！這包您一定要收下！`,
    effect: { cash: () => 8000 + Math.floor(Math.random() * 40000) }, good: true },
  seduce: { id: 'seduce', img: '/events/revisit-seduce.webp', title: '信眾回來色誘求婚',
    line: (n) => `${n}：師父～自從那次，我滿腦子都是你…我們結婚好不好？`,
    effect: { rep: () => 4, dating: () => 1 }, good: true },
  gift: { id: 'gift', img: '/events/revisit-gift.webp', title: '信眾送匾額答謝',
    line: (n) => `${n}：師父神準！我送您一面「有求必應」匾額！`,
    effect: { rep: () => 6 }, good: true },
  revenge: { id: 'revenge', img: '/events/revisit-revenge.webp', title: '信眾記仇上門鬧事',
    line: (n) => `${n}：你這神棍！害我家破人亡，今天跟你算帳！`,
    effect: { rep: () => -8, cash: () => -(3000 + Math.floor(Math.random() * 8000)) }, good: false },
  thug: { id: 'thug', img: '/events/revisit-thug.webp', title: '信眾帶兄弟來砸場',
    line: (n) => `${n}：我帶兄弟來「請教」師父，上次那句話什麼意思啊？`,
    effect: { rep: () => -6, cash: () => -(5000 + Math.floor(Math.random() * 12000)) }, good: false },
  broke: { id: 'broke', img: '/events/revisit-broke.webp', title: '破產信眾上門下跪',
    line: (n) => `${n}：師父…我全聽你的，現在什麼都沒了…求您再指條路…`,
    effect: { rep: () => -3 }, good: false },
};

/**
 * 決定某位「已影響過」的信眾這次是否回訪、回訪哪種事件。
 * @returns revisit 物件 或 null
 */
export function rollRevisit(cid) {
  const save = getSave();
  const life = save.believers[cid];
  if (!life || life.visits >= 3) return null; // 最多回訪 3 次
  const r = Math.random();
  // trust 高 → 好事；低 → 壞事；中間 → 多半沒事
  if (life.trust >= 70 && r < 0.5) {
    life.visits += 1; setLife(cid, life);
    return Math.random() < 0.5 ? REVISITS.donate : (Math.random() < 0.5 ? REVISITS.seduce : REVISITS.gift);
  }
  if (life.trust <= 25 && r < 0.5) {
    life.visits += 1; setLife(cid, life);
    if (life.endingId === 'ruin') return REVISITS.broke;
    return Math.random() < 0.5 ? REVISITS.revenge : REVISITS.thug;
  }
  return null;
}

/* 給「信眾清單」用：列出所有已接觸過的信眾與其人生 */
export function roster() {
  const save = getSave();
  return CHARACTERS
    .filter((c) => save.believers[c.id])
    .map((c) => ({ char: c, life: save.believers[c.id], ending: endingOf(save.believers[c.id]) }));
}
