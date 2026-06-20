/**
 * 地下錢莊・高利貸系統 — 諷刺「以債養債、利滾利」。
 *
 * 規則：
 *  · 借款單位 1萬 / 10萬 / 100萬，帳面欠款上限 100萬。
 *  · 砍頭息：借 X，實拿 X × (1 - HEADCUT)，但欠 X（一借就先虧）。
 *  · 每班結算時 owed 滾利（DAILY_RATE，很兇），一不小心暴增。
 *  · 每班需付「當輪應繳」(dueFor)；付不出 → 逾期 missed++ → 觸發討債事件。
 *  · 逾期里程碑：第 3、7、10 班越來越嚴重，皆有實際損失；第 10 班＝沉海 game over。
 */

export const LOAN_MAX = 1000000; // 帳面欠款上限 100 萬
export const HEADCUT = 0.2; // 砍頭息 20%（借 100 萬實拿 80 萬）
export const DAILY_RATE = 0.15; // 每班滾 15% 利（高利貸）
export const DUE_RATE = 0.2; // 每班「當輪應繳」= 目前欠款的 20%（至少還這麼多才不算逾期）

export const LOAN_UNITS = [10000, 100000, 1000000];

const L = (s) => { s.loan ||= { principal: 0, owed: 0, missed: 0 }; return s.loan; };

/* 還能再借多少（受上限限制） */
export function loanRoom(save) { return Math.max(0, LOAN_MAX - L(save).owed); }

/* 借一筆：回傳實拿金額（已扣砍頭息）。amount=帳面借款額。 */
export function takeLoan(save, amount) {
  const l = L(save);
  const room = loanRoom(save);
  const borrow = Math.min(amount, room);
  if (borrow <= 0) return 0;
  l.principal += borrow;
  l.owed += borrow;
  return Math.round(borrow * (1 - HEADCUT)); // 實拿
}

/* 當輪應繳（最低還款，避免逾期） */
export function dueFor(save) {
  const owed = L(save).owed;
  if (owed <= 0) return 0;
  return Math.min(owed, Math.max(5000, Math.round(owed * DUE_RATE)));
}

/* 還款（自付）：回傳實際還掉的金額 */
export function repay(save, amount) {
  const l = L(save);
  const pay = Math.max(0, Math.min(amount, l.owed));
  l.owed = Math.round(l.owed - pay);
  if (l.owed <= 0) { l.owed = 0; l.principal = 0; l.missed = 0; } // 還清歸零
  return pay;
}

export function hasLoan(save) { return L(save).owed > 0; }
export function owedAmount(save) { return L(save).owed; }
export function missedCount(save) { return L(save).missed; }

/**
 * 每班結算時呼叫：先嘗試用現金自動繳「當輪應繳」，再滾利。
 * 回傳 { paid, autoPaidFromCash, missed(bool), interest, owedAfter, milestone(數字或 null) }
 *  milestone：本班達到的逾期里程碑（3/7/10），給 main.js 觸發討債事件。
 *  扣現金的動作由呼叫端依 result.autoPaidFromCash 執行（保持 store 單純）。
 */
export function tickLoan(save) {
  const l = L(save);
  if (l.owed <= 0) return { due: 0, autoPaidFromCash: 0, missed: false, interest: 0, owedAfter: 0, milestone: null };

  const due = dueFor(save);
  let autoPaidFromCash = 0;
  let missed = false;
  if (save.cash >= due) {
    autoPaidFromCash = due;
    l.owed = Math.round(l.owed - due);
    l.missed = 0; // 有準時繳 → 逾期計數歸零（喘口氣）
  } else {
    // 付不出當輪 → 逾期
    autoPaidFromCash = save.cash; // 有多少先繳多少
    l.owed = Math.round(l.owed - autoPaidFromCash);
    missed = true;
    l.missed += 1;
  }

  // 滾利（在繳款後對剩餘欠款滾）
  const interest = Math.round(l.owed * DAILY_RATE);
  l.owed = Math.min(LOAN_MAX * 3, l.owed + interest); // 欠款可超過借款上限（利滾上去），但有個防爆天花板

  let milestone = null;
  if (missed && (l.missed === 3 || l.missed === 7 || l.missed === 10)) milestone = l.missed;

  return { due, autoPaidFromCash, missed, interest, owedAfter: l.owed, milestone };
}

/* 討債事件內容：依逾期里程碑回傳 { title, body, cashLoss(占現金比例), repLoss, seizeItem(bool), fatal(bool) } */
export function debtEvent(milestone) {
  if (milestone >= 10) {
    return {
      title: '🪣 最後通牒：沉了',
      body: '你連續十班付不出錢。凌晨三點，幾個刺青大哥把你架上車。\n'
        + '「師父，神明這次保不了你了。」\n'
        + '鐵桶、水泥、外海。你最後看到的是月光，和那本永遠還不完的香火簿。',
      fatal: true,
    };
  }
  if (milestone >= 7) {
    return {
      title: '🔨 錢莊砸場',
      body: '又是還不出錢的一班。這次他們直接到廟裡，掀了供桌、砸了金身、拖走你一件收藏抵債。\n'
        + '信眾嚇得四散。「下次，就不是砸東西了。」',
      cashLoss: 0.5, repLoss: 12, seizeItem: true,
    };
  }
  // milestone 3
  return {
    title: '☎️ 錢莊上門「關心」',
    body: '幾個墨鏡男在廟口站了一整天，逢人就問「師父在不在」。\n'
      + '臨走前撂下話：「利息照算，下次再拖，我們就進去坐坐。」順手抽走你桌上的現金。',
    cashLoss: 0.3, repLoss: 5,
  };
}
