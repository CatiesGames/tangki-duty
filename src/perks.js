/**
 * 後宮加持（攻略成功 → 開掛級加成）。
 *
 * 每位「好結局伴侶」會自然地（用符合人設的口吻）說出他/她能幫你什麼，
 * 並提供一個「強到改變玩法」的加持。多位伴侶的加持「同時生效、可疊加」——
 * 把人收齊＝整套作弊，香火爆噴、賭場吃定莊家、元神永動、債務一筆勾銷。
 *
 * 已攻略過的玩家不必做任何事：加持是即時從 d.partners 推導的，版本更新後自動生效。
 *
 * 加成欄位（partnerPerks() 會把所有生效伴侶的數值「加總」成一包 bonus）：
 *   incenseAdd     香火乘數「加量」（最後 multipliers().incenseMult 會 +這個）
 *   repAdd         名聲倍率加量
 *   repFloor       每班結算保底名聲 +（取最大）
 *   vipAdd         VIP 闊綽信眾機率 +（可超過 1 → 必中）
 *   staminaAdd     元神上限 +
 *   staminaRegen   每答回元神 +
 *   comboCapAdd    連段封頂 +
 *   comboRateAdd   每次好答 combo 額外 +（衝更快）
 *   critChance     常駐暴擊機率（取最大）
 *   critMult       暴擊倍率（取最大）
 *   faithFloor     滿意度地板（跌不破，取最大）
 *   faithGainMul   滿意度正成長倍率（相乘）
 *   overheadMul    起乩開銷倍率（相乘，0=全免）
 *   shopMul        商店價格倍率（相乘，越小越便宜）
 *   scamRefund     詐騙花費「退你」的比例（1=全退、>1=反賺）
 *   loanFree       true → 高利貸零利率 + 債務一筆勾銷
 *   chanceLuck     機會命運「必好運」（true）
 *   bullPower      唬爛升級：會推進連段 + 加香火（true）
 *   casino: { winAdd, multMul, refund }  賭場：勝率+、賠率×、輸了退本比例
 */

/* perk 物件：
 *   id        = 對象 id（t-xxx）
 *   tag       = 伴侶卡上的短標籤（誰給的）
 *   title     = 加持名（霸氣）
 *   blurb     = 一句話說明（玩家看得懂效果）
 *   line      = 交往當下「對方自然說出口」的台詞（符合人設、句句不離本行）
 *   bonus     = 上面欄位的子集 */
export const PERKS = {
  't-yuki': {
    tag: 'Yuki・夜店線人',
    title: '🎰 莊家內線',
    blurb: '賭場勝率與賠率雙雙翻倍，輸了還退一半本——莊家反過來怕你。',
    line: '欸跟你說，那家「奇乩」的荷官我超熟der～以後你進去玩，我先幫你喬好，輸了算我的啦❤️',
    bonus: { casino: { winAdd: 0.30, multMul: 2.0, refund: 0.5 } },
  },
  't-tina': {
    tag: 'Tina・環球空姐',
    title: '✈️ 免稅特權',
    blurb: '起乩開銷全免——廟租油錢人事，她飛一趟全給你帶免稅的回來。',
    line: '你那些開銷喔？交給我啦，我航線跑遍全世界，免稅的我一趟全幫你扛回來，一毛都不用你出～',
    bonus: { overheadMul: 0 },
  },
  't-anny': {
    tag: '安妮・微網紅',
    title: '📈 流量海嘯',
    blurb: '香火收入 ×5——她一篇限動，整個城市的信眾都湧來你的壇。',
    line: '我幫你發一波限動帶風向，保證信眾擠爆你的壇，香火直接翻好幾倍～這是我最會的❤️',
    bonus: { incenseAdd: 4 },
  },
  't-rin': {
    tag: '凜・人氣 Coser',
    title: '🎏 神級應援',
    blurb: '信眾滿意度永遠拉滿——她帶來的死忠粉，怎樣都對你滿意。',
    line: '我那群死忠粉超好帶的～我叫他們來捧你的場，包準每個都笑嘻嘻，滿意度直接拉到頂啦！',
    bonus: { faithFloor: 90, faithGainMul: 2 },
  },
  't-hana': {
    tag: 'Hana・日系藥師',
    title: '💊 仙丹永動',
    blurb: '元神近乎不竭——上限暴增、每答回神，你再也不會操到提早退駕。',
    line: '你每次起乩都耗得好兇⋯我調了帖補元神的給你，以後你想起多久就起多久，垮不了的。',
    bonus: { staminaAdd: 400, staminaRegen: 8 },
  },
  't-kevin': {
    tag: 'Kevin・健身教練',
    title: '💪 連段爆發',
    blurb: '連段衝更快、封頂大爆——一口氣把香火倍率拉到天花板。',
    line: '節奏要催起來才會爆！我幫你練連段，一波接一波不斷電，倍率直接頂天，扛得起重量的男人懂的。',
    bonus: { comboCapAdd: 6, comboRateAdd: 2 },
  },
  't-leo': {
    tag: 'Leo・新創 CEO',
    title: '🃏 反向收割',
    blurb: '被詐騙的錢不但全退、還倒賺——你跟他學會了反過來割韭菜。',
    line: '哈，我那套募資話術全傳給你了。以後誰想坑你，錢照樣進你口袋，連名聲都替你賺——薑是老的辣嘛。',
    bonus: { scamRefund: 1.5 },
  },
  't-coco': {
    tag: 'Coco 姐・名媛',
    title: '👑 名媛背書',
    blurb: '名聲狂飆 ×4，每班還保底大漲——整個貴婦圈都替你抬轎。',
    line: '我在圈子裡幫你美言幾句，那些貴婦名流自然會替你抬轎，你的名聲，姐姐我罩了。',
    bonus: { repAdd: 3, repFloor: 8 },
  },
  't-celine': {
    tag: 'Céline・珠寶世家',
    title: '💎 內部骨折價',
    blurb: '商店奢侈品 −90%——珠寶世家的內部價，你想買什麼幾乎免費。',
    line: '想要什麼行頭？走我們家的內部價，給你打到骨折，反正比你的櫥窗亮就好❤️',
    bonus: { shopMul: 0.1 },
  },
  't-vivian': {
    tag: '薇薇安・議員特助',
    title: '🏛️ 喬掉債務',
    blurb: '高利貸零利率，欠錢莊的債一筆勾銷——一通電話的事。',
    line: '錢莊那邊？小事，我一通電話幫你喬掉，利息全免、債也勾銷——政商關係嘛，懂的。',
    bonus: { loanFree: true },
  },
  't-arwen': {
    tag: '雅雯・財團千金',
    title: '🤍 對等金流',
    blurb: 'VIP 闊綽信眾必中、謝神巨獻爆發——她的人脈全是你的金主。',
    line: '我認識的人，出手都不手軟。我把他們介紹給你的壇，每一個都是大方的金主，闊綽得很。',
    bonus: { vipAdd: 1, incenseAdd: 1 },
  },
  't-mio': {
    tag: '小米歐・小太陽',
    title: '🍀 小太陽運',
    blurb: '機會命運必有好結果——她的天真好運，讓每張命運卡都翻到好的。',
    line: '學長～我運氣超好的欸！跟著我準沒錯，以後不管遇到什麼，都會往好的方向走啦☀️',
    bonus: { chanceLuck: true },
  },
  't-yuna': {
    tag: 'YUNA・練習生',
    title: '🎤 鏡頭加持',
    blurb: '每一筆香火必暴擊 ×5——她的偶像光環讓你每答都是高光。',
    line: '我把舞台上那種「鏡頭一掃就發光」的感覺給你～以後你開口，每一筆都是高光時刻，閃死他們！',
    bonus: { critChance: 1, critMult: 5 },
  },
  't-shian': {
    tag: '林思涵・文昌妹',
    title: '🧋 嘴甜文昌',
    blurb: '唬爛也能推進連段、還加香火——嘴甜到信眾連被唬都開心掏錢。',
    line: '哥～我陪你練講話啦，你以後就算隨便唬幾句，聽起來都甜甜的，大家都會很開心地相信你❤️',
    bonus: { bullPower: true },
  },
};

/* 取得目前生效（已是好結局伴侶）的 perk 清單。
   只有「好結局」會進 d.partners（見 hub.js triggerDatingEnding），所以這裡＝攻略成功者。 */
export function activePerks(partnerIds = []) {
  return partnerIds.map((id) => (PERKS[id] ? { id, ...PERKS[id] } : null)).filter(Boolean);
}

/* 把所有生效伴侶的加持「加總」成一包 bonus（multipliers/各系統去讀）。
   相加類用 +；相乘類用 ×；地板/封頂類取最大；布林類有一個就 true。 */
export function partnerPerks(partnerIds = []) {
  const b = {
    incenseAdd: 0, repAdd: 0, repFloor: 0, vipAdd: 0,
    staminaAdd: 0, staminaRegen: 0, comboCapAdd: 0, comboRateAdd: 0,
    critChance: 0, critMult: 0, faithFloor: 0, faithGainMul: 1,
    overheadMul: 1, shopMul: 1, scamRefund: 0,
    loanFree: false, chanceLuck: false, bullPower: false,
    casino: { winAdd: 0, multMul: 1, refund: 0 },
  };
  for (const p of activePerks(partnerIds)) {
    const x = p.bonus || {};
    if (x.incenseAdd) b.incenseAdd += x.incenseAdd;
    if (x.repAdd) b.repAdd += x.repAdd;
    if (x.repFloor) b.repFloor = Math.max(b.repFloor, x.repFloor);
    if (x.vipAdd) b.vipAdd += x.vipAdd;
    if (x.staminaAdd) b.staminaAdd += x.staminaAdd;
    if (x.staminaRegen) b.staminaRegen += x.staminaRegen;
    if (x.comboCapAdd) b.comboCapAdd += x.comboCapAdd;
    if (x.comboRateAdd) b.comboRateAdd += x.comboRateAdd;
    if (x.critChance) b.critChance = Math.max(b.critChance, x.critChance);
    if (x.critMult) b.critMult = Math.max(b.critMult, x.critMult);
    if (x.faithFloor) b.faithFloor = Math.max(b.faithFloor, x.faithFloor);
    if (x.faithGainMul) b.faithGainMul *= x.faithGainMul;
    if (x.overheadMul != null) b.overheadMul *= x.overheadMul;
    if (x.shopMul != null) b.shopMul *= x.shopMul;
    if (x.scamRefund) b.scamRefund = Math.max(b.scamRefund, x.scamRefund);
    if (x.loanFree) b.loanFree = true;
    if (x.chanceLuck) b.chanceLuck = true;
    if (x.bullPower) b.bullPower = true;
    if (x.casino) {
      b.casino.winAdd += x.casino.winAdd || 0;
      b.casino.multMul *= x.casino.multMul || 1;
      b.casino.refund = Math.max(b.casino.refund, x.casino.refund || 0);
    }
  }
  return b;
}
