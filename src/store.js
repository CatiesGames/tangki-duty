/**
 * 持久存檔 — 全部存在瀏覽器 localStorage，真實累積，從零開始。
 *
 * 一個全域 save 物件貫穿整個遊戲：金錢、負債、名聲、天數、收藏、信眾人生、把妹分數。
 * 任何重要動作後呼叫 save()；重整後 load() 還原。
 */

const KEY = 'tangki.save.v2';
const VERSION = 2;

function freshSave() {
  return {
    version: VERSION,
    cash: 0, // 從零開始
    debt: 0, // 舊欄位（保留相容；高利貸主邏輯走 loan）
    // 高利貸：principal=帳面本金；owed=目前實欠（每班滾利）；missed=累計逾期班數（觸發討債事件里程碑）
    loan: { principal: 0, owed: 0, missed: 0 },
    rep: 5, // 名聲（0–100）；一開始沒沒無聞
    day: 1,
    shiftCount: 0,
    owned: [], // 收藏的商品 id
    upgrades: { incense: 0, marketing: 0, branches: 0, vip: 0, staff: 0, comboCap: 0 }, // 事業升級等級
    believers: {}, // cid -> life 狀態（見 believers.js）
    // 乩der 交友軟體狀態：
    //  passed = 本輪左滑（滑完整副牌才會重新出現）；liked = 右滑成功配對、進好友清單
    //  accepted = 對方已「接受」(推播後解鎖聊天)；partners = 聊成的（好結局）；blocked = 談崩的
    dating: { score: 0, passed: [], liked: [], accepted: [], partners: [], blocked: [], partner: null },
    stats: {
      lifetimeIncome: 0, lifetimeOverhead: 0, lifetimeSpent: 0,
      honest: 0, harm: 0, bull: 0, scam: 0, answers: 0,
      gameOvers: 0,
    },
    flags: { tutorialDone: false },
  };
}

let save = freshSave();

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      save = migrate(data);
    } else {
      save = freshSave();
    }
  } catch {
    save = freshSave();
  }
  return save;
}

export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* quota / private mode */ }
}

export function getSave() { return save; }

export function resetSave() {
  save = freshSave();
  persist();
  return save;
}

/* 版本遷移：舊存檔補齊缺欄位 */
function migrate(data) {
  const base = freshSave();
  const merged = { ...base, ...data };
  merged.stats = { ...base.stats, ...(data.stats || {}) };
  merged.loan = { ...base.loan, ...(data.loan || {}) };
  merged.dating = { ...base.dating, ...(data.dating || {}) };
  merged.flags = { ...base.flags, ...(data.flags || {}) };
  merged.upgrades = { ...base.upgrades, ...(data.upgrades || {}) };
  merged.owned = Array.isArray(data.owned) ? data.owned : [];
  merged.believers = data.believers && typeof data.believers === 'object' ? data.believers : {};
  merged.version = VERSION;
  return merged;
}

/* ── 便利存取器（都會自動 persist） ── */
export function addCash(n) { save.cash = Math.max(0, Math.round(save.cash + n)); persist(); return save.cash; }
export function spendCash(n) { if (save.cash < n) return false; save.cash = Math.round(save.cash - n); persist(); return true; }
export function addDebt(n) { save.debt = Math.max(0, Math.round(save.debt + n)); persist(); return save.debt; }
export function setRep(n) { save.rep = Math.max(0, Math.min(100, Math.round(n))); persist(); return save.rep; }
export function addRep(n) { return setRep(save.rep + n); }

export function ownItem(id) { if (!save.owned.includes(id)) { save.owned.push(id); persist(); } }
export function owns(id) { return save.owned.includes(id); }

/* 信眾 life 狀態：取/初始化/更新 */
export function getLife(cid, init) {
  if (!save.believers[cid]) save.believers[cid] = { ...init };
  else save.believers[cid] = { ...init, ...save.believers[cid] }; // 補欄位
  return save.believers[cid];
}
export function setLife(cid, life) { save.believers[cid] = life; persist(); }

export function bump(statKey, n = 1) { save.stats[statKey] = (save.stats[statKey] || 0) + n; persist(); }
