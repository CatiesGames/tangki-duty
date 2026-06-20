/**
 * 遊戲經濟 — 難度核心。所有平衡公式集中在這裡，方便調整。
 *
 * 設計：
 * - 名聲 rep（0–100）決定每班「來幾個信眾」「他們多大方」。名聲低 → 人少、給得少。
 * - 每班有固定開銷 overhead（電費＋法師薪＋香火裝填），會隨名聲/規模上升。
 * - 收入來自問答香火。淨利 = 香火收入 − overhead。
 * - 付不出 overhead → 強制借錢進負債；負債有利息；負債過高 → 被討債（砸店扣錢）。
 * - 名聲低時收入常 < 開銷，逼玩家靠「滿意度/口碑」把 rep 拉起來。亂答 → 滿意跌 → rep 跌 → 更慘（死亡螺旋）。
 */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* 名聲 + 分壇升級 → 本班信眾人數 */
export function crowdSize(rep, crowdBonus = 0) {
  return Math.round(clamp(3 + (rep / 100) * 9 + crowdBonus, 3, 24));
}

/* 名聲 → 香火大方係數（每次回答香火乘數）。開局也不會太低，認真玩賺得到。 */
export function generosity(rep) {
  return clamp(1 + (rep / 100) * 2.0, 1, 3); // rep0→1.0、rep100→3.0
}

/* 元神耐久（基礎 100 + 法師團隊加成） */
export function maxStamina(staminaBonus = 0) { return 100 + staminaBonus; }

/* 每班固定開銷：基礎低、隨名聲(規模)緩升。開局要 < 認真玩的收入。 */
export function shiftOverhead(rep, day) {
  const base = 560; // 開局壓低，撐得起來但要認真才賺
  const scale = 1 + (rep / 100) * 1.6; // 名聲越高排場越大但溫和
  const inflation = 1 + Math.min(day, 40) * 0.01; // 物價緩漲、設上限
  return Math.round(base * scale * inflation);
}

/**
 * 單次回答香火 = 基礎 × 大方度(名聲) × 升級乘數 × 神明被動 × combo倍率 ×（暴擊）
 * 多個乘數相乘 → 收入指數成長。回傳 { gain, crit }。
 * ctx: { rep, incenseMult(升級), godMult(被動), comboMult, vipChance, crit:{chance,mult} }
 */
export function incenseGain(incensePoints, ctx = {}, rng = Math.random) {
  if (incensePoints <= 0) return { gain: 0, crit: false };
  const { rep = 5, incenseMult = 1, godMult = 1, comboMult = 1, vipChance = 0, crit = null } = ctx;
  const g = generosity(rep);
  const roll = 38 + rng() * 50; // 38–88 / 點（平衡：認真玩薄利可活，靠升級/名聲滾大）
  let gain = incensePoints * g * roll * incenseMult * godMult * comboMult;
  // VIP 升級：闊綽信眾，額外加成
  if (rng() < vipChance) gain *= 2;
  // 神明暴擊（如濟公）
  let didCrit = false;
  if (crit && rng() < crit.chance) { gain *= crit.mult; didCrit = true; }
  return { gain: Math.round(gain), crit: didCrit };
}

/* combo → 倍率：1 + combo×0.15，上限隨「心流修行」升級拉高 */
export function comboMultiplier(combo, capBonus = 0) {
  const per = 0.15;
  const cap = 2.5 + capBonus; // 基礎封頂 +1.5x，升級再加
  return clamp(1 + combo * per, 1, 1 + cap);
}

/* 名聲變動：滿意度高→漲，低→跌。每班結束結算。
   repGain = 行銷升級 × 關聖被動，只放大「正成長」（衝名聲流派的雪球）。 */
export function repDelta(faith, heckled, lostFans, repGain = 1) {
  let d = 0;
  if (faith >= 80) d += 6;
  else if (faith >= 60) d += 3;
  else if (faith >= 40) d += 0;
  else if (faith >= 20) d -= 4;
  else d -= 8;
  if (heckled) d -= 5;
  if (lostFans) d -= 6;
  if (d > 0) d = Math.round(d * repGain); // 正成長才吃加成
  return d;
}

/* 借錢：利率（每天滾）。回傳本班該付的利息。 */
export const DEBT_RATE = 0.08; // 每班 8% 利息（高利貸）
export function debtInterest(debt) { return Math.round(debt * DEBT_RATE); }

/* 負債門檻：超過就可能被討債 */
export const DEBT_DANGER = 8000;
export const DEBT_GAMEOVER = 20000;

/* 結算一班：回傳明細，呼叫端再寫進 store。
 * input: { incense(本班香火收入), rep, day, debt, faith, heckled, lostFans }
 */
export function settleShift({ incense, rep, day, debt, faith, heckled, lostFans }) {
  const overhead = shiftOverhead(rep, day);
  const interest = debtInterest(debt);
  const gross = incense;
  let net = gross - overhead - interest;
  const repD = repDelta(faith, heckled, lostFans);

  let borrowed = 0;
  let newCash = net; // 呼叫端會加到既有 cash 上；這裡只算本班淨變化
  let newDebt = debt;

  // 利息先滾進負債餘額（還沒還的部分）
  // net 為正：先還債，剩下入袋
  if (net > 0 && newDebt > 0) {
    const repay = Math.min(net, newDebt);
    newDebt -= repay;
    net -= repay;
  }

  return {
    gross, overhead, interest, net, repDelta: repD,
    overheadUnpaidWillBorrow: net < 0 ? -net : 0, // 不足額（呼叫端決定借不借）
    newDebt,
  };
}

/* 判斷遊戲結束：負債爆表且無力回天 */
export function isGameOver(cash, debt) {
  return debt >= DEBT_GAMEOVER && cash < 1000;
}

/* 名聲頭銜（給 UI 顯示養成感） */
export function repTitle(rep) {
  if (rep >= 90) return '全國知名・通靈天王';
  if (rep >= 75) return '北中南都有分壇';
  if (rep >= 60) return '地方名師・預約滿檔';
  if (rep >= 45) return '小有名氣';
  if (rep >= 30) return '廟口熟面孔';
  if (rep >= 15) return '剛起步的乩身';
  return '沒沒無聞・無人問津';
}
