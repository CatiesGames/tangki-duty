/**
 * 待機大廳（值班間）— 養成中樞。
 * 顯示現金/名聲/天數/負債，導航到：開始值班 / 商店 / 信眾清單 / 把妹 / 收藏。
 * 全部讀寫 store，真實累積。
 */

import { getSave, persist, spendCash, owns, resetSave } from './store.js';
import { asset } from './asset.js';
import { repTitle } from './economy.js';
import { LOAN_UNITS, HEADCUT, DAILY_RATE, loanRoom, takeLoan, dueFor, repay, owedAmount, hasLoan } from './loan.js';
import { PRODUCTS, openShop, ownedSummary, productById } from './shop.js';
import { roster, ENDINGS } from './life.js';
import { TARGETS, tryMatch, CIRCLE_COLORS, wooedBy, CLINGER_LINES, endingFor } from './dating.js';
import { upgradeList, buyUpgrade, multipliers } from './upgrades.js';

let hooks = { onStartShift: null, onBack: null };
let overlay;

export function initHub(h) {
  hooks = { ...hooks, ...h };
  injectStyles();
  overlay = document.getElementById('hub') || createOverlay();
}

function createOverlay() {
  const el = document.createElement('div');
  el.id = 'hub';
  document.body.appendChild(el);
  return el;
}

const fmt = (n) => `乩幣$${Math.round(n).toLocaleString()}`;
const vibrate = (ms = 30) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch { /* noop */ } };
const R = (a) => a[Math.floor(Math.random() * a.length)];

/* 地圖地點：x/y 是相對「地圖圖片」(3:4) 的百分比，已對齊 town-map.jpg 上的實際建築。
   地圖以 contain 鎖定 3:4，所以手機/桌機圖釘都會精準落在建築上。 */
/* x/y = 視窗百分比，抓在地圖建築上且都落在可見安全區（避免被裁切看不到）。
   乩天宮內含「值班」與「廟務經營」兩個入口（升級不放地圖上）。 */
const PLACES = [
  { act: 'shift', icon: '🛕', name: '乩天宮', sub: '值班・經營', x: 50, y: 22, primary: true }, // 中央大紅廟
  { act: 'believers', icon: '📋', name: '功德堂', sub: '信眾人生', x: 24, y: 42 }, // 廟埕旁小堂
  { act: 'shop', icon: '🛍️', name: '乩皮商城', sub: '豪車名錶', x: 76, y: 50 }, // 右側霓虹商業區
  { act: 'casino', icon: '🎰', name: '奇乩娛樂城', sub: '以小博大', x: 78, y: 74 }, // 霓虹賭場
  { act: 'dating', icon: '❤️', name: '乩der', sub: '滑出真愛', x: 50, y: 84 }, // 交友
  { act: 'collection', icon: '🏆', name: '收藏閣', sub: '戰利品', x: 22, y: 74 }, // 左下夜市/老街
];

export function openHub() {
  const s = getSave();
  overlay.classList.add('show');
  document.body.classList.add('hub-open');
  const pokeN = rollPokes(); // 對方可能主動敲你 → 乩der 紅點（數字＝幾個人傳了你還沒看）
  const pins = PLACES.map((pl) => {
    const badge = (pl.act === 'dating' && pokeN > 0) ? `<i class="pin-badge">${pokeN > 9 ? '9+' : pokeN}</i>` : '';
    return `
    <button class="map-pin ${pl.primary ? 'primary' : ''}" data-act="${pl.act}" style="left:${pl.x}%;top:${pl.y}%">
      <span class="pin-dot"><span class="pin-icon">${pl.icon}</span>${badge}</span>
      <span class="pin-label"><b>${pl.name}</b><small>${pl.sub}</small></span>
    </button>`;
  }).join('');
  overlay.innerHTML = `
    <div class="map-scene">
      <div class="map-board">
        <div class="map-bg"></div>
        <div class="map-haze"></div>
        <div class="map-pins">${pins}</div>
      </div>
      <header class="map-hud">
        <div class="map-wallet">
          <div class="wchip"><span>💰 現金</span><b>${fmt(s.cash)}</b></div>
          <div class="wchip"><span>📣 名聲</span><b>${s.rep}</b></div>
          <button class="wchip wchip-loan ${hasLoan(s) ? 'danger' : ''}" data-act="loan" title="向地下錢莊借錢／還錢">
            <span>🩸 欠錢莊 ${hasLoan(s) ? '›' : '＋借錢'}</span><b>${fmt(owedAmount(s))}</b></button>
        </div>
        <div class="map-day">第 ${s.day} 天　·　${repTitle(s.rep)}</div>
      </header>
      <footer class="map-foot">
        <span class="map-note">${hasLoan(s) ? `🩸 本班至少要還 ${fmt(dueFor(s))}` : '點廟宇開始今日值班'}</span>
        <button class="map-reset" data-act="reset" title="清除所有遊戲紀錄">🗑 清除紀錄</button>
      </footer>
    </div>`;
  overlay.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => onAct(b.dataset.act)));
  // 地圖底圖（有才套用，沒有就用漸層手繪底）
  const bg = overlay.querySelector('.map-bg');
  const probe = new Image();
  const mapUrl = asset('/bg/town-map.jpg');
  probe.onload = () => { bg.style.setProperty('--map-img', `url(${mapUrl})`); bg.classList.add('has-img'); alignPins(); };
  probe.src = mapUrl;
  alignPins();
  if (!openHub._resize) { openHub._resize = true; window.addEventListener('resize', () => { if (overlay.classList.contains('show')) alignPins(); }); }
}

/* 圖釘以「可見視窗」為基準定位（PLACES 的 x/y 已抓在可見安全區），
   不跟著 cover 溢出，圖釘就不會被裁到看不見。 */
function alignPins() { /* 視窗即基準，無需額外換算 */ }

export function refreshHub() { if (overlay?.classList.contains('show')) openHub(); }
function closeHub() { overlay.classList.remove('show'); document.body.classList.remove('hub-open'); }

function onAct(act) {
  const s = getSave();
  if (act === 'shift') { closeHub(); hooks.onStartShift?.(); return; } // 乩天宮 → 直接選神，不多一層
  if (act === 'upgrades') return openUpgradeScreen();
  if (act === 'shop') return openShopScreen();
  if (act === 'believers') return openBelieversScreen();
  if (act === 'dating') return openDatingScreen();
  if (act === 'collection') return openCollectionScreen();
  if (act === 'casino') return openCasinoScreen();
  if (act === 'loan') return openLoanScreen();
  if (act === 'reset') return openResetConfirm();
}

/* 清除所有遊戲紀錄（雙重確認，避免誤觸） */
function openResetConfirm() {
  let ov = document.getElementById('reset-ov');
  if (!ov) { ov = document.createElement('div'); ov.id = 'reset-ov'; document.body.appendChild(ov); }
  ov.className = 'reset-ov show';
  ov.innerHTML = `
    <div class="reset-card">
      <div class="reset-ic">🗑️</div>
      <h3>清除所有遊戲紀錄？</h3>
      <p>現金、名聲、收藏、信眾人生、交友進度、欠款…<b>全部歸零</b>，從第一天重新開始。<br>此動作無法復原。</p>
      <div class="reset-btns">
        <button class="reset-cancel" data-rcancel>取消</button>
        <button class="reset-go" data-rgo>確定清除，重新開始</button>
      </div>
    </div>`;
  ov.querySelector('[data-rcancel]').addEventListener('click', () => { ov.classList.remove('show'); ov.innerHTML = ''; });
  ov.querySelector('[data-rgo]').addEventListener('click', () => {
    resetSave();
    try { localStorage.removeItem('tangki.save.v2'); } catch { /* noop */ }
    location.reload();
  });
}

/* ── screen container helper ── */
function screen(html, onMount) {
  const el = document.getElementById('hub-screen') || (() => { const d = document.createElement('div'); d.id = 'hub-screen'; document.body.appendChild(d); return d; })();
  el.style.display = ''; // 清掉商店關閉時殘留的 display:none
  el.className = 'hub-screen show';
  el.innerHTML = html;
  wireScrBg(el); // 啟用畫面背景圖（若有 .scr-bg[data-bgimg]）
  el.querySelector('[data-close]')?.addEventListener('click', () => { el.classList.remove('show'); el.style.display = 'none'; el.innerHTML = ''; openHub(); });
  onMount?.(el);
  return el;
}

/* ── 地下錢莊（高利貸） ── */
function openLoanScreen(msg) {
  const s = getSave();
  const owed = owedAmount(s);
  const room = loanRoom(s);
  const due = dueFor(s);
  const fmtPct = (p) => `${Math.round(p * 100)}%`;
  const unitBtns = LOAN_UNITS.map((u) => {
    const can = room >= 1 && u <= room || (u > room && room > 0);
    const real = Math.round(Math.min(u, room) * (1 - HEADCUT));
    const disabled = room <= 0;
    return `<button class="loan-unit ${disabled ? 'no' : ''}" data-borrow="${u}" ${disabled ? 'disabled' : ''}>
      <b>借 ${fmt(u)}</b><span>實拿 ${fmt(real)}</span></button>`;
  }).join('');
  const repayBtns = owed > 0 ? `
    <div class="loan-sec-title">還款（用你的現金）</div>
    <div class="loan-repay">
      <button class="loan-rp" data-repay="${due}" ${s.cash < 1 ? 'disabled' : ''}>還當輪應繳 ${fmt(due)}</button>
      <button class="loan-rp" data-repay="${owed}" ${s.cash < 1 ? 'disabled' : ''}>能還多少還多少</button>
    </div>` : '';
  screen(`
    ${scrBg('/bg/loanshark.jpg')}
    <div class="scr-head"><button class="scr-close" data-close>‹ 返回</button><h2>地下錢莊・乩龍當舖</h2><span></span></div>
    <div class="loan-wrap">
      <div class="loan-card">
        <div class="loan-row"><span>目前欠款</span><b class="${owed > 0 ? 'bad' : ''}">${fmt(owed)}</b></div>
        <div class="loan-row"><span>每班滾利</span><b class="bad">${fmtPct(DAILY_RATE)}／班</b></div>
        <div class="loan-row"><span>借款砍頭息</span><b>${fmtPct(HEADCUT)}（借多少先扣多少）</b></div>
        ${owed > 0 ? `<div class="loan-row"><span>本班至少要還</span><b class="warn">${fmt(due)}</b></div>` : ''}
        <div class="loan-row"><span>還可借</span><b>${fmt(room)}</b></div>
      </div>
      <div class="loan-warn">借的時候很爽，還的時候沉海。利滾利，繳不出當輪就有人來「關心」。</div>
      ${msg ? `<div class="loan-msg">${msg}</div>` : ''}
      <div class="loan-sec-title">借款（單位：萬 / 十萬 / 百萬，上限 ${fmt(1000000)}）</div>
      <div class="loan-units">${unitBtns}</div>
      ${repayBtns}
    </div>`, (el) => {
    el.querySelectorAll('[data-borrow]').forEach((b) => b.addEventListener('click', () => {
      const sv = getSave();
      const got = takeLoan(sv, +b.dataset.borrow);
      if (got <= 0) { openLoanScreen('已達借款上限，借不了了。'); return; }
      sv.cash += got; persist();
      vibrate(30);
      openLoanScreen(`💵 入手 ${fmt(got)}（帳面欠款已記）。錢拿了，利息開始滾了。`);
    }));
    el.querySelectorAll('[data-repay]').forEach((b) => b.addEventListener('click', () => {
      const sv = getSave();
      const want = Math.min(+b.dataset.repay, sv.cash);
      if (want <= 0) { openLoanScreen('現金不夠，連一塊都還不出。'); return; }
      const paid = repay(sv, want); sv.cash -= paid; persist();
      vibrate(20);
      openLoanScreen(hasLoan(sv) ? `還了 ${fmt(paid)}，還欠 ${fmt(owedAmount(sv))}。` : '🎉 全部還清！終於不用怕半夜有人敲門了。');
    }));
  });
}

/* 畫面背景圖：probe 載到才淡入，缺圖則維持原本漸層底，永不破版 */
const scrBg = (url) => `<div class="scr-bg" data-bgimg="${url}"></div>`;
function wireScrBg(el) {
  el.querySelectorAll('.scr-bg[data-bgimg]').forEach((node) => {
    const url = asset(node.getAttribute('data-bgimg'));
    const probe = new Image();
    probe.onload = () => { node.style.backgroundImage = `url(${url})`; node.classList.add('has-img'); };
    probe.src = url;
  });
}

/* ── 商店（用 shop.js 的乩皮商城 UI） ── */
function openShopScreen() {
  const el = document.getElementById('hub-screen') || (() => { const d = document.createElement('div'); d.id = 'hub-screen'; document.body.appendChild(d); return d; })();
  el.style.display = ''; // 清掉前一個畫面關閉時殘留的 display:none
  el.className = 'hub-screen show';
  el.innerHTML = '';
  // openShop 會覆寫 el.className = 'shop-root'，關閉時要把它徹底藏起來（否則殘留 shop-root 全白蓋住地圖）
  openShop(el, {
    onClose: () => {
      el.className = '';
      el.style.display = 'none';
      el.innerHTML = '';
      openHub();
    },
  });
}

/* ── 信眾清單 ── */
function openBelieversScreen() {
  const list = roster();
  const total = list.length;
  const helped = list.filter((r) => r.ending?.good).length;
  const ruined = list.filter((r) => r.ending && r.ending.good === false).length;
  const cards = total === 0
    ? '<div class="empty">還沒有接觸過任何信眾。先去值幾班吧。</div>'
    : list.map((r) => {
      const l = r.life; const e = r.ending;
      const bar = (lab, v, c) => `<div class="lbar"><span>${lab}</span><i class="${c}" style="width:${Math.round(v)}%"></i></div>`;
      return `<button class="bcard" data-cid="${r.char.id}">
        <div class="bcard-img"><img src="${r.char.img || ''}" alt="${r.char.name}" onerror="this.style.display='none'"/></div>
        <div class="bcard-body">
          <div class="bcard-name">${r.char.name} <small>${r.char.label} · 來訪 ${l.visits || 0} 次</small></div>
          ${e ? `<div class="bcard-ending ${e.good ? 'good' : e.good === false ? 'bad' : ''}">${e.emoji} ${e.label}<small>${e.desc}</small></div>` : ''}
          ${bar('信任', l.trust, 'b-trust')}${bar('財務', l.wealth, 'b-wealth')}${bar('感情', l.love, 'b-love')}${bar('健康', l.health, 'b-health')}
          <div class="bcard-more">點看詳細紀錄 ›</div>
        </div>
      </button>`;
    }).join('');
  screen(`
    ${scrBg('/bg/merit-hall.jpg')}
    <div class="scr-head"><button class="scr-close" data-close>‹ 返回</button><h2>功德堂</h2><span></span></div>
    <div class="scr-stat">接觸 ${total} 人　·　幫到 ${helped} 人　·　害慘 ${ruined} 人</div>
    <div class="bcard-list">${cards}</div>`, (el) => {
    el.querySelectorAll('[data-cid]').forEach((b) => b.addEventListener('click', () => openBelieverDetail(b.dataset.cid)));
  });
}

/* 信眾詳細：你歷次的回應 → 造成什麼（彩蛋紀錄） */
const TOPIC_LABEL = { 感情: '感情', 健康: '健康', 財運: '財運', 投資: '投資', 事業: '事業', 訴訟: '訴訟', 家宅: '家宅', 學業: '學業', 人際: '人際', 出行: '出行' };
const PERSONA_VERB = { bold: '叫他放手去衝', steady: '勸他穩著別急', greedy: '要他先添香油', bull: '給了玄之又玄的指點' };
const KIND_TAG = {
  good: { cls: 'k-good', txt: '對症指點' },
  harm: { cls: 'k-harm', txt: '誤導' },
  scam: { cls: 'k-scam', txt: '勸他破財' },
  bull: { cls: 'k-bull', txt: '玄學唬弄' },
  neutral: { cls: 'k-neu', txt: '一般回應' },
};
function openBelieverDetail(cid) {
  const r = roster().find((x) => x.char.id === cid);
  if (!r) { openBelieversScreen(); return; }
  const c = r.char; const l = r.life; const e = r.ending;
  // 一路被你引導的脈絡：每一次「他遇到什麼 → 你給的建議 → 他後來怎麼了」，照時序串成故事
  const beats = (l.log && l.log.length)
    ? l.log.map((g, i) => {
      const k = KIND_TAG[g.kind] || KIND_TAG.neutral;
      const ask = g.ask ? `<div class="bd-ask">「${g.ask}」</div>` : `<div class="bd-ask muted">他來問「${TOPIC_LABEL[g.topic] || g.topic}」的事</div>`;
      const advice = g.advice ? `<div class="bd-advice"><b>你：</b>${g.advice}</div>` : `<div class="bd-advice muted"><b>你：</b>${PERSONA_VERB[g.persona] || '回應了他'}</div>`;
      const outcome = g.outcome ? `<div class="bd-outcome ${k.cls}">${g.outcome}</div>` : '';
      return `<div class="bd-beat">
        <div class="bd-beat-head"><span class="bd-n">第 ${i + 1} 次・${TOPIC_LABEL[g.topic] || g.topic}</span><span class="bd-kind ${k.cls}">${k.txt}</span></div>
        ${ask}${advice}${outcome}
      </div>`;
    }).join('')
    : '<div class="empty">還沒跟他互動過。他的人生還沒被你寫上任何一筆。</div>';
  const bar = (lab, v, cls) => `<div class="bd-bar"><span>${lab}</span><i class="${cls}" style="width:${Math.round(v)}%"></i><em>${Math.round(v)}</em></div>`;
  // 結局＝這條故事線的收束：把「他怎麼一路被引導成這樣」講明白
  const endingBlock = e
    ? `<div class="bd-ending ${e.good ? 'good' : e.good === false ? 'bad' : ''}">
        <div class="bd-ending-cap">最終命運</div>${e.emoji} <b>${e.label}</b><br><small>${e.desc}</small></div>`
    : '<div class="bd-ending pending"><div class="bd-ending-cap">命運未定</div>還在你手上——他每次回來，都是你再寫一筆的機會。</div>';
  screen(`
    <div class="scr-head"><button class="scr-close" data-close-bd>‹ 返回功德堂</button><h2>${c.name}</h2><span></span></div>
    <div class="bd-wrap">
      <div class="bd-hero"><img src="${c.img || ''}" onerror="this.style.display='none'"/></div>
      <div class="bd-id">${c.name}　<small>${c.label}・${c.region}・來訪 ${l.visits || 0} 次</small></div>
      <div class="bd-bars">${bar('信任', l.trust, 'b-trust')}${bar('財務', l.wealth, 'b-wealth')}${bar('感情', l.love, 'b-love')}${bar('健康', l.health, 'b-health')}</div>
      <div class="bd-logtitle">他一路被你引導的經過</div>
      <div class="bd-beats">${beats}</div>
      ${endingBlock}
    </div>`, (el) => {
    el.querySelector('[data-close-bd]')?.addEventListener('click', openBelieversScreen);
  });
}

/* ── 收藏櫃 ── */
function openCollectionScreen() {
  const { groups, ownedCount, total } = ownedSummary(); // groups 是陣列 [{id,label,emoji,items}]
  const body = ownedCount === 0
    ? '<div class="empty">還沒買任何東西。去商城滿足你的私慾吧。</div>'
    : groups.filter((g) => g.items.length).map((g) => `
      <div class="col-section">
        <div class="col-sec-title">${g.emoji} ${g.label}<small>${g.items.length} 件</small></div>
        <div class="col-cat">${g.items.map((pr) => `<button class="col-item" data-pid="${pr.id}"><div class="col-img" data-emoji="${g.emoji}"><img src="${asset(pr.img)}" onerror="this.parentElement.classList.add('ph');this.remove()"/></div><div class="col-name">${pr.name}</div><div class="col-price">${fmt(pr.price)}</div></button>`).join('')}</div>
      </div>`).join('');
  screen(`
    ${scrBg('/bg/collection-hall.jpg')}
    <div class="scr-head"><button class="scr-close" data-close>‹ 返回</button><h2>收藏閣</h2><span></span></div>
    <div class="scr-stat">已收藏 ${ownedCount} / ${total} 件　·　共花掉 ${fmt(getSave().stats.lifetimeSpent || 0)}　·　點物品看品鑑</div>
    <div class="col-grid">${body}</div>`, (el) => {
    el.querySelectorAll('.col-img.ph').forEach((d) => { d.textContent = d.dataset.emoji || '📦'; });
    el.querySelectorAll('[data-pid]').forEach((b) => b.addEventListener('click', () => openAppraisal(b.dataset.pid)));
  });
}

/* 收藏品鑑頁：高級感的單品鑑賞 */
function openAppraisal(pid) {
  const pr = productById(pid);
  if (!pr) return;
  const help = pr.ironicHelp || Math.round(pr.price / 30000);
  const ov = document.getElementById('appraisal') || (() => { const d = document.createElement('div'); d.id = 'appraisal'; document.body.appendChild(d); return d; })();
  ov.className = 'appraisal show';
  ov.innerHTML = `
    <div class="apr-card">
      <button class="apr-close" data-aclose>✕</button>
      <div class="apr-frame"><div class="apr-img" data-emoji="${catEmoji(pr.cat)}"><img src="${asset(pr.img)}" onerror="this.parentElement.classList.add('ph');this.remove()"/></div></div>
      <div class="apr-seal">藏</div>
      <div class="apr-name">${pr.name}</div>
      <div class="apr-price">入手價　乩幣$${pr.price.toLocaleString()}</div>
      <div class="apr-desc">${pr.desc || pr.blurb || ''}</div>
      <div class="apr-irony">這件收藏的代價：${help} 位信眾本可被幫助的香火錢。</div>
    </div>`;
  ov.querySelector('[data-aclose]').addEventListener('click', () => { ov.classList.remove('show'); ov.innerHTML = ''; });
  ov.addEventListener('click', (e) => { if (e.target === ov) { ov.classList.remove('show'); ov.innerHTML = ''; } });
  const ph = ov.querySelector('.apr-img.ph'); if (ph) ph.textContent = ph.dataset.emoji;
}
function catEmoji(c) { return ({ car: '🚗', watch: '⌚', wine: '🍷', jewelry: '💍', mansion: '🏠' })[c] || '📦'; }

/* ══════════ 奇乩娛樂城 ══════════
   一個有背景、多設施的賭場。賭的是現金的 %，高風險高報酬，給足情緒價值。
   外部可掛 window.__casinoWin(amount, big) 來觸發金幣雨（main.js 設定）。 */
const celebrate = (big) => { try { window.__casinoWin?.(big); } catch { /* noop */ } };
const betPcts = [
  { id: 'q', name: '小試', pct: 0.25 }, { id: 'h', name: '梭一半', pct: 0.5 }, { id: 'a', name: 'ALL IN', pct: 1 },
];

/* 電子神明機台符號（固定 6 種，每輪用它循環） */
/* 缺圖時的 emoji fallback；順序＝slot-strip.png 六格（財神/金元寶/香爐/紅包/金錢龜/金7） */
const SLOT_SYMS = ['🧙', '💰', '🪔', '🧧', '🐢', '7️⃣'];

/* 發財法會轉盤：8 個固定扇區（順時針 0~7），每格寫清楚賠率，指針一律指正上方(12點)。
   程式用 CSS 自繪這 8 格＋文字，所以「轉到哪格＝結果哪格」永遠一致，玩家也看得懂。
   icon/label 顯示在扇區上；mult 是賠率；color 區分視覺；weight 決定中獎機率。 */
/* weight 已調過：EV ≈ 0.87（房子抽 ~13%，符合「賭場 EV<1」）。順序與 wheel-face.png 圖一致，勿動 mult/順序。 */
const WHEEL_SEGS = [
  { icon: '🧧', label: '頭獎', mult: 8, color: '#e0301a', weight: 2, msg: '🎉 頭獎 ×8！點石成金，神明大手筆！' },
  { icon: '💀', label: '上繳天庭', mult: 0, color: '#3a2030', weight: 30, msg: '😱 停在「上繳天庭」，香火全沒了。' },
  { icon: '🪙', label: '小賺', mult: 1.8, color: '#c9a227', weight: 8, msg: '🙂 小賺一筆 ×1.8。' },
  { icon: '💀', label: '上繳天庭', mult: 0, color: '#3a2030', weight: 30, msg: '😱 又是「上繳天庭」，神明今天很餓。' },
  { icon: '🤑', label: '大豐收', mult: 3, color: '#b026ff', weight: 5, msg: '🤑 大豐收 ×3！神明賞臉！' },
  { icon: '🪙', label: '小賺', mult: 1.8, color: '#c9a227', weight: 8, msg: '🙂 小賺一筆 ×1.8。' },
  { icon: '😐', label: '回本', mult: 1, color: '#5a6a7a', weight: 16, msg: '😐 不賺不賠，神明說心誠就好。' },
  { icon: '🤑', label: '大豐收', mult: 3, color: '#b026ff', weight: 5, msg: '🤑 大豐收 ×3！神明賞臉！' },
];

/* 設施清單（每個一種玩法）。img = 設施場景圖（缺圖時 emoji+漸層 fallback）。 */
const CASINO_GAMES = [
  { id: 'fortune', icon: '🧧', name: '發財法會', desc: '神明加持的開運轉盤，賠率刺激。', tagline: '轉一把，看天庭給不給面子' },
  { id: 'jiao', icon: '🥠', name: '聖筊賭大小', desc: '擲筊問神，一翻兩瞪眼。', tagline: '心誠則靈，心不誠就上繳' },
  { id: 'slot', icon: '🎰', name: '電子神明機台', desc: '三神連線爆 Jackpot。', tagline: '銘謝惠顧 ×99，神明連線 ×1' },
  { id: 'vip', icon: '🎲', name: '黑骰問天', desc: '與天公伯各擲三顆黑骰比點，豹子通殺。', tagline: '一把翻身，或一把歸零' },
];
/* 賭場圖庫：probe 載入成功才套用，否則用漸層/emoji fallback，永不破版 */
const CASINO_IMG = {
  hall: '/casino/casino-hall.jpg',
  fortune: '/casino/scene-fortune.jpg', jiao: '/casino/scene-jiao.jpg', slot: '/casino/scene-slot.jpg', vip: '/casino/scene-vip.jpg',
  slotSym: (k) => `/casino/slot/sym-${k}.png`, // 老虎機 6 個符號各一張正方置中圖（停下保證置中）
  jiaoYin: '/casino/jiao-yin.png', jiaoYang: '/casino/jiao-yang.png', // 聖筊陰/陽面（同塊翻面）
};
/* 對 <div data-bgimg> / <img data-srcprobe> 做存在性偵測，載到才顯示 */
function wireCasinoImgs(el) {
  el.querySelectorAll('[data-bgimg]').forEach((node) => {
    const url = asset(node.getAttribute('data-bgimg'));
    const probe = new Image();
    probe.onload = () => { node.style.backgroundImage = `url(${url})`; node.classList.add('has-img'); };
    probe.src = url;
  });
  el.querySelectorAll('img[data-srcprobe]').forEach((node) => {
    const url = asset(node.getAttribute('data-srcprobe'));
    const probe = new Image();
    probe.onload = () => { node.src = url; node.classList.add('has-img'); };
    probe.src = url;
  });
}

function openCasinoScreen() {
  const s = getSave();
  // 縱深霓虹走道：遠景大廳圖 + 兩側 4 個設施招牌
  const signs = CASINO_GAMES.map((g, i) => `
    <button class="cas-sign s${i}" data-game="${g.id}">
      <div class="cas-sign-img" data-bgimg="${CASINO_IMG[g.id]}" data-emoji="${g.icon}"></div>
      <div class="cas-sign-neon">${g.name}</div>
      <div class="cas-sign-tag">${g.tagline}</div>
    </button>`).join('');
  screen(`
    <div class="scr-head dark"><button class="scr-close" data-close>‹ 離場</button><h2>奇乩娛樂城</h2><span class="scr-cash">🎟 乩幣$${s.cash.toLocaleString()}</span></div>
    <div class="cas-floor">
      <div class="cas-far" data-bgimg="${CASINO_IMG.hall}"></div>
      <div class="cas-smoke"></div><div class="cas-smoke b"></div>
      <div class="cas-arch"><span>奇乩娛樂城</span><small>香火換籌碼・一夜致富或一夜回廟裡睡</small></div>
      <div class="cas-lane">${signs}</div>
      <div class="cas-floorline"></div>
    </div>`, (el) => {
    wireCasinoImgs(el);
    spawnCasinoSparks(el.querySelector('.cas-floor'));
    el.querySelectorAll('[data-game]').forEach((b) => b.addEventListener('click', () => openCasinoGame(b.dataset.game)));
  });
}

const ODDS_TEXT = {
  jiao: '猜中 ×1.95（約 48% 機率）；猜錯歸零。一翻兩瞪眼。',
  slot: '小獎 ×2、中獎 ×5、三神連線 Jackpot ×20！銘謝惠顧機率高。',
  vip: '你 vs 天公伯各擲三黑骰：你出豹子（三同點）×11、點數贏 ×1.5、平手或輸或他出豹子 → 歸零。一把翻身或一把歸零。',
};

/* slot-strip.png 的符號順序（由上到下 6 格），index 對應切圖位置 */
const SLOT_SYM_NAMES = ['財神', '金元寶', '香爐', '紅包', '金錢龜', '金7'];
/* 一個符號的小圖示：直接用該符號的正方置中圖 sym-${idx}.png（缺圖 fallback emoji）。 */
function slotSymIcon(idx) {
  return `<span class="slot-symic" data-symidx="${idx}">`
    + `<img class="slot-symic-img" alt="" />`
    + `<span class="slot-symic-fb">${SLOT_SYMS[idx]}</span></span>`;
}
/* 每個小圖示各自 probe 自己那張符號圖，載到才顯示，否則維持 emoji */
function wireSlotIcons(el) {
  el.querySelectorAll('.slot-symic[data-symidx]').forEach((ic) => {
    const img = ic.querySelector('.slot-symic-img'); if (!img) return;
    const url = asset(CASINO_IMG.slotSym(Number(ic.dataset.symidx)));
    const probe = new Image();
    probe.onload = () => { img.src = url; ic.classList.add('has-img'); };
    probe.src = url;
  });
}
/* 老虎機中獎對照表：用「圖片符號」說明（跟轉出來的一模一樣），不用 emoji。
   combo = 符號 index 陣列；與 animSlot/playCasino 倍率一致。 */
const SLOT_LEGEND = [
  { combo: [5, 5, 5], label: '三個 7 連線', mult: 20, pct: 1.2 },
  { combo: [0, 0, 0], label: '三尊財神連線', mult: 5, pct: 4 },
  { combo: [2, 2, 2], label: '任意三個同符號', tail: '（元寶／香爐／紅包／龜…）', mult: 2, pct: 18 },
  { combo: null, label: '不成三連・銘謝惠顧', mult: 0, pct: 77 },
];

/* 黑骰問天對照表（與 playCasino vip 倍率/結果一致；pct 為實測機率） */
const VIP_LEGEND = [
  { label: '你擲出豹子', tail: '（三顆同點，如 ⚄⚄⚄）', mult: 11, pct: '2.8%', cls: 'top' },
  { label: '你點數贏天公伯', mult: 1.5, pct: '約 43%', cls: 'win' },
  { label: '平手', tail: '（莊家通吃，不退本）', mult: 0, pct: '約 9%', cls: 'lose' },
  { label: '你點數輸，或天公伯擲出豹子', mult: 0, pct: '約 45%', cls: 'lose' },
];

/* 賠率說明：fortune / slot 用對照表（圖示→賠率→機率），其餘用文字 */
function oddsHtml(gid) {
  if (gid === 'fortune') {
    const total = WHEEL_SEGS.reduce((sum, sg) => sum + sg.weight, 0);
    const byMult = {};
    WHEEL_SEGS.forEach((sg) => { (byMult[sg.mult] ||= { ...sg, w: 0 }).w += sg.weight; });
    const rows = Object.values(byMult).sort((a, b) => b.mult - a.mult).map((sg) => `
      <span class="wleg-item" style="--c:${sg.color}"><span class="wleg-ic">${sg.icon}</span>${sg.label}
        <b>×${sg.mult}</b><em>${Math.round(sg.w / total * 100)}%</em></span>`).join('');
    return `<div class="wheel-legend"><div class="wleg-title">轉盤對照表（指針指到的扇區即結果）</div><div class="wleg-row">${rows}</div></div>`;
  }
  if (gid === 'slot') {
    const rows = SLOT_LEGEND.map((s) => {
      const combo = s.combo
        ? `<span class="wleg-combo">${s.combo.map((idx) => slotSymIcon(idx)).join('')}</span>`
        : '<span class="wleg-combo none">✕</span>';
      return `<span class="wleg-item ${s.mult >= 20 ? 'top' : s.mult > 0 ? 'win' : 'lose'}">
        ${combo}<span class="wleg-lab">${s.label}${s.tail ? `<small>${s.tail}</small>` : ''}</span><b>×${s.mult}</b><em>${s.pct}%</em></span>`;
    }).join('');
    return `<div class="wheel-legend"><div class="wleg-title">中獎對照表（三輪停下的符號決定倍率）</div><div class="wleg-row slot">${rows}</div></div>`;
  }
  if (gid === 'vip') {
    const rows = VIP_LEGEND.map((v) => `
      <span class="wleg-item ${v.cls}">
        <span class="wleg-lab">${v.label}${v.tail ? `<small>${v.tail}</small>` : ''}</span>
        <b>${v.mult > 0 ? `×${v.mult}` : '歸零'}</b><em>${v.pct}</em></span>`).join('');
    return `<div class="wheel-legend">
      <div class="wleg-title">黑骰問天・對照表（你 vs 天公伯，各擲三顆骰比點）</div>
      <div class="wleg-row slot">${rows}</div>
      <div class="wleg-foot">＊「豹子」＝三顆骰子同一點數（如 ⚄⚄⚄）。你出豹子直接通殺，最大報復。</div>
    </div>`;
  }
  return `<div class="gmb-odds">${ODDS_TEXT[gid] || ''}</div>`;
}

/* 把金額縮成籌碼面額樣式：1,234,567 → 123萬 / 1.2億，籌碼上看得清 */
function chipAmt(n) {
  if (n >= 1e8) return `${(n / 1e8).toFixed(n >= 1e9 ? 0 : 1)}億`;
  if (n >= 1e4) return `${Math.round(n / 1e4).toLocaleString()}萬`;
  return n.toLocaleString();
}
/* 下注「籌碼」：圓形描金籌碼托盤，不是並排方塊。data-amt 寫實際下注額（顯示=點擊一致）。 */
const CHIP_FACE = ['🪙', '💰', '🧧', '🔥', '💎']; // 由小到大的籌碼臉
function betTiersHtml(gid) {
  const s = getSave();
  const tiers = gid === 'vip' ? betPcts.slice(2) : betPcts;
  return tiers.map((t, i) => {
    const bet = Math.floor(s.cash * t.pct);
    const face = CHIP_FACE[Math.min(CHIP_FACE.length - 1, i + (gid === 'vip' ? CHIP_FACE.length - tiers.length : 0))];
    return `<button class="cas-chip c${i} ${bet > 0 ? '' : 'no'}" data-amt="${bet}" ${bet > 0 ? '' : 'disabled'}>
      <span class="cas-chip-ic">${face}</span>
      <span class="cas-chip-name">${t.name}</span>
      <span class="cas-chip-amt">${bet > 0 ? chipAmt(bet) : '—'}</span></button>`;
  }).join('');
}
/* 重新渲染籌碼托盤並重新綁定（開獎後 cash 變了要刷新金額） */
function wireBets(gid, el) {
  const box = el.querySelector('#cas-bets');
  if (!box) return;
  box.innerHTML = betTiersHtml(gid);
  box.classList.remove('busy');
  box.querySelectorAll('[data-amt]').forEach((b) => b.addEventListener('click', () => {
    const bet = Number(b.dataset.amt); // 用按鈕上「實際顯示」的金額，保證一致
    if (bet <= 0) return;
    runCasinoRound(gid, bet, el);
  }));
}

/* 單一設施：場景圖當底 + 機台舞台 + 選注。開獎時跑動畫（落在預算好的結果）→ 輸贏演出。 */
function openCasinoGame(gid) {
  const g = CASINO_GAMES.find((x) => x.id === gid);
  const s = getSave();
  screen(`
    <div class="cas-game-screen g-${gid}" id="cas-screen">
      <div class="cas-scene" data-bgimg="${CASINO_IMG[gid]}" data-emoji="${g.icon}"></div>
      <div class="cas-scene-glow"></div>
      <div class="cas-vignette"></div>
      <div class="cas-topbar">
        <button class="cas-back" data-back-casino>‹ 大廳</button>
        <div class="cas-title"><span class="cas-title-ic">${g.icon}</span><b>${g.name}</b></div>
        <span class="cas-chip-bal" id="cas-cash"><i>🪙</i>${s.cash.toLocaleString()}</span>
      </div>
      <div class="cas-play">
        <div class="cas-plinth"><div class="cas-plinth-halo"></div>
          <div class="cas-stage" id="cas-stage">${casinoArt(gid)}</div>
        </div>
        <div class="cas-result" id="cas-result"></div>
      </div>
      <div class="cas-rail">
        <div class="cas-rail-odds" id="cas-rail-odds">
          <button class="cas-odds-btn" id="cas-odds-btn" type="button"><i>ⓘ</i>賠率說明</button>
          <div class="cas-odds-pop" id="cas-odds-pop" hidden>${oddsHtml(gid)}</div>
        </div>
        <div class="cas-chips" id="cas-bets"></div>
      </div>
      <div class="cas-fx" id="cas-fx" aria-hidden="true"></div>
    </div>`, (el) => {
    wireCasinoImgs(el);
    if (gid === 'slot') { sizeSlotReels(el); wireSlotIcons(el); }
    if (gid === 'vip') el.querySelectorAll('.art-dice .die').forEach((d, i) => setDieFace(d, [6, 5, 4, 3, 2, 1][i] || 1)); // 初始六骰擺好（被盅蓋著）
    el.querySelector('[data-back-casino]')?.addEventListener('click', () => openCasinoScreen());
    // 賠率說明：點 ⓘ 才從底部升起浮層（不再常駐占版、不再是一堆方塊）
    const oddsBtn = el.querySelector('#cas-odds-btn');
    const oddsPop = el.querySelector('#cas-odds-pop');
    oddsBtn?.addEventListener('click', () => {
      const show = oddsPop.hasAttribute('hidden');
      oddsPop.toggleAttribute('hidden', !show);
      el.querySelector('#cas-rail-odds')?.classList.toggle('open', show);
      if (show && gid === 'slot') wireSlotIcons(oddsPop);
    });
    wireBets(gid, el);
  });
}

/* 一回合：先算結果 → 跑對應動畫(落在結果) → 演出輸贏 → 入帳 */
function runCasinoRound(gid, bet, el) {
  const r = playCasino(gid, bet);
  const won = r.payout > bet;
  const lost = r.payout < bet;
  const big = r.payout >= bet * 5;
  const stage = el.querySelector('#cas-stage');
  const bets = el.querySelector('#cas-bets');
  const resultEl = el.querySelector('#cas-result');
  bets.classList.add('busy'); // 開獎期間鎖住下注
  resultEl.textContent = ''; resultEl.className = 'cas-result';
  el.querySelector('#cas-screen')?.classList.remove('flash-win', 'flash-lose');

  animateCasino(gid, r, stage).then(() => {
    const sv = getSave();
    sv.cash = Math.round(sv.cash - bet + r.payout); persist();
    el.querySelector('#cas-cash').innerHTML = `<i>🪙</i>${sv.cash.toLocaleString()}`;
    resultEl.textContent = `押 乩幣$${bet.toLocaleString()} → ${r.msg}`;
    resultEl.classList.add(won ? 'win' : lost ? 'lose' : 'even');
    const screen = el.querySelector('#cas-screen');
    if (won) {
      screen.classList.add('flash-win'); vibrate(big ? [60, 40, 90] : 40);
      celebrate(big); if (big) jackpotBurst(el.querySelector('#cas-fx'), r);
    } else if (lost) {
      screen.classList.add('flash-lose'); vibrate(120);
    }
    wireBets(gid, el); // 結算後刷新下注金額（依新 cash），避免顯示≠實際
  });
}

/* 老虎機尺寸校正：每格＝正方（= 一顆符號圖），窗高＝一格高。
   每張符號圖都是正方置中，所以 cell = 該格實際高度，translate 整格 → 永遠停在符號正中央。 */
function sizeSlotReels(el) {
  const reels = [...el.querySelectorAll('.art-reel')];
  if (!reels.length) return;
  const apply = () => {
    const firstCell = el.querySelector('.slot-cell');
    // cell = 一個 .slot-cell 的實際高度（CSS 已設成正方＝輪寬）
    const cell = firstCell ? firstCell.getBoundingClientRect().height : (reels[0].clientWidth || 64);
    const slot = el.querySelector('.art-slot');
    if (slot) slot._slotCell = cell; // 權威值，animSlot 直接讀
    reels.forEach((reel) => {
      const cs = getComputedStyle(reel);
      const bw = (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
      reel.style.height = `${cell + bw}px`;
    });
  };
  apply();
  // 圖載入後 cell 不變（cell 由 CSS 寬度決定，與圖無關），但仍重算一次保險
  requestAnimationFrame(apply);
  el._slotResize = apply;
}

/* ── 機台舞台（用生成圖；缺圖 fallback 到 emoji） ── */
function casinoArt(gid) {
  if (gid === 'fortune') {
    // 轉盤用「程式自繪」conic 8 扇區 + emoji 圖示（不生圖）。扇區順序＝ WHEEL_SEGS（從 12 點順時針）。
    const conic = WHEEL_SEGS.map((sg, k) => `${sg.color} ${k * 45}deg ${(k + 1) * 45}deg`).join(',');
    const labels = WHEEL_SEGS.map((sg, k) => {
      const mid = k * 45 + 22.5;
      return `<div class="wseg-label" style="transform:rotate(${mid}deg)">
        <div class="wseg-inner"><span class="wseg-ic">${sg.icon}</span><b>×${sg.mult}</b></div></div>`;
    }).join('');
    return `
    <div class="art-wheel-wrap">
      <div class="art-wheel" data-wheel>
        <div class="art-wheel-draw" style="background:conic-gradient(${conic})">${labels}</div>
      </div>
      <div class="art-wheel-hub">轉</div>
      <div class="art-wheel-pin">▼</div>
    </div>`;
  }
  if (gid === 'slot') {
    // 三輪：每輪用你生成的 slot-strip.png（6 符號直行）做垂直滾動。
    // 每個符號一張正方置中圖（sym-0..5），直行堆兩份做無縫循環；每格都置中→停下保證在中央。缺圖 fallback emoji。
    const cell = (k) => `<div class="slot-cell">`
      + `<img class="slot-cell-img" data-srcprobe="${CASINO_IMG.slotSym(k)}" alt="" />`
      + `<span class="slot-cell-fb">${SLOT_SYMS[k]}</span></div>`;
    const column = SLOT_SYMS.map((_, k) => cell(k)).join('');
    const reel = () => `<div class="art-reel"><div class="art-strip" data-reel>${column}${column}</div></div>`;
    return `<div class="art-slot">${reel()}${reel()}${reel()}<div class="art-slot-line"></div></div>`;
  }
  if (gid === 'jiao') return `
    <div class="art-jiao">
      <img class="jiao a" data-srcprobe="${CASINO_IMG.jiaoYang}" alt="" /><span class="jiao-fb a">🥠</span>
      <img class="jiao b" data-srcprobe="${CASINO_IMG.jiaoYang}" alt="" /><span class="jiao-fb b">🥠</span>
    </div>`;
  // vip 黑骰問天：天公伯（上）與你（下）各三顆 SVG 立體骰，一個大骰盅(🥡)蓋住整列，搖盅→揭盅才看點數
  const dice = () => [0, 1, 2].map(() => `<span class="die">${svgDie(6)}</span>`).join('');
  const side = (who, cls) => `
    <div class="dice-side ${cls}">
      <span class="dice-who">${who}</span>
      <div class="dice-stage">
        <div class="dice-row">${dice()}</div>
        <div class="dice-cup">🥡</div>
      </div>
      <span class="dice-sum"></span>
    </div>`;
  return `<div class="art-dice">${side('天公伯', 'sky')}<div class="dice-vs">VS</div>${side('你', 'you')}</div>`;
}

/* 正面點位（在正方面內，座標 -1..1）→ 1~6 標準排列，清楚易讀 */
const DIE_PIPS = {
  1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};
/* 乾淨的圓角骰：圓角方塊本體（黑金漸層 + 內陰影 + 高光），點數＝立體金球。
   不做假厚度斜邊（之前正面圓角、側面直角很醜），改用陰影/內光做立體感。 */
function svgDie(n) {
  const x = 12, y = 12, s = 76, r = 16; // 本體圓角方
  const cx = x + s / 2, cy = y + s / 2, span = s * 0.3, rp = s * 0.092;
  const pips = (DIE_PIPS[n] || []).map(([gx, gy]) =>
    `<circle cx="${(cx + gx * span).toFixed(1)}" cy="${(cy + gy * span).toFixed(1)}" r="${rp.toFixed(1)}" class="pip"/>`).join('');
  return `<svg class="svgdie" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="dieFace" cx="0.32" cy="0.28" r="0.95"><stop offset="0" stop-color="#54545f"/><stop offset="0.55" stop-color="#2a2a32"/><stop offset="1" stop-color="#141419"/></radialGradient>
      <radialGradient id="pipG" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#fff6d4"/><stop offset="0.45" stop-color="#ffd968"/><stop offset="1" stop-color="#b8801c"/></radialGradient>
      <filter id="pipSh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0.8" stdDeviation="0.6" flood-color="#000" flood-opacity="0.55"/></filter>
    </defs>
    <!-- 落地陰影 -->
    <ellipse cx="50" cy="93" rx="34" ry="5" fill="rgba(0,0,0,.45)"/>
    <!-- 骰身 -->
    <rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${r}" fill="url(#dieFace)" stroke="#ffd66a" stroke-width="2.6"/>
    <!-- 內緣暗邊（凹陷立體感） -->
    <rect x="${x + 2.5}" y="${y + 2.5}" width="${s - 5}" height="${s - 5}" rx="${r - 2}" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="2"/>
    <!-- 左上高光弧 -->
    <path d="M${x + 6},${y + r} A${r - 2},${r - 2} 0 0 1 ${x + r},${y + 6} L${x + s * 0.62},${y + 6}" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="3" stroke-linecap="round"/>
    <g filter="url(#pipSh)">${pips}</g>
  </svg>`;
}
/* 把一顆 .die 設成指定點數（重畫該顆 SVG 立體骰） */
function setDieFace(dieEl, n) {
  if (dieEl) dieEl.innerHTML = svgDie(n);
}

/* ── 動畫：落在預先算好的結果（mult 決定停的位置） ── */
function animateCasino(gid, r, stage) {
  return new Promise((resolve) => {
    if (gid === 'fortune') return animWheel(r, stage, resolve);
    if (gid === 'slot') return animSlot(r, stage, resolve);
    if (gid === 'jiao') return animJiao(r, stage, resolve);
    return animVip(r, stage, resolve);
  });
}

/* 轉盤：旋轉到「結果扇區」正對上方指針 → 轉到哪格就是哪格，視覺與結果永遠一致 */
function animWheel(r, stage, done) {
  const wrap = stage.querySelector('.art-wheel-wrap');
  const wheel = stage.querySelector('.art-wheel');
  if (!wheel) { setTimeout(done, 100); return; }
  const seg = r.segIndex ?? 0;
  const segCenter = seg * 45 + 22.5; // 該扇區中心（順時針，自轉盤 0 點起算）
  const turns = 5 + Math.floor(Math.random() * 3);
  // 讓扇區中心轉到 12 點指針處：旋轉 = 整圈 + (360 - 中心角)，再加一點點抖動但不跨格
  const jitter = (Math.random() * 16 - 8);
  const target = turns * 360 + (360 - segCenter) + jitter;
  wrap.classList.add('spinning');
  wheel.style.transition = 'transform 2.8s cubic-bezier(.12,.62,.2,1)';
  wheel.style.transform = `rotate(${target}deg)`;
  setTimeout(() => { wrap.classList.remove('spinning'); done(); }, 2950);
}

/* 老虎機：三輪用「6 張正方符號圖」直行垂直滾動，依符號格高對齊停下（贏=三輪同符號，輸=不全同）。
   每格＝正方置中圖；堆兩份做無縫循環，捲動範圍 = 一條(6 格)高。 */
function animSlot(r, stage, done) {
  const reels = [...stage.querySelectorAll('.art-strip')];
  if (!reels.length) { setTimeout(done, 100); return; }
  const N = SLOT_SYMS.length;
  // 依結果倍率決定「停在哪個符號組合」，讓畫面和賠率一致、玩家看得懂：
  //   ×20 → 三個 7️⃣(idx 5)；×5 → 三個 🛕神(idx 0)；×2 → 其他任意三連；×0 → 不全同
  let syms;
  if (r.mult >= 20) syms = [5, 5, 5];
  else if (r.mult >= 5) syms = [0, 0, 0];
  else if (r.mult >= 2) { const s = 1 + Math.floor(Math.random() * 3); syms = [s, s, s]; } // 元寶/香爐/紅包等小獎三連
  else {
    syms = [0, 0, 0].map(() => Math.floor(Math.random() * N));
    if (syms[0] === syms[1] && syms[1] === syms[2]) syms[2] = (syms[2] + 1) % N; // 確保不三連
  }
  // 用 sizeSlotReels 算好的「唯一權威 cell」（＝一格正方高）；備援才現場量測
  const slot = stage.querySelector('.art-slot');
  let cell = slot && slot._slotCell;
  if (!cell) {
    const c0 = stage.querySelector('.slot-cell');
    cell = c0 ? c0.getBoundingClientRect().height : (stage.querySelector('.art-reel')?.clientWidth || 64);
  }
  let last = 0;
  reels.forEach((reel, i) => {
    const fromCell = N + (i % N); // 起點在第二條 strip 區，確保有往上捲的距離
    const targetCell = syms[i]; // 落在第一條 strip 的目標符號（整格對齊 → 停正中間）
    const dur = 1.1 + i * 0.45; last = Math.max(last, dur);
    reel.style.transition = 'none';
    reel.style.transform = `translateY(${-(fromCell * cell)}px)`;
    void reel.offsetWidth; // reflow
    reel.style.transition = `transform ${dur}s cubic-bezier(.12,.66,.25,1)`;
    reel.style.transform = `translateY(${-(targetCell * cell)}px)`;
  });
  setTimeout(done, last * 1000 + 250);
}

/* 聖筊：兩片筊杯翻滾後落地，依結果切換正/反面 */
function animJiao(r, stage, done) {
  const a = stage.querySelector('.jiao.a'); const b = stage.querySelector('.jiao.b');
  const win = r.mult > 0;
  // 贏 = 一正一反(聖筊)；輸 = 兩反(陰筊)
  const faceA = win ? CASINO_IMG.jiaoYang : CASINO_IMG.jiaoYin;
  const faceB = win ? CASINO_IMG.jiaoYin : CASINO_IMG.jiaoYin;
  stage.querySelector('.art-jiao').classList.add('tossing');
  setTimeout(() => {
    [a, b].forEach((node) => { if (node) node.classList.add('landed'); });
    // 切換到結果面（圖載到才換 src，否則 fallback emoji 不影響）
    if (a && a.classList.contains('has-img')) a.src = faceA;
    if (b && b.classList.contains('has-img')) b.src = faceB;
    stage.querySelector('.art-jiao').classList.remove('tossing');
  }, 1100);
  setTimeout(done, 1500);
}

/* 黑骰問天：骰盅蓋著 → 兩盅一起搖一搖 → 先揭天公伯盅、再揭你的盅（骰子不轉，揭開才看點數）。 */
function animVip(r, stage, done) {
  const sky = stage.querySelector('.dice-side.sky'); const you = stage.querySelector('.dice-side.you');
  if (!sky || !you) { setTimeout(done, 100); return; }
  const ss = sky.querySelector('.dice-sum'); const ys = you.querySelector('.dice-sum');
  if (ss) ss.textContent = ''; if (ys) ys.textContent = '';

  // 先把結果點數設進骰子（此時被盅蓋著、看不到），並把盅蓋回去
  const prep = (sideEl, vals, trip) => {
    [...sideEl.querySelectorAll('.die')].forEach((d, i) => { setDieFace(d, vals[i]); d.classList.toggle('trip', !!trip); });
    sideEl.classList.remove('opened');
  };
  prep(sky, r.sky, r.skyTrip); prep(you, r.you, r.youTrip);

  // 1) 兩盅一起搖
  sky.classList.add('shaking'); you.classList.add('shaking');
  vibrate(20);
  setTimeout(() => {
    sky.classList.remove('shaking'); you.classList.remove('shaking');
    // 2) 揭天公伯盅（先看莊家）
    sky.classList.add('opened');
    if (ss) ss.textContent = `${r.sky[0] + r.sky[1] + r.sky[2]} 點`;
    vibrate(30);
    // 3) 0.7s 後揭你的盅
    setTimeout(() => {
      you.classList.add('opened');
      if (ys) ys.textContent = `${r.you[0] + r.you[1] + r.you[2]} 點`;
      vibrate(r.mult > 0 ? 60 : 30);
      setTimeout(done, 550);
    }, 700);
  }, 1000);
}

/* 大獎全螢幕金光接管 */
function jackpotBurst(host, r) {
  if (!host) return;
  host.innerHTML = `<div class="cas-jackpot"><div class="cas-jackpot-ray"></div><div class="cas-jackpot-txt">${r.mult >= 8 ? 'JACKPOT' : 'BIG WIN'}<small>×${r.mult}</small></div></div>`;
  host.classList.add('show');
  setTimeout(() => { host.classList.remove('show'); host.innerHTML = ''; }, 1900);
}

/* 大廳飄浮光點 */
function spawnCasinoSparks(host) {
  if (!host) return;
  for (let i = 0; i < 16; i++) {
    const d = document.createElement('i');
    d.className = 'cas-spark';
    d.style.left = `${Math.random() * 100}%`;
    d.style.animationDelay = `${Math.random() * 6}s`;
    d.style.animationDuration = `${5 + Math.random() * 6}s`;
    d.style.opacity = `${0.3 + Math.random() * 0.5}`;
    host.appendChild(d);
  }
}

/* 各設施的開獎邏輯，回 { payout(含本金), mult, msg } */
function playCasino(gid, bet) {
  const r = Math.random();
  if (gid === 'jiao') {
    const win = r < 0.48;
    return win ? { payout: Math.round(bet * 1.95), mult: 1.95, msg: '🥠 聖筊！神明點頭，猜中翻倍！' } : { payout: 0, mult: 0, msg: '😩 陰筊…神明搖頭，香油上繳天庭。' };
  }
  if (gid === 'slot') {
    // EV ≈ 0.80（房子抽 ~20%）：×20@1.2% / ×5@4% / ×2@18% / 其餘歸零
    if (r < 0.012) return { payout: bet * 20, mult: 20, msg: '🎰🎰🎰 三個 7 連線 JACKPOT ×20！整條街都聽到鈴聲！' };
    if (r < 0.052) return { payout: bet * 5, mult: 5, msg: '✨ 三尊財神連線 ×5！手氣正旺！' };
    if (r < 0.232) return { payout: bet * 2, mult: 2, msg: '🙂 三個同符號 ×2，回本還有賺。' };
    return { payout: 0, mult: 0, msg: '🎰 銘謝惠顧⋯⋯機台說你誠意不夠。' };
  }
  if (gid === 'vip') {
    // 黑骰問天：你 vs 天公伯各擲三黑骰。你豹子 ×11；莊家豹子(你沒) → 歸零；點數你贏 ×1.5；否則(含平手) → 歸零。
    // EV ≈ 0.95（房子抽約 5%，仍是賭場），但 ×11 豹子給足「一把翻身」的報復爽感。
    const d6 = () => 1 + Math.floor(Math.random() * 6);
    const you = [d6(), d6(), d6()];
    const sky = [d6(), d6(), d6()];
    const trip = (d) => d[0] === d[1] && d[1] === d[2];
    const sum = (d) => d[0] + d[1] + d[2];
    const youTrip = trip(you); const skyTrip = trip(sky);
    const ys = sum(you); const ss = sum(sky);
    let mult, msg;
    if (youTrip) { mult = 11; msg = `🎲 豹子 ${you[0]}${you[0]}${you[0]}！通殺天公伯 ×11，一把翻身！`; }
    else if (skyTrip) { mult = 0; msg = `💀 天公伯擲出豹子 ${sky[0]}${sky[0]}${sky[0]}，你滿盤皆輸。`; }
    else if (ys > ss) { mult = 1.5; msg = `🤑 你 ${ys} 點壓過天公伯 ${ss} 點，×1.5 得手！`; }
    else if (ys === ss) { mult = 0; msg = `😐 平手 ${ys} 點，天公伯收走——莊家通吃平手。`; }
    else { mult = 0; msg = `💀 你 ${ys} 點輸天公伯 ${ss} 點，香油全上繳。`; }
    return { payout: Math.round(bet * mult), mult, msg, you, sky, youTrip, skyTrip };
  }
  // fortune（轉盤）：依 weight 抽一個固定扇區，結果完全由該扇區決定 → 轉到哪格就是哪格
  const total = WHEEL_SEGS.reduce((sum, sg) => sum + sg.weight, 0);
  let roll = r * total; let segIndex = 0;
  for (let k = 0; k < WHEEL_SEGS.length; k++) { roll -= WHEEL_SEGS[k].weight; if (roll < 0) { segIndex = k; break; } }
  const seg = WHEEL_SEGS[segIndex];
  return { payout: Math.round(bet * seg.mult), mult: seg.mult, msg: seg.msg, segIndex };
}

/* ── 廟務經營升級樹 ── */
export function openUpgradeScreen() {
  const render = () => {
    const cash = getSave().cash;
    const list = upgradeList();
    const cards = list.map((u) => {
      const afford = u.nextPrice != null && cash >= u.nextPrice;
      return `<div class="up-card ${u.maxed ? 'maxed' : ''}">
        <div class="up-top"><span class="up-ico">${u.icon}</span><div class="up-info"><b>${u.name} <small>Lv.${u.level}/${u.max}</small></b><span class="up-desc">${u.desc}</span></div></div>
        <div class="up-eff"><span>目前：${u.curEffect}</span><span class="next">下一級：${u.nextEffect}</span></div>
        <button class="up-buy ${u.maxed ? 'maxed' : afford ? '' : 'no'}" data-up="${u.id}" ${u.maxed || !afford ? 'disabled' : ''}>
          ${u.maxed ? '已滿級' : `升級　${fmt(u.nextPrice)}`}
        </button>
      </div>`;
    }).join('');
    const m = multipliers();
    const summ = [
      `香火 ×${m.incenseMult.toFixed(2)}`,
      `名聲成長 ×${m.repGain.toFixed(2)}`,
      m.crowdBonus ? `信眾 +${m.crowdBonus} 人` : null,
      m.vipChance ? `闊綽 ${Math.round(m.vipChance * 100)}%` : null,
      m.staminaBonus ? `元神 +${m.staminaBonus}` : null,
    ].filter(Boolean).join('　');
    return `
      <div class="scr-head"><button class="scr-close" data-close>‹ 返回</button><h2>廟務經營</h2><span class="scr-cash">乩幣$${cash.toLocaleString()}</span></div>
      <div class="scr-stat">用香火再投資，乘數疊加 → 收入指數成長。這是滾雪球的引擎。</div>
      <div class="up-summary">目前加成：${summ}</div>
      <div class="up-grid">${cards}</div>`;
  };
  // 從地圖進來→關閉回地圖；從選神頁進來→關閉只收掉本頁，露出底下的選神
  const fromMap = overlay.classList.contains('show');
  const mount = (el) => {
    el.querySelectorAll('[data-up]').forEach((b) => b.addEventListener('click', () => {
      const r = buyUpgrade(b.dataset.up);
      if (r.ok) { vibrate(30); el.innerHTML = render(); mount(el); }
    }));
    const close = el.querySelector('[data-close]');
    if (close) {
      const fresh = close.cloneNode(true); close.parentNode.replaceChild(fresh, close); // 移除 screen() 預設綁定
      fresh.addEventListener('click', () => { el.classList.remove('show'); el.style.display = 'none'; el.innerHTML = ''; if (fromMap) openHub(); });
    }
  };
  const el = screen(render());
  mount(el);
}

/* ════════════════ 乩der（仿 Tinder 交友軟體） ════════════════
 *  探索 tab：一張一張的卡片，左滑略過／右滑表白。
 *    右滑時若你的收藏「滿足對方暗示的奢侈品門檻」→ 配對成功，進好友清單，
 *    過幾秒對方會「接受」(推播)→ 解鎖聊天；不滿足→被打槍＋線索提示。
 *    左滑過的人，要等整副牌都看完才會重新洗回來。
 *  好友 tab：右滑配對到的人；接受了的可以進聊天（選項式對話樹）。
 */
function ds() { const s = getSave(); s.dating ||= {}; const d = s.dating; d.passed ||= []; d.liked ||= []; d.accepted ||= []; d.partners ||= []; d.blocked ||= []; d.clingers ||= []; d.aff ||= {}; d.seen ||= {}; d.pokes ||= []; d.history ||= {}; d.endings ||= {}; d.coldStreak ||= {}; d.scamAsk ||= {}; d.pokeCooldown ||= {}; return d; }

/* ── 花費合理化：選項的 cost 要對得上「實際在做什麼」，不再一律 12000 ──
 * convo 裡的選項可用以下方式表達花費（resolveCost 統一解析成實際金額）：
 *   cost: <固定金額>          一般約會/禮物，照語意分級（手搖飲～買島差很多）
 *   costTier: '<名稱>'        用語意級距（見 COST_TIERS），比硬寫數字好讀、好調
 *   costPct: <0~1>           花「目前現金的某比例」——詐騙型專用，所以「他知道你有多少」
 * 詐騙型(scammer)：每追加一次騙錢，比例升高（越陷越深），最後幾乎掏空你，
 *   但金額永遠 = 你現有現金的比例 → 不會喊超過你有的、也不會少到沒感覺（不一眼假）。 */
const COST_TIERS = {
  drink: 150,        // 一杯手搖／提神飲料
  coffee: 350,       // 咖啡廳坐一下
  meal: 3000,        // 一頓像樣的飯
  niceMeal: 15000,   // 帶去吃大餐
  fineDining: 60000, // 頂級景觀餐廳／米其林
  gift: 30000,       // 隨手送的小禮（非奢侈品 gate）
  party: 500000,     // 包場、辦一個局
  property: 30000000, // 置產綁定（仁愛路置產之類，炫富級）
};
/* 解析一個選項的實際花費。回 { amount, isScam }；非花費選項回 amount=0。 */
function resolveCost(opt, t) {
  if (opt.costPct != null) {
    const s = getSave();
    const d = ds();
    const id = t?.id;
    // 詐騙型逐次加碼：第 n 次騙錢比例往上爬（越陷越深）
    const asks = id ? (d.scamAsk[id] || 0) : 0;
    const pct = Math.min(0.95, opt.costPct + asks * 0.12);
    const raw = Math.floor(s.cash * pct);
    // 不一眼假：至少要有感（>= 5 萬或你現金的 8%），但不超過你有的
    const floor = Math.min(s.cash, Math.max(50000, Math.floor(s.cash * 0.08)));
    const amount = Math.max(floor, Math.min(s.cash, raw));
    return { amount, isScam: true };
  }
  if (opt.costTier) return { amount: COST_TIERS[opt.costTier] || 0, isScam: false };
  if (opt.cost) return { amount: opt.cost, isScam: false };
  return { amount: 0, isScam: false };
}

/* 每位對象的聊天歷史（持久化，點進去看到的是延續的同一串對話，不會每次重置） */
const HIST_CAP = 40;
function histOf(id) { const d = ds(); return (d.history[id] ||= []); }
function pushHist(id, msg) { const h = histOf(id); h.push(msg); while (h.length > HIST_CAP) h.shift(); persist(); }
/* 最後一則是否為「對方丟出、還沒回的提問」（用來判斷要不要產生新開場） */
function lastIsOpenPrompt(id) { const h = histOf(id); const last = h[h.length - 1]; return !!(last && last.who === 'them' && last.openPrompt); }

/* 對方主動敲你：回到地圖時，依機率讓「目前沒有待回訊息」的伴侶丟一則新訊息給你。
   - 只敲沒有 pending 提問的人（避免重複累加 → 紅點數＝真的有幾個人傳了你還沒看）
   - 每人有冷卻（同一個值班日不重複敲），不會每次回地圖都狂跳
   - 真的把新話題寫進歷史並標 openPrompt → 你進去就看到那則「他主動敲的訊息」 */
function rollPokes() {
  const d = ds(); const s = getSave(); const today = s.day || 0;
  d.pokeCooldown ||= {};
  const candidates = [...d.partners, ...(d.clingers || [])];
  for (const id of candidates) {
    if (d.pokes.includes(id)) continue;        // 已經有待看訊息，不重複敲
    if (lastIsOpenPrompt(id)) continue;        // 已有待回提問，不重複
    if (d.pokeCooldown[id] === today) continue; // 今天已敲過，冷卻中
    const isClingerId = (d.clingers || []).includes(id) && !d.partners.includes(id);
    if (Math.random() < (isClingerId ? 0.4 : 0.35)) {
      const t = TARGETS.find((x) => x.id === id);
      if (t && d.partners.includes(id)) {       // 伴侶：丟一個真的新話題單元（之後你回他才接話）
        const pool = partnerPool(t);
        const picked = pickUnseenObj(id, 'pchat', pool);
        if (picked) {
          pushHist(id, { who: 'them', text: picked.item.them, openPrompt: true, unitIdx: picked.idx });
          if (picked.item.pic) pushHist(id, { who: 'them', text: '', pic: nextSelfie(t) });
        }
      }
      d.pokes.push(id);
      d.pokeCooldown[id] = today;
    }
  }
  persist();
  return d.pokes.length;
}
/* 關係好感度（0→100+）；分階段：0-24 陌生 / 25-54 熟絡 / 55-84 曖昧 / 85+ 交往邊緣 */
function affOf(id) { return ds().aff[id] || 0; }
function stageOf(aff) { return aff >= 85 ? 3 : aff >= 55 ? 2 : aff >= 25 ? 1 : 0; }
const STAGE_LABEL = ['初認識', '聊得來', '曖昧中', '快在一起了'];
/* 黏人逆襲：此人是否正在（或可被）瘋狂倒貼。已是伴侶就不算（已經到手）。 */
function isClinger(t) { const d = ds(); return wooedBy(t, getSave().owned) && !d.partners.includes(t.id); }

/* ── 乩der 故事線：聊完所有不重複的對話單元＝走完＝觸發結局（好/壞看當下狀態） ── */
/* 已有結局（定格）就不能再聊；好友清單據此顯示結局徽章 */
function endingOf(id) { return ds().endings[id] || null; }
function hasEnding(id) { return !!ds().endings[id]; }
/* 此角色「故事線」最後一個 stage（stage 3）的對話單元總數 → 聊完最後一階段＝故事走完 */
function finalStageUnits(t) {
  const convo = t.convo || FALLBACK_CONVO;
  return unitsForStage(convo, 3);
}
/* 某 stage 的 units 是否已全部聊過（seen 蓋滿） */
function stageExhausted(id, t, stage) {
  const convo = t.convo || FALLBACK_CONVO;
  const units = unitsForStage(convo, stage);
  const d = ds(); const seen = (d.seen[id] && d.seen[id][`s${stage}`]) || [];
  return units.length > 0 && units.every((_, i) => seen.includes(i));
}
/* 觸發並定格結局：依 endingFor 決定，寫進 d.endings，呈現結局畫面、鎖住聊天。
   confessed=true（透過告白）保證好結局；否則依當下好感/行頭分流（含 scammer 的多重結局）。 */
function triggerDatingEnding(t, confessed = false) {
  const d = ds(); const s = getSave();
  if (d.endings[t.id]) return openDatingEnding(t); // 已定格就直接看回顧
  const e = endingFor(t, { aff: affOf(t.id), matched: tryMatch(t, s.owned), confessed });
  if (!e) return;
  if (e.good) d.score = (d.score || 0) + 1;
  d.endings[t.id] = { ...e };
  // 結局後從「在聊」狀態移除：好結局進 partners、其餘進 blocked（仍可回顧）
  if (e.good) { if (!d.partners.includes(t.id)) d.partners.push(t.id); }
  else if (!d.blocked.includes(t.id)) d.blocked.push(t.id);
  persist();
  openDatingEnding(t);
}

/* 本輪「還沒處理」的牌堆：依名聲解鎖、排除已配對/已談崩，左滑過的先略過；全部略過完就重洗 */
function deckFor() {
  const d = ds();
  // 所有對象都會出現在牌堆（不受名聲門檻限制）；能不能配對成功才看 gate(奢侈品條件)
  const done = new Set([...d.liked, ...d.partners, ...d.blocked]);
  const pool = TARGETS.filter((t) => !done.has(t.id));
  const fresh = pool.filter((t) => !d.passed.includes(t.id));
  if (fresh.length) return fresh;
  // 整副都左滑過了 → 重洗（清空 passed，被略過的人重新出現）
  if (pool.length) { d.passed = []; persist(); return pool; }
  return [];
}

function openDatingScreen(tab = 'discover') {
  const d = ds();
  const liveCount = d.accepted.filter((id) => !d.partners.includes(id) && !d.blocked.includes(id)).length;
  // 倒貼路線（含被打槍後又回來敲的）也算未讀，製造「一直被敲」感
  const clingCount = d.liked.filter((id) => { const t = TARGETS.find((x) => x.id === id); return t && isClinger(t); }).length;
  const unread = liveCount + clingCount + (d.pokes ? d.pokes.length : 0); // 伴侶主動敲也算未讀
  const friendsBadge = unread ? `<i class="jd-badge">${unread}</i>` : '';
  screen(`
    <div class="jd-app">
      <div class="jd-bar">
        <button class="scr-close" data-close>‹</button>
        <div class="jd-logo">乩<span>der</span></div>
        <div class="jd-tabs">
          <button class="jd-tab ${tab === 'discover' ? 'on' : ''}" data-tab="discover">🔥 探索</button>
          <button class="jd-tab ${tab === 'friends' ? 'on' : ''}" data-tab="friends">💬 好友${friendsBadge}</button>
        </div>
      </div>
      <div class="jd-body" id="jd-body"></div>
    </div>`, (el) => {
    el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => openDatingScreen(b.dataset.tab)));
    if (tab === 'discover') mountDeck(el.querySelector('#jd-body'));
    else mountFriends(el.querySelector('#jd-body'));
  });
}

/* ── 探索：卡片牌堆 ── */
function mountDeck(host) {
  const deck = deckFor();
  if (!deck.length) {
    host.innerHTML = `<div class="jd-empty">附近暫時沒有新對象了。<br><small>名聲更高會吸引更高層級的人；或先去好友清單看看誰接受了你。</small></div>`;
    return;
  }
  const t = deck[0];
  const remain = deck.length;
  host.innerHTML = `
    <div class="jd-deck">
      <div class="jd-card" id="jd-card">
        <div class="jd-photo"><img src="${asset(t.img)}" onerror="this.parentElement.classList.add('ph')"/>
          <div class="jd-stamp like">配對♥</div><div class="jd-stamp nope">略過</div>
          <div class="jd-grad"></div>
          <div class="jd-info">
            <div class="jd-name">${t.name} <span>${t.age}</span></div>
            <div class="jd-chip" style="--c:${CIRCLE_COLORS[t.label] || '#aaa'}">${t.label}・${t.region}</div>
            <div class="jd-bio">${t.bio}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="jd-actions">
      <button class="jd-act nope" id="jd-nope" title="左滑略過">✕</button>
      <button class="jd-act like" id="jd-like" title="右滑表白">♥</button>
    </div>
    <div class="jd-count">牌堆還有 ${remain} 人　·　現金 ${fmt(getSave().cash)}</div>`;
  const card = host.querySelector('#jd-card');
  let dragging = false, startX = 0, dx = 0;
  const setX = (x, anim) => {
    dx = x;
    card.style.transition = anim ? 'transform .32s cubic-bezier(.22,.61,.36,1), opacity .32s' : 'none';
    card.style.transform = `translateX(${x}px) rotate(${x / 22}deg)`;
    card.classList.toggle('show-like', x > 40);
    card.classList.toggle('show-nope', x < -40);
  };
  const finish = (dir) => { // dir: 1 right, -1 left
    setX(dir * (window.innerWidth + 200), true);
    card.style.opacity = '0';
    setTimeout(() => (dir > 0 ? swipeRight(t) : swipeLeft(t)), 280);
  };
  const onDown = (e) => { dragging = true; startX = (e.touches ? e.touches[0].clientX : e.clientX); card.style.transition = 'none'; };
  const onMove = (e) => { if (!dragging) return; const x = (e.touches ? e.touches[0].clientX : e.clientX) - startX; setX(x); };
  const onUp = () => { if (!dragging) return; dragging = false; if (dx > 110) finish(1); else if (dx < -110) finish(-1); else setX(0, true); };
  card.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
  card.addEventListener('touchstart', onDown, { passive: true }); card.addEventListener('touchmove', onMove, { passive: true }); card.addEventListener('touchend', onUp);
  host.querySelector('#jd-nope').addEventListener('click', () => finish(-1));
  host.querySelector('#jd-like').addEventListener('click', () => finish(1));
}

function swipeLeft(t) {
  const d = ds();
  if (!d.passed.includes(t.id)) d.passed.push(t.id);
  persist();
  const body = document.getElementById('jd-body'); if (body) mountDeck(body);
}

function swipeRight(t) {
  const d = ds(); const s = getSave();
  if (tryMatch(t, s.owned)) {
    if (!d.liked.includes(t.id)) d.liked.push(t.id);
    d.passed = d.passed.filter((id) => id !== t.id);
    persist();
    matchPopup(t);
    scheduleAccept(t); // 幾秒後推播「接受」
  } else {
    // 沒滿足 → 被打槍 ＋ 線索提示（仍不講白）
    rejectPopup(t);
    if (!d.passed.includes(t.id)) d.passed.push(t.id); // 這輪先收起，重洗後可再試
    persist();
  }
}

/* 配對成功彈窗 */
function matchPopup(t) {
  const ov = jdModal();
  ov.innerHTML = `<div class="jd-modal match">
    <div class="jd-burst">💘</div>
    <h3>配對成功！</h3>
    <p>你和 <b>${t.name}</b> 互相喜歡。</p>
    <div class="jd-modal-photo"><img src="${asset(t.img)}" onerror="this.style.display='none'"/></div>
    <p class="jd-soft">已加入好友清單。等對方上線接受你，就能開始聊天…</p>
    <button class="jd-btn" data-mclose>繼續滑</button>
  </div>`;
  ov.querySelector('[data-mclose]').addEventListener('click', () => { closeJdModal(); const b = document.getElementById('jd-body'); if (b) mountDeck(b); });
}

/* 被打槍彈窗（給線索） */
function rejectPopup(t) {
  const ov = jdModal();
  ov.innerHTML = `<div class="jd-modal nope">
    <div class="jd-burst">💔</div>
    <h3>${t.name} 對你說…</h3>
    <p class="jd-line">「我們可能不太適合啦。」</p>
    <div class="jd-clue">🔍 線索：${t.gate.clue}</div>
    <p class="jd-soft">（去乩皮商城湊齊行頭，重洗牌堆後還能再遇到她。）</p>
    <button class="jd-btn ghost" data-mclose>知道了</button>
  </div>`;
  ov.querySelector('[data-mclose]').addEventListener('click', () => { closeJdModal(); const b = document.getElementById('jd-body'); if (b) mountDeck(b); });
}

/* 幾秒後對方「接受」→ 推播通知 */
function scheduleAccept(t) {
  const delay = 2600 + Math.floor(Math.random() * 2600);
  setTimeout(() => {
    const d = ds();
    if (!d.liked.includes(t.id)) return; // 已被處理
    if (d.accepted.includes(t.id)) return;
    d.accepted.push(t.id); persist();
    pushNotify(t);
  }, delay);
}

/* 右上推播 toast（即使不在乩der畫面也會跳） */
function pushNotify(t) {
  let host = document.getElementById('jd-push');
  if (!host) { host = document.createElement('div'); host.id = 'jd-push'; document.body.appendChild(host); }
  const card = document.createElement('button');
  card.className = 'jd-push-card';
  card.innerHTML = `<div class="jd-push-ic">🔥</div><div class="jd-push-txt"><b>乩der</b><span>${t.name} 接受了你，現在可以聊天了 💬</span></div>`;
  card.addEventListener('click', () => { card.remove(); openDatingScreen('friends'); setTimeout(() => openChat(t.id), 60); });
  host.appendChild(card);
  requestAnimationFrame(() => card.classList.add('show'));
  setTimeout(() => { card.classList.remove('show'); setTimeout(() => card.remove(), 400); }, 6000);
  vibrate(40);
}

/* ── 好友清單 ── */
function mountFriends(host) {
  const d = ds();
  if (!d.liked.length) {
    host.innerHTML = `<div class="jd-empty">還沒有配對到任何人。<br><small>去「探索」右滑你心儀的對象吧（記得先備好行頭）。</small></div>`;
    return;
  }
  const rows = d.liked.map((id) => {
    const t = TARGETS.find((x) => x.id === id); if (!t) return '';
    const accepted = d.accepted.includes(id);
    const partner = d.partners.includes(id);
    const blocked = d.blocked.includes(id);
    const wooed = isClinger(t); // 你的頂級收藏讓他想倒貼
    const aff = Math.min(100, affOf(id));
    const ending = d.endings[id];
    let status, cls, action = '', dot = '';
    const poked = (d.pokes || []).includes(id);
    if (ending && !partner) { // 壞/灰結局已定格：顯示結局徽章、點進看回顧（好結局走 partner 分支照常聊）
      const tone = ending.good === false ? 'bad' : 'gray';
      status = `${ending.emoji} ${ending.label}・結局 ›`; cls = `ended ${tone}`; action = `data-ending="${id}"`;
    }
    else if (partner && poked) { status = '🔴 敲了你一下…點進來看 ›'; cls = 'cling'; action = `data-chat="${id}"`; dot = '<i class="jd-dot cling"></i>'; }
    else if (partner) { status = ending ? `${ending.emoji} ${ending.label}・在一起了 ›` : '❤ 交往中・點進來聊 ›'; cls = 'ok'; action = `data-chat="${id}"`; dot = '<i class="jd-dot ok"></i>'; }
    else if (wooed && blocked) { status = '🔥 又回來瘋狂敲你'; cls = 'cling'; action = `data-cling="${id}"`; dot = '<i class="jd-dot cling"></i>'; }
    else if (blocked) { status = '對方已離開聊天 ›'; cls = 'gone'; action = `data-gone="${id}"`; } // 仍可點進去看
    else if (wooed && accepted) { status = '🔥 對你超主動'; cls = 'cling'; action = `data-cling="${id}"`; dot = '<i class="jd-dot cling"></i>'; }
    else if (accepted) { status = `${STAGE_LABEL[stageOf(aff)]}・好感 ${aff}% ›`; cls = 'live'; action = `data-chat="${id}"`; dot = '<i class="jd-dot"></i>'; }
    else { status = '等待對方接受…'; cls = 'wait'; }
    return `<button class="jd-fr ${cls}" ${action || 'disabled'}>
      <div class="jd-fr-img"><img src="${asset(t.img)}" onerror="this.parentElement.classList.add('ph')"/>${dot}</div>
      <div class="jd-fr-body">
        <div class="jd-fr-name">${t.name} <small>${t.label}</small></div>
        <div class="jd-fr-status">${status}</div>
      </div>
    </button>`;
  }).join('');
  const endCount = TARGETS.filter((t) => d.endings[t.id]).length;
  const book = endCount ? `<button class="jd-endbook" data-endbook>📖 乩der 結局簿（已收 ${endCount}/${TARGETS.length}）›</button>` : '';
  host.innerHTML = `${book}<div class="jd-friends">${rows}</div>`;
  host.querySelector('[data-endbook]')?.addEventListener('click', () => openDatingEndings());
  host.querySelectorAll('[data-chat]').forEach((b) => b.addEventListener('click', () => openChat(b.dataset.chat)));
  host.querySelectorAll('[data-ending]').forEach((b) => b.addEventListener('click', () => { const t = TARGETS.find((x) => x.id === b.dataset.ending); if (t) openDatingEnding(t); }));
  host.querySelectorAll('[data-cling]').forEach((b) => b.addEventListener('click', () => openClingerChat(b.dataset.cling)));
  host.querySelectorAll('[data-gone]').forEach((b) => b.addEventListener('click', () => openGoneChat(b.dataset.gone)));
}

/* ── 聊天（選項式對話樹） ── */
/* 單則聊天泡泡：對方訊息可帶 pic（自拍照），用 probe 載入、缺圖隱藏不破版 */
function chatBubble(t, m) {
  const av = m.who === 'them' ? `<img class="jd-av" src="${asset(t.img)}" onerror="this.style.display='none'"/>` : '';
  const txt = m.text ? `<div class="jd-bub">${m.text}</div>` : '';
  const pic = m.pic
    ? `<div class="jd-bub pic"><img class="jd-selfie" data-srcprobe="${m.pic}" alt="📷" onerror="this.parentElement.classList.add('noimg')"/><span class="jd-pic-fb">📷 傳了一張自拍</span></div>`
    : '';
  // 文字＋照片各自一顆泡泡（照片在文字下方），整組同一側
  const inner = m.pic ? `<div class="jd-bub-stack">${txt}${pic}</div>` : txt;
  return `<div class="jd-msg ${m.who}">${av}${inner}</div>`;
}
/* 把聊天視窗捲到最底：立即捲一次 + 下一個 frame 再捲一次（等版面 reflow，避免設到舊高度沒到底）。 */
function scrollChatBottom(el) {
  const cl = el?.querySelector?.('#jd-chatlog') || (el?.id === 'jd-chatlog' ? el : null);
  if (!cl) return;
  cl.scrollTop = cl.scrollHeight;
  requestAnimationFrame(() => { cl.scrollTop = cl.scrollHeight; });
}
function wireSelfies(el) {
  el.querySelectorAll('img.jd-selfie[data-srcprobe]').forEach((node) => {
    const url = asset(node.getAttribute('data-srcprobe'));
    const probe = new Image();
    // 圖載到後高度會變大 → 再捲一次到底，避免新照片把對話頂上去而沒捲到底
    probe.onload = () => { node.src = url; node.classList.add('has-img'); scrollChatBottom(el); };
    probe.onerror = () => { node.parentElement.classList.add('noimg'); scrollChatBottom(el); };
    probe.src = url;
  });
}

/* 通用對話池：角色沒寫專屬 convo 時的後備。已改成「對話單元」：每個 them 配自己的 opts，
   每個 opt 有切題 reply（對方針對你選的回應），選項隨話題變化 → 不跳針、不答非所問。 */
const FALLBACK_CONVO = {
  stages: [
    // stage 0 初認識
    { units: [
      { them: '你平常都在忙什麼啊？看你行頭不錯喔。', opts: [
        { label: '在忙事業，金乩國際最近很拼', aff: 2, reply: '聽起來你是個有在拼的男人欸，加分😏' },
        { label: '到處走走看看，算半個自由業', aff: 1, reply: '自由業喔～那你時間應該很彈性囉？' },
        { label: '懶得講工作，聊點別的', aff: -1, reply: '欸你很神祕欸…是不見得人喔🤨' },
      ] },
      { them: '說真的，交友軟體上正常人不多，你算特別的。', opts: [
        { label: '我比較看眼緣，妳也很特別', aff: 2, reply: '哎唷，嘴巴蠻甜的嘛😆' },
        { label: '可能因為我不缺，就不急', aff: 1, reply: '不缺還來滑交友軟體？我倒想看看你在找什麼😌' },
        { label: '彼此彼此啦', aff: 0, reply: '喔…就這樣？你話有點少欸。' },
      ] },
      { them: '你大頭貼那個背景…看起來蠻有來頭的喔？', opts: [
        { label: '還行啦，自己經營的場子', aff: 2, reply: '自己的場子喔，那你是老闆級的囉👀' },
        { label: '朋友的地方，我常去坐', aff: 1, reply: '能常坐那種地方，你交友圈不簡單欸。' },
        { label: '就拍照好看而已', aff: -1, reply: '蛤，那不就照騙…算了我再觀察你🙄' },
      ] },
    ] },
    // stage 1 聊得來
    { units: [
      { them: '今天有夠累，公司的事一堆…你呢？', opts: [
        { label: '辛苦了，改天請妳吃好料', costTier: 'niceMeal', aff: 3, reply: '真的喔？！那我可要挑貴的囉😘' },
        { label: '我也忙，懂那種累', aff: 2, reply: '對嘛～有人懂的感覺真好🥺' },
        { label: '喔，加油', aff: -2, reply: '……就「加油」喔。你是不是不太在乎我😤' },
      ] },
      { them: '欸我跟你說，我最近看上一個東西，好猶豫喔😆', opts: [
        { label: '喜歡就拿，這種小事我來', costTier: 'gift', aff: 3, reply: '哇～你怎麼這麼好，我要融化了❤️' },
        { label: '喜歡的話就別委屈自己', aff: 2, reply: '你懂我！對嘛人生就要對自己好一點😌' },
        { label: '又想買東西喔', aff: -2, reply: '哼，人家只是分享嘛，小氣鬼🙄' },
      ] },
      { them: '跟你聊天蠻舒服的耶，不像別人都很無聊。', opts: [
        { label: '那以後多找我聊', aff: 2, reply: '好啊～那你要記得回我喔，別已讀😏' },
        { label: '我這人就實在', aff: 1, reply: '實在的男人現在很少了欸，珍惜珍惜👀' },
        { label: '還好吧', aff: 0, reply: '欸你可以不要每次都句點我嗎😑' },
      ] },
    ] },
    // stage 2 曖昧中
    { units: [
      { them: '今天想你了欸…你會不會也想我？🥺', opts: [
        { label: '當然想，滿腦子都是妳', aff: 3, reply: '討厭啦～這樣我會當真喔😳' },
        { label: '帶妳去走走散散心', costTier: 'fineDining', aff: 4, reply: '真的嗎？我去化妝！等你來接我😘' },
        { label: '還好欸', aff: -2, reply: '……我認真你敷衍，這樣很傷人欸😢' },
      ] },
      { them: '欸…那個我看很久的東西，我還是好想要喔（敲碗', opts: [
        { label: '送妳，當作寵妳', gift: { test: (o) => o.some((x) => x.startsWith('jewelry-')), need: '金飾' }, aff: 5, reply: '天啊你真的買…我整顆心都是你的了❤️' },
        { label: '乖，下次有機會就給妳', aff: 1, reply: '齁～你每次都說下次，我記著喔😤' },
        { label: '妳會不會太常想要東西', aff: -2, reply: '我只是想要被在乎的感覺嘛…你不懂🥲' },
      ] },
      { them: '你對我是認真的嗎？我有點怕受傷。', opts: [
        { label: '我認真的，別怕', aff: 3, reply: '聽你這樣說…我安心多了🥺❤️' },
        { label: '把妳放心上，我不是玩玩', aff: 3, reply: '嗯…我選擇相信你一次喔。' },
        { label: '先別急著定義啦', aff: -1, reply: '又來了…你是不是其實沒那麼想定下來😔' },
      ] },
    ] },
    // stage 3 快在一起
    { units: [
      { them: '我們…是不是該確定關係了？🥹', opts: [
        { label: '做點浪漫的，給妳個交代', costTier: 'party', aff: 4, reply: '你…你竟然包場！我要哭了啦😭❤️' },
        { label: '再讓我準備一下，會給妳的', aff: 1, reply: '好…我等你，但別讓我等太久喔🥺' },
        { label: '我們現在這樣不好嗎', aff: -1, reply: '原來在你心裡我們「這樣」就夠了喔…😞' },
      ] },
      { them: '我朋友都問我們到底算什麼，我不知道怎麼回…', opts: [
        { label: '跟她們說，妳名花有主了', aff: 3, reply: '真的可以這樣說喔？！我馬上去回她們😍' },
        { label: '快了快了，再等我一下', aff: 1, reply: '齁…好啦，看你表現囉😏' },
        { label: '幹嘛理別人怎麼想', aff: -1, reply: '可是我在乎欸…你都不在乎我們的名分嗎🥲' },
      ] },
    ] },
  ],
  partner: ['老公今天有想我嗎❤️', '欸我看到一個超美的東西…分享給你看😆', '今天過得好嗎？跟我說說嘛。'],
  partnerOpts: [{ label: '當然想妳', aff: 1 }, { label: '帶妳去吃大餐', costTier: 'niceMeal', aff: 2 }, { label: '在忙，晚點聊', aff: 0 }],
  confessLine: '好…我願意！我們在一起吧❤️',
  /* 交往後無限聊：每個話題單元 them 開頭、你的每個選項都有「對方針對你選的回應」(切題、不亂答) */
  partnerChats: [
    { them: '今天過得怎樣？我有點想你欸❤️', pic: false, opts: [
      { label: '也想妳，下班就去找妳', reply: '真的嗎～那我去化妝！等你喔😘' },
      { label: '忙翻了，公司一堆事', reply: '辛苦啦…那你忙完記得吃飯，別餓著🥺' },
      { label: '還好啦', reply: '喔…你今天話好少喔，是不是不愛我了😢' },
    ] },
    { them: '欸我看到一個超美的包，分享給你看😆', opts: [
      { label: '喜歡就買，我請', costTier: 'gift', reply: '哇你最好了！我馬上去結帳❤️ 愛你！' },
      { label: '很好看啊，配妳剛好', reply: '對吧對吧～你眼光真好，那…幫我看看價錢😏' },
      { label: '又要買喔', reply: '哼，人家只是分享嘛，小氣鬼🙄' },
    ] },
    { them: '今天拍了張新照，給你看😊', pic: true, opts: [
      { label: '也太美了吧，存了！', reply: '討厭啦～只給你看喔，別亂傳😳' },
      { label: '我最愛這個角度', reply: '你懂我！下次拍更好看的給你😘' },
      { label: '嗯，不錯', reply: '才「不錯」喔…我拍超久的欸😤' },
    ] },
  ],
};

/* ── 追求期聊天 = 對話單元（跟交往後同模型）：每個單元 {them 開場, opts:[{label, reply 切題回應, aff, cost?, gift?}]}
   這樣「對方說 A → 你挑得上 A 的回法 → 對方針對你選的回應 → 再換新話題」，選項也隨話題變化，不會跳針/答非所問。 ──
   相容舊資料：若某 stage 仍是舊的 {them:[…], opts:[…]} 形狀，動態合成單元（每句 them 配該 stage 共用 opts，
   並給每個選項一句通用切題回應），確保未改寫的角色也不會「忽略你說的話」。 */
const GENERIC_REPLIES = {
  warm: ['這樣喔～聽你講話蠻舒服的欸😊', '欸你還算有趣，加分。', '嗯嗯，繼續說來聽聽嘛😏', '你這人不錯耶，跟別人不一樣。'],
  spend: ['哇你最好了啦❤️ 這麼大方', '討厭～你這樣我會當真喔😳', '哼，算你上道😘', '你果然懂我要的是什麼。'],
  cold: ['喔…你今天話好少喔🙄', '欸你是不是沒在認真跟我聊😤', '哈，這種敷衍我看多了啦。', '冷淡欸…我考慮要不要回你了。'],
};
function genericReply(opt) {
  const pool = opt.cost || opt.gift ? GENERIC_REPLIES.spend : (opt.aff != null && opt.aff < 0) ? GENERIC_REPLIES.cold : GENERIC_REPLIES.warm;
  return pool[Math.floor(Math.random() * pool.length)];
}
/* 取得某 stage 的「對話單元陣列」：新形狀直接用 units；舊形狀(them[]+opts[])合成 */
function unitsForStage(convo, stage) {
  const sc = (convo.stages && convo.stages[Math.min(stage, convo.stages.length - 1)]) || FALLBACK_CONVO.stages[stage];
  if (sc.units && sc.units.length) return sc.units;
  // 舊形狀：每句 them 當一個單元，共用該 stage 的 opts（reply 缺就用通用切題回應）
  const opts = sc.opts || FALLBACK_CONVO.stages[Math.min(stage, FALLBACK_CONVO.stages.length - 1)].opts;
  return (sc.them || []).map((line) => ({ them: line, opts }));
}

/* 從池中挑一句「優先沒看過」的（seen 記錄已抽過的 index，全抽完就重置續聊） */
function pickUnseen(id, poolKey, pool) {
  const d = ds();
  d.seen[id] ||= {};
  const seen = d.seen[id][poolKey] || [];
  let avail = pool.map((_, i) => i).filter((i) => !seen.includes(i));
  if (!avail.length) { d.seen[id][poolKey] = []; avail = pool.map((_, i) => i); } // 全聊過 → 重置
  const idx = avail[Math.floor(Math.random() * avail.length)];
  d.seen[id][poolKey] = [...(d.seen[id][poolKey] || []), idx];
  persist();
  return pool[idx];
}

/* 物件版：挑一個沒看過的話題單元，回 {idx, item}。
   noRecycle=true（追求期故事線用）：全部聊過就回 null，不重洗 → 對話在故事走完前不重複。
   預設（交往後無限聊）：聊完重置續聊。 */
function pickUnseenObj(id, poolKey, pool, noRecycle = false) {
  const d = ds();
  d.seen[id] ||= {};
  const seen = d.seen[id][poolKey] || [];
  let avail = pool.map((_, i) => i).filter((i) => !seen.includes(i));
  if (!avail.length) {
    if (noRecycle) return null;            // 故事線：聊完不重複，交給呼叫端觸發結局
    d.seen[id][poolKey] = []; avail = pool.map((_, i) => i); // 無限聊：重置續聊
  }
  const idx = avail[Math.floor(Math.random() * avail.length)];
  d.seen[id][poolKey] = [...(d.seen[id][poolKey] || []), idx];
  persist();
  return { idx, item: pool[idx] };
}

/* 自拍照路徑：支援每人多張、越聊越多 → selfie-<id>-N.jpg（輪替）；單張舊檔 selfie-<id>.jpg 仍相容。
   count 由角色 convo.selfieCount 指定（預設 3）。 */
function nextSelfie(t) {
  const n = (t.convo && t.convo.selfieCount) || 3;
  const d = ds(); d.seen[t.id] ||= {};
  const k = (d.seen[t.id].selfieN || 0) % n + 1;
  d.seen[t.id].selfieN = (d.seen[t.id].selfieN || 0) + 1; persist();
  return `/dating/selfie-${t.id}-${k}.jpg`;
}

/* 在聊天記錄尾端插入「輸入中…」三點氣泡，回傳該節點，供之後移除 */
function showTyping(el, t) {
  const cl = el.querySelector('#jd-chatlog'); if (!cl) return null;
  const node = document.createElement('div');
  node.className = 'jd-msg them typing';
  node.innerHTML = `<img class="jd-av" src="${asset(t.img)}" onerror="this.style.display='none'"/><div class="jd-bub jd-typing"><i></i><i></i><i></i></div>`;
  cl.appendChild(node); scrollChatBottom(el);
  return node;
}

/* 關係養成式聊天：好感度推進階段，可聊 100+ 來回，到位才送照片/告白。
   聊天歷史持久化在 dating.history[id]，點進去看到的是延續的同一串對話。 */
function openChat(id) {
  const t = TARGETS.find((x) => x.id === id); if (!t) return openDatingScreen('friends');
  const d = ds();
  if (d.partners.includes(id)) return openPartnerChat(id); // 交往後（含好結局）：切題無限聊
  if (d.endings[id]) return openDatingEnding(t);          // 壞/灰結局：定格回顧
  // 沒有待回提問才丟出新話題單元；若整條故事線已聊完 → 觸發結局
  if (!lastIsOpenPrompt(id)) {
    if (!pushNextPrompt(t)) return triggerDatingEnding(t);
  }
  renderPursuitChat(t);
}

/* 丟出「下一個沒聊過的對話單元」當對方提問。回 true=有題可聊；false=故事線聊完（該觸發結局）。
   依當下 stage 抽不重複的 unit；該 stage 聊完但還沒到 stage3 → 自動往下一 stage（劇情推進）。 */
function pushNextPrompt(t) {
  const id = t.id;
  const convo = t.convo || FALLBACK_CONVO;
  let stage = stageOf(affOf(id));
  // 從目前 stage 起，往後找還有沒聊過單元的 stage（讓劇情能往後走）
  for (let st = stage; st <= 3; st++) {
    const units = unitsForStage(convo, st);
    const picked = pickUnseenObj(id, `s${st}`, units, true); // noRecycle：聊完不重洗
    if (picked) {
      const unit = picked.item;
      pushHist(id, { who: 'them', text: unit.them, openPrompt: true, unitIdx: picked.idx, stageAtAsk: st });
      if (unit.pic || (st >= 2 && Math.random() < 0.2)) pushHist(id, { who: 'them', text: '', pic: nextSelfie(t) });
      return true;
    }
  }
  return false; // 四個 stage 的單元全聊完 → 故事走完
}

/* 找出目前「待回的那個提問單元」(unitIdx + 當時的 stage)，選項就從這個單元出 → 跟對方問的對得上 */
function openUnit(t) {
  const hist = histOf(t.id);
  const prompt = lastIsOpenPrompt(t.id) ? hist[hist.length - 1] : hist.findLast?.((m) => m.who === 'them' && m.openPrompt);
  if (!prompt) return null;
  const convo = t.convo || FALLBACK_CONVO;
  const units = unitsForStage(convo, prompt.stageAtAsk ?? stageOf(affOf(t.id)));
  return units[prompt.unitIdx ?? 0] || units[0] || null;
}

/* 追求階段聊天畫面（讀持久化歷史；選項＝目前待回單元的 opts，所以隨對方話題變化、接得上） */
function renderPursuitChat(t) {
  const s = getSave();
  const aff = affOf(t.id); const stage = stageOf(aff);
  const hist = histOf(t.id);
  const bubbles = hist.map((m) => chatBubble(t, m)).join('');
  const unit = openUnit(t);

  let opts = ((unit && unit.opts) || []).map((o, i) => ({ ...o, _i: i }));
  const canConfess = aff >= 100 && tryMatch(t, s.owned);
  if (stage >= 3) {
    if (canConfess) opts.push({ label: '❤ 跟你告白：在一起吧', confess: true });
    else opts.push({ label: '❤ 想告白…（還需更深的關係或對方看上的行頭）', locked: true });
  }
  const optsHtml = opts.map((o, i) => {
    let dis = '', note = '';
    const c = resolveCost(o, t);
    if (c.amount > 0) { note = `<em>− ${fmt(c.amount)}</em>`; if (s.cash < c.amount) dis = 'disabled'; }
    if (o.gift) { const ok = o.gift.test(s.owned); note = `<em>送 ${o.gift.need}</em>`; if (!ok) { dis = 'disabled'; note = `<em class="lack">需 ${o.gift.need}</em>`; } }
    if (o.locked) dis = 'disabled';
    const cls = o.confess ? 'jd-opt confess' : 'jd-opt';
    return `<button class="${cls}" data-i="${i}" ${dis}>${o.label} ${note}</button>`;
  }).join('');

  const affPct = Math.min(100, aff);
  screen(`
    <div class="jd-app chat">
      <div class="jd-bar">
        <button class="scr-close" data-close-chat>‹</button>
        <div class="jd-chat-head"><img src="${asset(t.img)}" onerror="this.style.display='none'"/><div><b>${t.name}</b><span>${t.label}・${t.region}</span></div></div>
        <span class="jd-persona" title="你在乩der上的身分（千萬別讓對方知道你是乩身）">你：金乩國際 執行長</span>
      </div>
      <div class="jd-affbar"><i style="width:${affPct}%"></i><span>${STAGE_LABEL[stage]}・好感 ${affPct}%</span></div>
      <div class="jd-chatlog" id="jd-chatlog">${bubbles}</div>
      <div class="jd-opts">${optsHtml}</div>
    </div>`, (el) => {
    wireSelfies(el);
    el.querySelector('[data-close-chat]')?.addEventListener('click', () => openDatingScreen('friends'));
    scrollChatBottom(el);
    el.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => pickChatOpt(t, opts[+b.dataset.i], el)));
  });
}

function pickChatOpt(t, opt, el) {
  const s = getSave(); const d = ds();
  if (opt.locked) return;
  const c = resolveCost(opt, t);
  if (c.amount > 0) { if (s.cash < c.amount) return; s.cash -= c.amount; if (c.isScam) d.scamAsk[t.id] = (d.scamAsk[t.id] || 0) + 1; }
  if (opt.gift && !opt.gift.test(s.owned)) return;

  // 標記上一題已回，把你的回覆寫進歷史
  const h = histOf(t.id);
  const lastPrompt = h.findLast?.((m) => m.openPrompt); if (lastPrompt) delete lastPrompt.openPrompt;
  pushHist(t.id, { who: 'me', text: opt.label.replace(/\s*[−送需].*$/, '') });

  if (opt.confess) { persist(); return confessSuccess(t); }

  // 好感度：放慢推進，聊夠多輪才在一起。一般回話 +1；冷淡倒扣；送禮/花錢才明顯加成。
  let delta = opt.aff != null ? Math.sign(opt.aff) * Math.max(1, Math.round(Math.abs(opt.aff) / 2)) : 1;
  if (opt.aff === 0) delta = 0;
  if (c.amount > 0) delta += 4;
  if (opt.gift) delta += 8;
  d.aff[t.id] = Math.max(0, Math.min(120, affOf(t.id) + delta));
  // 連續冷淡計數：選到負好感累計，暖場/送禮歸零。連 3 次冷淡 → 對方心冷，提早壞結局收場。
  d.coldStreak[t.id] = (opt.aff != null && opt.aff < 0) ? (d.coldStreak[t.id] || 0) + 1 : 0;
  const coldOut = d.coldStreak[t.id] >= 3;
  persist();
  if (delta > 0) vibrate(12);

  // 先重繪（含你剛說的），鎖住選項、顯示「輸入中…」
  const cl = el?.querySelector('#jd-chatlog');
  const optsBox = el?.querySelector('.jd-opts'); if (optsBox) optsBox.innerHTML = '';
  if (cl) { cl.innerHTML = histOf(t.id).map((m) => chatBubble(t, m)).join(''); wireSelfies(el); scrollChatBottom(el); }
  const typingNode = el ? showTyping(el, t) : null;
  const delay = 700 + Math.floor(Math.random() * 1100);
  setTimeout(() => {
    typingNode?.remove();
    // ① 對方先「針對你選的」切題回應
    pushHist(t.id, { who: 'them', text: opt.reply || genericReply(opt) });
    if (opt.replyPic) pushHist(t.id, { who: 'them', text: '', pic: nextSelfie(t) });
    // ② 太冷淡收場 → 提早壞結局
    if (coldOut) { triggerDatingEnding(t); return; }
    // ③ 換下一個沒聊過的話題單元；整條故事線聊完 → 觸發結局（好/壞看當下狀態）
    if (!pushNextPrompt(t)) { triggerDatingEnding(t); return; }
    renderPursuitChat(t);
  }, delay);
}

/* 告白成功：正式在一起，仍可繼續日常聊天 */
function confessSuccess(t) {
  const d = ds(); const s = getSave();
  if (!d.partners.includes(t.id)) d.partners.push(t.id);
  d.score = (d.score || 0) + 1;
  // 記錄「告白成功」的好結局（供結局回顧）；好結局仍保留交往後無限聊
  if (!d.endings[t.id]) { const e = endingFor(t, { aff: affOf(t.id), matched: tryMatch(t, s.owned), confessed: true }); if (e) d.endings[t.id] = { ...e }; }
  // 清空追求期歷史，換成交往新篇章（避免舊提問殘留）
  d.history[t.id] = [];
  if (d.seen[t.id]) d.seen[t.id].pchat = [];
  pushHist(t.id, { who: 'them', text: (t.convo?.confessLine) || '好…我願意！我們在一起吧❤️', pic: nextSelfie(t) });
  const bubbles = histOf(t.id).map((m) => chatBubble(t, m)).join('');
  screen(`
    <div class="jd-app chat">
      <div class="jd-bar"><button class="scr-close" data-close-chat>‹</button><div class="jd-chat-head"><img src="${asset(t.img)}" onerror="this.style.display='none'"/><div><b>${t.name}</b><span>❤ 交往中</span></div></div><span></span></div>
      <div class="jd-chatlog">${bubbles}</div>
      <div class="jd-end good">💘 你和 ${t.name} 在一起了！（之後仍能在好友清單點進來聊）</div>
      <div class="jd-opts"><button class="jd-opt" data-back-fr>回好友清單</button><button class="jd-opt confess" data-keep>繼續聊</button></div>
    </div>`, (el) => {
    wireSelfies(el);
    el.querySelector('[data-close-chat]')?.addEventListener('click', () => openDatingScreen('friends'));
    el.querySelector('[data-back-fr]')?.addEventListener('click', () => openDatingScreen('friends'));
    el.querySelector('[data-keep]')?.addEventListener('click', () => openChat(t.id, true));
  });
  celebrate(false);
}

/* 結局畫面：聊天故事走完（或中途收場）後定格。顯示對話歷史 + 結局卡（好/壞/灰）。 */
function openDatingEnding(t) {
  const d = ds();
  const e = d.endings[t.id]; if (!e) return openChat(t.id);
  const hist = histOf(t.id);
  const bubbles = hist.map((m) => chatBubble(t, m)).join('');
  const tone = e.good === true ? 'good' : e.good === false ? 'bad' : 'gray';
  const headSub = e.good === true ? '❤ 結局・圓滿' : e.good === false ? '💔 結局' : '🤝 結局';
  screen(`
    <div class="jd-app chat ending ${tone}">
      <div class="jd-bar">
        <button class="scr-close" data-close-chat>‹</button>
        <div class="jd-chat-head"><img src="${asset(t.img)}" onerror="this.style.display='none'"/><div><b>${t.name}</b><span>${headSub}</span></div></div>
        <span class="jd-persona">你：金乩國際 執行長</span>
      </div>
      <div class="jd-chatlog" id="jd-chatlog">${bubbles}</div>
      <div class="jd-end-card ${tone}">
        <div class="jd-end-emoji">${e.emoji}</div>
        <div class="jd-end-title">${e.label}</div>
        <div class="jd-end-desc">${e.desc}</div>
      </div>
      <div class="jd-opts">
        <button class="jd-opt" data-back-fr>回好友清單</button>
        <button class="jd-opt" data-endings>看所有結局 ›</button>
      </div>
    </div>`, (el) => {
    wireSelfies(el);
    scrollChatBottom(el);
    el.querySelector('[data-close-chat]')?.addEventListener('click', () => openDatingScreen('friends'));
    el.querySelector('[data-back-fr]')?.addEventListener('click', () => openDatingScreen('friends'));
    el.querySelector('[data-endings]')?.addEventListener('click', () => openDatingEndings());
  });
  if (e.good) celebrate(false);
}

/* 結局總覽（結局簿）：整理所有人物已觸發的結局（好/壞/灰），未走完的標「命運未定」。 */
function openDatingEndings() {
  const d = ds();
  const rows = TARGETS.map((t) => {
    const e = d.endings[t.id];
    if (e) {
      const tone = e.good === true ? 'good' : e.good === false ? 'bad' : 'gray';
      return `<button class="dend-row ${tone}" data-open="${t.id}">
        <img class="dend-av" src="${asset(t.img)}" onerror="this.style.display='none'"/>
        <div class="dend-info"><b>${t.name}<small>${t.label}</small></b>
          <span class="dend-tag">${e.emoji} ${e.label}</span>
          <em>${e.desc}</em></div></button>`;
    }
    const met = d.accepted.includes(t.id) || d.liked.includes(t.id);
    return `<div class="dend-row pending"><img class="dend-av" src="${asset(t.img)}" onerror="this.style.display='none'"/>
      <div class="dend-info"><b>${t.name}<small>${t.label}</small></b>
        <span class="dend-tag">${met ? '⏳ 命運未定，還在你手上' : '— 還沒遇見'}</span></div></div>`;
  }).join('');
  const done = TARGETS.filter((t) => d.endings[t.id]).length;
  const good = TARGETS.filter((t) => d.endings[t.id]?.good === true).length;
  const bad = TARGETS.filter((t) => d.endings[t.id]?.good === false).length;
  screen(`
    <div class="jd-app endings-list">
      <div class="jd-bar"><button class="scr-close" data-close-chat>‹</button>
        <div class="jd-chat-head"><div><b>乩der 結局簿</b><span>已收 ${done}/${TARGETS.length}　💘${good}　💔${bad}</span></div></div><span></span></div>
      <div class="dend-scroll">${rows}</div>
    </div>`, (el) => {
    el.querySelector('[data-close-chat]')?.addEventListener('click', () => openDatingScreen('friends'));
    el.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => {
      const tt = TARGETS.find((x) => x.id === b.dataset.open); if (tt) openDatingEnding(tt);
    }));
  });
}

/* ════════ 交往後・切題無限聊 ════════
   每個話題單元：對方開頭一句 → 你三選一 → (輸入中…) → 對方針對你選的回應 → 換個話題。
   有時對方主動敲你（poke），地圖乩der圖釘會有紅點。 */
let partnerBusy = false; // 防連點：對方回應中時鎖住

const partnerPool = (t) => { const c = t.convo || FALLBACK_CONVO; return (c.partnerChats && c.partnerChats.length) ? c.partnerChats : FALLBACK_CONVO.partnerChats; };

function openPartnerChat(id, _fresh = true, openWith = null) {
  const t = TARGETS.find((x) => x.id === id); if (!t) return openDatingScreen('friends');
  const d = ds();
  d.pokes = (d.pokes || []).filter((x) => x !== id); persist(); // 進來就清掉這人的紅點
  partnerBusy = false;
  const pool = partnerPool(t);

  // 若沒有「待回的提問」，就產生一個新話題（被敲 openWith 優先）；否則延續上次未回的那題
  if (openWith != null || !lastIsOpenPrompt(id)) {
    const idx = openWith != null ? openWith : pickUnseenObj(id, 'pchat', pool).idx;
    const unit = pool[idx];
    pushHist(id, { who: 'them', text: unit.them, openPrompt: true, unitIdx: idx });
    if (unit.pic) pushHist(id, { who: 'them', text: '', pic: nextSelfie(t) });
  }
  renderPartnerChat(t);
}

function renderPartnerChat(t) {
  const s = getSave();
  const hist = histOf(t.id);
  const bubbles = hist.map((m) => chatBubble(t, m)).join('');
  // 找出目前待回的提問單元
  const last = hist[hist.length - 1];
  const openIdx = lastIsOpenPrompt(t.id) ? last.unitIdx : (hist.findLast?.((m) => m.openPrompt)?.unitIdx);
  const pool = partnerPool(t);
  const unit = pool[openIdx] || null;
  const optsHtml = unit
    ? (unit.opts || []).map((o, i) => {
      let dis = '', note = '';
      const c = resolveCost(o, t);
      if (c.amount > 0) { note = `<em>− ${fmt(c.amount)}</em>`; if (s.cash < c.amount) dis = 'disabled'; }
      if (o.gift) { const ok = o.gift.test(s.owned); note = `<em>送 ${o.gift.need}</em>`; if (!ok) { dis = 'disabled'; note = `<em class="lack">需 ${o.gift.need}</em>`; } }
      return `<button class="jd-opt" data-i="${i}" ${dis}>${o.label} ${note}</button>`;
    }).join('')
    : '<button class="jd-opt confess" data-next>換個話題聊 ›</button>';
  screen(`
    <div class="jd-app chat partner">
      <div class="jd-bar">
        <button class="scr-close" data-close-chat>‹</button>
        <div class="jd-chat-head"><img src="${asset(t.img)}" onerror="this.style.display='none'"/><div><b>${t.name}</b><span>❤ 交往中</span></div></div>
        <span class="jd-persona">你：金乩國際 執行長</span>
      </div>
      <div class="jd-chatlog" id="jd-chatlog">${bubbles}</div>
      <div class="jd-opts" id="jd-popts">${optsHtml}</div>
    </div>`, (el) => {
    wireSelfies(el);
    el.querySelector('[data-close-chat]')?.addEventListener('click', () => openDatingScreen('friends'));
    scrollChatBottom(el);
    if (unit) el.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => partnerReply(t, openIdx, +b.dataset.i, el)));
    el.querySelector('[data-next]')?.addEventListener('click', () => { partnerBusy = false; openPartnerChat(t.id); });
  });
}

function partnerReply(t, unitIdx, optIdx, el) {
  if (partnerBusy) return;
  const opt = partnerPool(t)[unitIdx]?.opts?.[optIdx]; if (!opt) return;
  const s = getSave(); const d = ds();
  const c = resolveCost(opt, t);
  if (c.amount > 0) { if (s.cash < c.amount) return; s.cash -= c.amount; if (c.isScam) d.scamAsk[t.id] = (d.scamAsk[t.id] || 0) + 1; persist(); }
  if (opt.gift && !opt.gift.test(s.owned)) return;
  partnerBusy = true;
  // 你的回覆寫進歷史；同時把上一則提問標記為「已回」（清掉 openPrompt）
  const h = histOf(t.id);
  const lastPrompt = h.findLast?.((m) => m.openPrompt); if (lastPrompt) delete lastPrompt.openPrompt;
  pushHist(t.id, { who: 'me', text: opt.label.replace(/\s*[−送需].*$/, '') });
  // 鎖住選項、顯示「輸入中…」
  const optsBox = el.querySelector('#jd-popts'); if (optsBox) optsBox.innerHTML = '';
  const cl = el.querySelector('#jd-chatlog');
  if (cl) { cl.innerHTML = histOf(t.id).map((m) => chatBubble(t, m)).join(''); wireSelfies(el); scrollChatBottom(el); }
  const typingNode = showTyping(el, t);
  const delay = 700 + Math.floor(Math.random() * 1300);
  setTimeout(() => {
    typingNode?.remove();
    pushHist(t.id, { who: 'them', text: opt.reply || '嗯嗯❤️' });
    if (opt.replyPic) pushHist(t.id, { who: 'them', text: '', pic: nextSelfie(t) });
    if (cl) { cl.innerHTML = histOf(t.id).map((m) => chatBubble(t, m)).join(''); wireSelfies(el); scrollChatBottom(el); }
    if (optsBox) {
      optsBox.innerHTML = '<button class="jd-opt confess" data-next>換個話題聊 ›</button><button class="jd-opt" data-back>回好友清單</button>';
      optsBox.querySelector('[data-next]').addEventListener('click', () => { partnerBusy = false; openPartnerChat(t.id); });
      optsBox.querySelector('[data-back]').addEventListener('click', () => openDatingScreen('friends'));
    }
    partnerBusy = false;
  }, delay);
}

/* ── 談崩後「對方已離開聊天」：可點進去看歷史與冷淡道別；若已被頂級行頭打動則提示回歸 ── */
function openGoneChat(id) {
  const t = TARGETS.find((x) => x.id === id); if (!t) return openDatingScreen('friends');
  const wooed = isClinger(t);
  const log = [
    { who: 'them', text: '（這段對話已經結束了。）' },
  ];
  const bubbles = log.map((m) => chatBubble(t, m)).join('');
  const footer = wooed
    ? '<div class="jd-opts"><button class="jd-opt cling" data-revive>🔥 對方又上線了…點開</button><button class="jd-opt" data-back-fr>回好友清單</button></div>'
    : '<div class="jd-opts"><button class="jd-opt" data-back-fr>回好友清單</button></div>';
  const note = wooed
    ? '<div class="jd-hint">對方最近一直看你的動態…似乎改變心意了。'
      + '<br><small>（你身上某件東西，讓他重新評估了你。）</small></div>'
    : '<div class="jd-hint gone">對方已離開聊天。<br><small>除非你有讓他「重新考慮」的本錢，否則他不會再回來。</small></div>';
  screen(`
    <div class="jd-app chat">
      <div class="jd-bar"><button class="scr-close" data-close-chat>‹</button><div class="jd-chat-head dim"><img src="${asset(t.img)}" onerror="this.style.display='none'"/><div><b>${t.name}</b><span>已離開聊天</span></div></div><span></span></div>
      <div class="jd-chatlog">${bubbles}</div>
      ${note}
      ${footer}
    </div>`, (el) => {
    el.querySelector('[data-close-chat]')?.addEventListener('click', () => openDatingScreen('friends'));
    el.querySelector('[data-back-fr]')?.addEventListener('click', () => openDatingScreen('friends'));
    el.querySelector('[data-revive]')?.addEventListener('click', () => openClingerChat(id));
  });
}

/* ── 黏人逆襲聊天：對方瘋狂倒貼、連珠炮、狂傳自拍，你不回他也黏 ── */
function openClingerChat(id, phase = 'enter') {
  const t = TARGETS.find((x) => x.id === id); if (!t) return openDatingScreen('friends');
  const d = ds();
  if (!d.clingers.includes(id)) d.clingers.push(id);
  // 若原本在 blocked，倒貼路線把他從「談崩」拉回可聊
  d.blocked = d.blocked.filter((x) => x !== id);
  if (!d.accepted.includes(id)) d.accepted.push(id);
  persist();

  const selfie = nextSelfie(t);
  // 依 phase 組訊息串：enter=回來開場+連發；ignored=你已讀不回後更黏
  const pick = (arr, n) => { const a = [...arr]; const out = []; for (let i = 0; i < n && a.length; i++) out.push(a.splice(Math.floor((i * 7 + 3) % a.length), 1)[0]); return out; };
  let stream;
  if (phase === 'ignored') {
    stream = [
      ...CLINGER_LINES.ignored.map((text) => ({ who: 'them', text })),
      { who: 'them', text: '', pic: selfie },
      ...pick(CLINGER_LINES.spam, 2).map((text) => ({ who: 'them', text })),
    ];
  } else {
    stream = [
      { who: 'them', text: R(CLINGER_LINES.comeback) },
      ...pick(CLINGER_LINES.spam, 3).map((text) => ({ who: 'them', text })),
      { who: 'them', text: '', pic: selfie }, // 誘惑圖
      ...pick(CLINGER_LINES.spam, 2).map((text) => ({ who: 'them', text })),
      { who: 'them', text: '', pic: selfie }, // 再一張
    ];
  }
  const bubbles = stream.map((m) => chatBubble(t, m)).join('');
  const opts = [
    `<button class="jd-opt" data-cling-ignore>已讀不回（看他繼續黏）</button>`,
    `<button class="jd-opt cling" data-cling-accept>回應一下（接受倒貼）</button>`,
  ].join('');
  screen(`
    <div class="jd-app chat cling">
      <div class="jd-bar"><button class="scr-close" data-close-chat>‹</button>
        <div class="jd-chat-head"><img src="${asset(t.img)}" onerror="this.style.display='none'"/><div><b>${t.name} 🔥</b><span>瘋狂倒貼中</span></div></div>
        <span class="jd-persona">你：金乩國際 執行長</span></div>
      <div class="jd-chatlog" id="jd-chatlog">${bubbles}</div>
      <div class="jd-opts">${opts}</div>
    </div>`, (el) => {
    wireSelfies(el);
    scrollChatBottom(el);
    el.querySelector('[data-close-chat]')?.addEventListener('click', () => openDatingScreen('friends'));
    el.querySelector('[data-cling-ignore]')?.addEventListener('click', () => openClingerChat(id, 'ignored'));
    el.querySelector('[data-cling-accept]')?.addEventListener('click', () => acceptClinger(t));
  });
}

function acceptClinger(t) {
  const d = ds();
  if (!d.partners.includes(t.id)) d.partners.push(t.id);
  d.clingers = d.clingers.filter((x) => x !== t.id);
  d.aff[t.id] = 100; // 倒貼成功＝好感拉滿
  d.score = (d.score || 0) + 1;
  d.history[t.id] = []; if (d.seen[t.id]) d.seen[t.id].pchat = [];
  pushHist(t.id, { who: 'them', text: CLINGER_LINES.reply });
  pushHist(t.id, { who: 'them', text: '', pic: nextSelfie(t) });
  const bubbles = histOf(t.id).map((m) => chatBubble(t, m)).join('');
  screen(`
    <div class="jd-app chat cling">
      <div class="jd-bar"><button class="scr-close" data-close-chat>‹</button><div class="jd-chat-head"><img src="${asset(t.img)}" onerror="this.style.display='none'"/><div><b>${t.name} 🔥</b><span>❤ 倒貼成功</span></div></div><span></span></div>
      <div class="jd-chatlog">${bubbles}</div>
      <div class="jd-end good">💘 你用一身行頭，把掉頭就走的 ${t.name} 變成死心塌地。這就是這個世界的規則。</div>
      <div class="jd-opts"><button class="jd-opt" data-back-fr>回好友清單</button><button class="jd-opt confess" data-keep>繼續聊</button></div>
    </div>`, (el) => {
    wireSelfies(el);
    el.querySelector('[data-close-chat]')?.addEventListener('click', () => openDatingScreen('friends'));
    el.querySelector('[data-back-fr]')?.addEventListener('click', () => openDatingScreen('friends'));
    el.querySelector('[data-keep]')?.addEventListener('click', () => openChat(t.id, true));
  });
  celebrate(false);
}

/* 黏人推播：談崩後過幾秒，對方「又上線」敲你 */
function scheduleClingerPing(t) {
  const delay = 3000 + Math.floor(Math.random() * 3000);
  setTimeout(() => {
    if (!isClinger(t)) return;
    pushClinger(t);
  }, delay);
}
function pushClinger(t) {
  let host = document.getElementById('jd-push');
  if (!host) { host = document.createElement('div'); host.id = 'jd-push'; document.body.appendChild(host); }
  const card = document.createElement('button');
  card.className = 'jd-push-card cling';
  card.innerHTML = `<div class="jd-push-ic">🔥</div><div class="jd-push-txt"><b>乩der</b><span>${t.name} 又上線了，瘋狂敲你 💬💬💬</span></div>`;
  card.addEventListener('click', () => { card.remove(); openClingerChat(t.id); });
  host.appendChild(card);
  requestAnimationFrame(() => card.classList.add('show'));
  setTimeout(() => { card.classList.remove('show'); setTimeout(() => card.remove(), 400); }, 6500);
  vibrate([40, 30, 40]);
}

/* 乩der 內的小彈窗容器 */
function jdModal() {
  let ov = document.getElementById('jd-modal-ov');
  if (!ov) { ov = document.createElement('div'); ov.id = 'jd-modal-ov'; document.body.appendChild(ov); }
  ov.className = 'jd-modal-ov show';
  return ov;
}
function closeJdModal() { const ov = document.getElementById('jd-modal-ov'); if (ov) { ov.classList.remove('show'); ov.innerHTML = ''; } }

/* ── styles ── */
function injectStyles() {
  if (document.getElementById('hub-styles')) return;
  const css = `
  #hub{position:fixed;inset:0;z-index:200;display:none;font-family:Iansui,serif;background:#070304}
  #hub.show{display:block}
  .map-scene{position:absolute;inset:0;overflow:hidden;display:flex;align-items:center;justify-content:center}
  /* 地圖板：滿版 cover 填滿整個畫面（不留黑邊、不縮成小塊）。3:4 圖在大多數直式手機上幾乎不裁切；
     桌機/寬螢幕會以高度為準置中，左右輕微裁切。圖釘座標已抓在中央安全區，裁切不影響對位。 */
  .map-board{position:absolute;inset:0;width:100%;height:100%;overflow:hidden}
  .map-bg{position:absolute;inset:0;background-size:cover;background-position:center;background-repeat:no-repeat;
    background-image:
    radial-gradient(circle at 52% 20%,rgba(150,40,40,.5),transparent 22%),
    radial-gradient(circle at 80% 62%,rgba(120,40,100,.5),transparent 20%),
    radial-gradient(circle at 80% 86%,rgba(110,40,90,.5),transparent 18%),
    radial-gradient(circle at 28% 80%,rgba(120,95,30,.45),transparent 20%),
    radial-gradient(circle at 36% 40%,rgba(120,90,30,.4),transparent 16%),
    linear-gradient(160deg,#3a1810,#0c0604 72%)}
  .map-bg.has-img{background-image:var(--map-img)}
  .map-haze{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 90px rgba(0,0,0,.55)}
  .map-hud{position:absolute;top:0;left:0;right:0;padding:14px 16px calc(8px + env(safe-area-inset-top));text-align:center;z-index:3}
  .map-wallet{display:flex;gap:8px;justify-content:center}
  .wchip{background:rgba(8,2,6,.7);backdrop-filter:blur(8px);border:1px solid rgba(201,162,39,.3);border-radius:99px;padding:6px 14px;font-size:10px;color:rgba(255,225,190,.7)}
  .wchip b{display:block;font-size:15px;color:#f4dd86;font-variant-numeric:tabular-nums}
  .wchip.danger{border-color:#c0392b}.wchip.danger b{color:#ff8a7a}
  /* 欠錢莊 chip 本身可點 → 進地下錢莊借/還錢（取代原本底部按鈕，比較直覺） */
  .wchip-loan{cursor:pointer;font-family:inherit;text-align:center;transition:transform .1s,border-color .2s,background .2s}
  .wchip-loan span{display:block}
  .wchip-loan:not(.danger){border-color:rgba(201,162,39,.55);background:rgba(40,20,6,.7)}
  .wchip-loan:hover{border-color:#ffd96a}
  .wchip-loan:active{transform:scale(.95)}
  .wchip-loan.danger{background:rgba(60,10,10,.75);animation:loanPulse 2.2s ease-in-out infinite}
  @keyframes loanPulse{50%{border-color:#ff5a4a;box-shadow:0 0 12px rgba(220,60,40,.5)}}
  .map-titlebar{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:8px;flex-wrap:wrap}
  .map-day{font-size:12px;color:rgba(255,225,190,.75);text-shadow:0 2px 8px #000}
  .biz-chip{font-size:12px;font-weight:800;color:#fff;padding:6px 14px;border-radius:99px;
    background:linear-gradient(135deg,#b80f1a,#5a0610);border:1px solid #ff7a5a;box-shadow:0 4px 14px rgba(0,0,0,.5);animation:skillGlow 1.8s ease-in-out infinite}
  @keyframes skillGlow{50%{box-shadow:0 4px 14px rgba(0,0,0,.5),0 0 16px rgba(255,90,40,.6)}}
  .map-pins{position:absolute;inset:0;z-index:2;pointer-events:none}
  .map-pin{pointer-events:auto}
  .map-pin{position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:4px;color:#fdf3e6;background:none;border:none;width:max-content}
  .pin-dot{width:clamp(40px,11vw,58px);aspect-ratio:1;border-radius:50%;display:flex;align-items:center;justify-content:center;
    background:radial-gradient(circle at 50% 38%,rgba(40,16,20,.92),rgba(10,2,6,.82));border:2px solid rgba(255,215,120,.7);
    box-shadow:0 6px 20px rgba(0,0,0,.7),0 0 0 5px rgba(201,162,39,.1);transition:transform .18s,box-shadow .18s;animation:pinFloat 3s ease-in-out infinite}
  .pin-icon{font-size:clamp(20px,5.5vw,28px);filter:drop-shadow(0 2px 6px rgba(0,0,0,.8))}
  .map-pin:active .pin-dot,.map-pin:hover .pin-dot{transform:scale(1.12);box-shadow:0 10px 30px rgba(0,0,0,.8),0 0 24px rgba(255,180,40,.5)}
  .pin-label{background:rgba(6,1,4,.85);border:1px solid rgba(201,162,39,.4);border-radius:10px;padding:3px 9px;text-align:center;backdrop-filter:blur(6px);box-shadow:0 4px 12px rgba(0,0,0,.5)}
  .pin-label b{display:block;font-size:clamp(12px,3.4vw,15px);color:#f4dd86;line-height:1.15}
  .pin-label small{font-size:clamp(8px,2.2vw,10px);color:rgba(255,225,190,.7)}
  .map-pin.primary .pin-dot{width:clamp(54px,15vw,76px);border-color:#ff7a5a;background:radial-gradient(circle at 50% 38%,#d4121f,#5a0610);
    box-shadow:0 10px 30px rgba(0,0,0,.8),0 0 30px rgba(255,60,40,.6);animation:pinFloat 3s ease-in-out infinite,pinPulse 1.8s ease-in-out infinite}
  .map-pin.primary .pin-icon{font-size:clamp(26px,7vw,36px)}
  .map-pin.primary .pin-label b{color:#fff}
  @keyframes pinFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  @keyframes pinPulse{0%,100%{box-shadow:0 10px 34px rgba(0,0,0,.7),0 0 24px rgba(255,60,40,.4)}50%{box-shadow:0 10px 34px rgba(0,0,0,.7),0 0 46px rgba(255,90,60,.7)}}
  .map-foot{position:absolute;left:0;right:0;bottom:0;padding:12px 16px calc(14px + env(safe-area-inset-bottom));display:flex;flex-direction:column;align-items:center;gap:8px;z-index:3;
    background:linear-gradient(180deg,transparent,rgba(4,1,3,.7))}
  .map-note{font-size:11px;color:rgba(255,225,190,.6)}
  .map-foot-btns{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
  .map-loan{padding:9px 18px;border-radius:99px;font-size:12px;font-weight:800;background:#c9a227;color:#1a0c06}
  .map-loan.ghost{background:rgba(255,255,255,.07);color:rgba(255,225,190,.7);border:1px solid rgba(201,162,39,.25)}
  .map-loan.biz{background:linear-gradient(135deg,#b80f1a,#5a0610);color:#fff;border:1px solid #ff7a5a}
  .map-reset{padding:9px 14px;border-radius:99px;font-size:11px;font-weight:700;background:rgba(255,255,255,.06);color:rgba(255,200,190,.7);border:1px solid rgba(255,120,90,.3)}
  .map-reset:active{transform:scale(.95)}
  /* 地圖圖釘紅點（乩der 對方敲你） */
  .pin-badge{position:absolute;top:-2px;right:-2px;min-width:20px;height:20px;border-radius:11px;background:#ff2b40;color:#fff;font-size:11px;font-weight:800;font-style:normal;display:flex;align-items:center;justify-content:center;padding:0 5px;box-shadow:0 0 0 2px #1a0c06,0 0 10px rgba(255,43,64,.8);animation:pinBadge 1.2s ease-in-out infinite;z-index:3}
  @keyframes pinBadge{50%{transform:scale(1.18)}}
  .pin-dot{position:relative}
  /* 清除紀錄確認 */
  .reset-ov{position:fixed;inset:0;z-index:700;display:none;align-items:center;justify-content:center;background:rgba(4,1,3,.86);backdrop-filter:blur(4px);padding:24px}
  .reset-ov.show{display:flex}
  .reset-card{max-width:340px;text-align:center;color:#fdf3e6;background:linear-gradient(180deg,#2a0a0e,#160608);border:1px solid rgba(255,120,90,.4);border-radius:20px;padding:24px 22px}
  .reset-ic{font-size:46px}
  .reset-card h3{font-size:20px;color:#ff8a6a;margin:6px 0}
  .reset-card p{font-size:13px;line-height:1.7;color:rgba(255,225,210,.85)}
  .reset-card p b{color:#ff6a5a}
  .reset-btns{display:flex;gap:10px;margin-top:16px}
  .reset-cancel{flex:1;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#fdf3e6;font-family:inherit;font-size:14px}
  .reset-go{flex:1.4;padding:12px;border-radius:12px;border:none;background:linear-gradient(135deg,#e0301a,#8a0a0a);color:#fff;font-weight:700;font-family:inherit;font-size:14px}
  .reset-go:active,.reset-cancel:active{transform:scale(.96)}
  /* 地下錢莊 */
  .loan-wrap{max-width:480px;margin:0 auto;width:100%;padding:6px 16px 30px;position:relative;z-index:1}
  .loan-card{background:rgba(40,8,10,.85);border:1px solid rgba(255,90,60,.4);border-radius:16px;padding:14px 16px;margin-bottom:12px}
  .loan-row{display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;font-size:13px;color:rgba(255,225,210,.85)}
  .loan-row b{color:#f4dd86}.loan-row b.bad{color:#ff7a6a}.loan-row b.warn{color:#ffb04a}
  .loan-warn{font-size:12px;line-height:1.7;color:#ff9a7a;background:rgba(120,20,10,.4);border-left:3px solid #ff5a3a;border-radius:0 8px 8px 0;padding:9px 12px;margin-bottom:12px}
  .loan-msg{text-align:center;font-size:13px;color:#ffd64d;padding:6px 12px 12px}
  .loan-sec-title{font-size:13px;color:#f4dd86;font-weight:800;margin:10px 0 8px}
  .loan-units{display:flex;gap:10px}
  .loan-unit{flex:1;padding:14px 8px;border-radius:14px;text-align:center;color:#fff;cursor:pointer;font-family:inherit;
    background:linear-gradient(160deg,rgba(150,20,28,.92),rgba(70,8,14,.92));border:1px solid #ff7a5a}
  .loan-unit:active{transform:scale(.95)}
  .loan-unit b{display:block;font-size:15px;color:#ffd64d}.loan-unit span{font-size:11px;color:rgba(255,225,190,.8)}
  .loan-unit.no{opacity:.4;filter:grayscale(.5);cursor:default}
  .loan-repay{display:flex;gap:10px}
  .loan-rp{flex:1;padding:13px 8px;border-radius:14px;font-size:13px;font-weight:700;color:#1a0c06;background:#c9a227;border:none;cursor:pointer;font-family:inherit}
  .loan-rp:active{transform:scale(.96)}
  .loan-rp[disabled]{opacity:.4;cursor:default}
  /* 乩天宮內部選單 */
  /* 升級樹 */
  .scr-cash{font-size:12px;color:#f4dd86}
  .up-summary{text-align:center;font-size:11.5px;color:#9fe6a0;padding:0 16px 10px;line-height:1.6;max-width:520px;margin:0 auto}
  /* ════════ 奇乩娛樂城（圖為主視覺，動畫做特效） ════════ */
  .scr-head.dark{background:linear-gradient(180deg,rgba(8,2,8,.9),transparent);position:relative;z-index:4}
  /* ── 大廳：縱深霓虹走道 ── */
  .cas-floor{position:relative;flex:1 1 auto;min-height:0;overflow:hidden;background:radial-gradient(120% 80% at 50% 8%,#3a0a28 0%,#16050e 45%,#070207 100%);perspective:760px;display:flex;flex-direction:column}
  .cas-far{position:absolute;top:0;left:0;right:0;height:46%;background-size:cover;background-position:center;opacity:0;transition:opacity .6s;
    -webkit-mask-image:linear-gradient(180deg,#000 40%,transparent);mask-image:linear-gradient(180deg,#000 40%,transparent)}
  .cas-far.has-img{opacity:.7}
  .cas-arch{position:relative;z-index:3;text-align:center;padding:14px 10px 6px}
  .cas-arch span{font-size:clamp(22px,7vw,34px);font-weight:900;color:#fff;letter-spacing:3px;text-shadow:0 0 10px #ff3d9a,0 0 24px #ff2d8a,0 0 46px #b026ff;animation:neonPulse 2.6s ease-in-out infinite}
  .cas-arch small{display:block;font-size:11px;color:rgba(255,210,235,.8);margin-top:5px;text-shadow:0 1px 4px #000}
  @keyframes neonPulse{50%{text-shadow:0 0 16px #ff7ac0,0 0 34px #ff2d8a,0 0 60px #d040ff;filter:brightness(1.15)}}
  .cas-lane{position:relative;z-index:3;flex:1 1 auto;display:grid;grid-template-columns:1fr 1fr;gap:14px;align-content:center;justify-items:center;
    padding:6px 18px 26px;max-width:560px;margin:0 auto;width:100%}
  /* hover 不改變盒模型（避免 3D/scroll 下游標進出抖動）：只做光暈與邊框，按下才微縮 */
  .cas-sign{position:relative;width:100%;border-radius:16px;overflow:hidden;border:1px solid rgba(255,90,170,.5);background:linear-gradient(165deg,rgba(60,12,46,.92),rgba(16,4,12,.95));
    box-shadow:0 10px 30px rgba(0,0,0,.55),0 0 22px rgba(255,40,130,.25) inset;transition:box-shadow .2s,border-color .2s,filter .2s;cursor:pointer;-webkit-tap-highlight-color:transparent}
  .cas-sign:hover{box-shadow:0 12px 38px rgba(0,0,0,.6),0 0 34px rgba(255,60,160,.55);border-color:rgba(255,140,200,.9);filter:brightness(1.08)}
  .cas-sign:active{transform:scale(.97);transition:transform .08s}
  .cas-sign-img{height:96px;background-size:cover;background-position:center;background-color:#1a0712;position:relative}
  .cas-sign-img:not(.has-img)::after{content:attr(data-emoji);position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:46px;filter:drop-shadow(0 0 12px rgba(255,120,200,.6))}
  .cas-sign-img::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(16,4,12,.92))}
  .cas-sign-neon{position:relative;text-align:center;font-size:16px;font-weight:800;color:#ffd64d;margin-top:-22px;text-shadow:0 0 10px rgba(255,180,60,.7),0 2px 6px #000;z-index:2}
  .cas-sign-tag{text-align:center;font-size:10.5px;color:rgba(255,205,235,.78);padding:3px 8px 10px;line-height:1.4}
  .cas-floorline{position:absolute;bottom:0;left:0;right:0;height:80px;z-index:1;
    background:linear-gradient(180deg,transparent,rgba(255,40,140,.16));border-top:1px solid rgba(255,80,170,.35)}
  .cas-smoke{position:absolute;z-index:2;width:140%;height:60%;left:-20%;bottom:-10%;pointer-events:none;
    background:radial-gradient(closest-side,rgba(180,40,255,.22),transparent 70%);filter:blur(8px);animation:casDrift 14s ease-in-out infinite}
  .cas-smoke.b{background:radial-gradient(closest-side,rgba(255,40,130,.2),transparent 70%);animation-duration:18s;animation-direction:reverse}
  @keyframes casDrift{50%{transform:translate(8%,-6%) scale(1.15)}}
  .cas-spark{position:absolute;bottom:-6px;width:4px;height:4px;border-radius:50%;background:#ffd66a;box-shadow:0 0 8px 2px rgba(255,200,80,.8);z-index:2;animation:casRise linear infinite}
  @keyframes casRise{0%{transform:translateY(0) scale(.6)}100%{transform:translateY(-86vh) scale(1.1);opacity:0}}

  /* ════ 設施內：生成場景圖＝整個房間（金碧輝煌、明亮），互動元素浮在其上 ════ */
  .cas-game-screen{position:relative;flex:1 1 auto;min-height:0;display:flex;flex-direction:column;overflow:hidden;
    background:radial-gradient(130% 100% at 50% 18%,#2a1404,#160a04 55%,#0a0402)}
  /* 場景圖鋪滿、夠亮：缺圖才用 emoji+暖金漸層 fallback，不再壓成全黑 */
  .cas-scene{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;transition:opacity .8s;transform:scale(1.04)}
  .cas-scene.has-img{opacity:1}
  .cas-scene:not(.has-img)::after{content:attr(data-emoji);position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
    font-size:clamp(90px,26vw,200px);opacity:.5;filter:drop-shadow(0 0 40px rgba(255,180,60,.6))}
  /* 暖金氛圍：頂部壓暗讓抬頭資訊可讀、中央透亮秀機台、底部加深托住籌碼盤 */
  .cas-scene-glow{position:absolute;inset:0;pointer-events:none;
    background:radial-gradient(70% 46% at 50% 40%,rgba(255,196,92,.20),transparent 60%),
      linear-gradient(180deg,rgba(10,4,2,.62) 0%,transparent 22%,transparent 50%,rgba(8,3,1,.72) 92%)}
  .cas-vignette{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 140px 30px rgba(0,0,0,.55)}
  .cas-game-screen>.cas-topbar,.cas-game-screen>.cas-play,.cas-game-screen>.cas-rail{position:relative;z-index:3}
  .cas-game-screen.flash-win{animation:casFlashWin .6s ease}
  .cas-game-screen.flash-lose{animation:casFlashLose .5s ease}
  @keyframes casFlashWin{0%{box-shadow:inset 0 0 0 2000px rgba(255,200,40,.0)}25%{box-shadow:inset 0 0 0 2000px rgba(255,200,40,.34)}100%{box-shadow:inset 0 0 0 2000px transparent}}
  @keyframes casFlashLose{0%{filter:none}30%{filter:grayscale(.7) brightness(.6)}100%{filter:none}}

  /* ── 浮動抬頭：透明描金，不是實心面板 ── */
  .cas-topbar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px 10px}
  .cas-back{font-size:13px;color:#ffe6ad;padding:7px 14px;border-radius:99px;background:rgba(20,8,4,.5);
    border:1px solid rgba(255,200,110,.35);backdrop-filter:blur(6px);text-shadow:0 1px 3px #000}
  .cas-back:active{transform:scale(.94)}
  .cas-title{display:flex;align-items:center;gap:7px;text-shadow:0 2px 6px #000,0 0 16px rgba(255,170,40,.55)}
  .cas-title-ic{font-size:20px}
  .cas-title b{font-size:clamp(17px,2.4vw,24px);font-weight:900;letter-spacing:1.5px;
    background:linear-gradient(180deg,#fff5d6,#ffcf66 55%,#caa033);-webkit-background-clip:text;background-clip:text;color:transparent}
  .cas-chip-bal{display:inline-flex;align-items:center;gap:5px;font-size:13px;font-weight:800;color:#1c0e02;
    padding:6px 13px 6px 9px;border-radius:99px;background:linear-gradient(180deg,#ffe9a8,#e9b94c 60%,#b07f23);
    border:1px solid #fff3cf;box-shadow:0 2px 8px rgba(0,0,0,.5),0 0 12px rgba(255,200,80,.4)}
  .cas-chip-bal i{font-style:normal;font-size:14px}

  /* ── 舞台：機台坐在「發光金台」上、置中、放大（電腦版盡量大） ── */
  .cas-play{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:4px 12px}
  .cas-plinth{position:relative;display:flex;align-items:center;justify-content:center;flex:0 1 auto}
  .cas-plinth-halo{position:absolute;left:50%;top:54%;transform:translate(-50%,-50%);width:118%;height:118%;border-radius:50%;
    background:radial-gradient(closest-side,rgba(255,206,96,.34),rgba(255,150,40,.12) 55%,transparent 72%);
    filter:blur(6px);pointer-events:none;animation:haloPulse 3.4s ease-in-out infinite}
  @keyframes haloPulse{50%{opacity:.7;transform:translate(-50%,-50%) scale(1.06)}}
  /* 機台尺寸：手機吃滿寬、桌機放大佔版（min 取 vh/vw 都大，max 給足） */
  .cas-stage{position:relative;display:flex;align-items:center;justify-content:center;
    width:min(86vw,560px);height:min(46vh,clamp(220px,40vw,460px))}
  .cas-result{text-align:center;font-size:clamp(14px,2vw,17px);font-weight:800;line-height:1.5;min-height:24px;
    color:#ffe6ad;text-shadow:0 1px 4px #000;padding:0 16px}
  .cas-result.win{color:#fff0bf;text-shadow:0 0 14px rgba(255,200,60,.75),0 1px 4px #000;animation:casPop .4s}
  .cas-result.lose{color:#ff9a9a;text-shadow:0 1px 4px #000}.cas-result.even{color:#e6dcc6}
  @keyframes casPop{0%{transform:scale(.7);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1)}}

  /* 轉盤：程式自繪 conic 8 扇區 + emoji 圖示（不生圖）。轉到哪格＝結果哪格 */
  .art-wheel-wrap{position:relative;width:min(82vw,40vh,400px);aspect-ratio:1}
  .art-wheel{position:absolute;inset:0;width:100%;height:100%;border-radius:50%;will-change:transform}
  .art-wheel-draw{position:absolute;inset:0;width:100%;height:100%;border-radius:50%;border:4px solid #ffd64d;box-shadow:0 0 18px rgba(255,180,60,.6),0 0 0 6px rgba(60,10,40,.6)}
  .wseg-label{position:absolute;inset:0;display:flex;justify-content:center;pointer-events:none}
  /* 文字放在扇區中心半徑處：用 padding-top 把內容推到上緣中段，再隨外層 rotate 對到該扇區 */
  .wseg-inner{display:flex;flex-direction:column;align-items:center;gap:1px;margin-top:10%;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.7)}
  .wseg-ic{font-size:clamp(15px,4.4vw,20px);line-height:1}
  .wseg-inner b{font-size:clamp(10px,2.8vw,13px);font-weight:800;color:#fff}
  .art-wheel-hub{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:30%;height:30%;border-radius:50%;background:radial-gradient(circle at 50% 38%,#ffe08a,#c9a227);border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-weight:900;color:#7a3a00;font-size:clamp(14px,4vw,20px);z-index:2}
  .art-wheel-wrap.spinning{filter:drop-shadow(0 0 26px rgba(255,180,60,.85))}
  .art-wheel-pin{position:absolute;top:-14px;left:50%;transform:translateX(-50%);color:#ff3030;font-size:30px;text-shadow:0 0 8px #fff,0 2px 4px #000;z-index:3}
  /* 轉盤對照表 */
  .wheel-legend{margin:0 16px 8px;text-align:center}
  .wleg-title{font-size:11px;color:rgba(255,225,190,.7);margin-bottom:6px}
  .wleg-foot{font-size:10px;color:rgba(255,225,190,.55);margin-top:8px;line-height:1.5;text-align:center;padding:0 6px}
  .wleg-row{display:flex;flex-wrap:wrap;justify-content:center;gap:6px}
  .wleg-item{display:inline-flex;align-items:center;gap:3px;font-size:11px;color:#fdf3e6;background:rgba(255,255,255,.06);border-left:3px solid var(--c,#888);border-radius:6px;padding:3px 8px}
  .wleg-item .wleg-ic{font-size:14px}
  .wleg-item b{color:#ffd64d}.wleg-item em{font-style:normal;color:rgba(255,225,190,.6);margin-left:2px}
  /* 老虎機對照表：每列一行，符號組合在前 */
  .wleg-row.slot{flex-direction:column;align-items:stretch;gap:5px;max-width:340px;margin:0 auto}
  .wleg-row.slot .wleg-item{justify-content:flex-start;gap:6px;border-left-color:#888}
  .wleg-row.slot .wleg-item.top{border-left-color:#ff3030;background:rgba(255,48,48,.12)}
  .wleg-row.slot .wleg-item.win{border-left-color:#ffd64d}
  .wleg-row.slot .wleg-item.lose{border-left-color:#555;opacity:.7}
  .wleg-combo{display:inline-flex;gap:2px;min-width:84px;flex:0 0 auto}
  .wleg-combo.none{color:#888;font-size:16px;min-width:84px;justify-content:center}
  /* 用 slot-strip.png 切片當小圖示（跟轉出來的圖一樣，不用 emoji）：裁切框內放整張 strip 的 img、上移到該格 */
  .slot-symic{position:relative;width:28px;height:28px;border-radius:5px;background-color:#0a0309;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;flex:0 0 auto}
  .slot-symic-img{width:100%;height:100%;object-fit:contain;display:none}
  .slot-symic.has-img .slot-symic-img{display:block}
  .slot-symic.has-img .slot-symic-fb{display:none}
  .slot-symic-fb{font-size:16px}
  .wleg-lab{flex:1;text-align:left;line-height:1.2}
  .wleg-lab small{display:block;font-size:9px;color:rgba(255,225,190,.5)}
  .wleg-row.slot .wleg-item em{margin-left:auto;flex:0 0 auto}

  /* 老虎機：窗高由 JS 設為「一個符號格高」(sizeSlotReels)，圖寬=滿輪、高度 auto 保持原比例不拉伸 */
  .art-slot{display:flex;gap:clamp(8px,2vw,14px);padding:clamp(10px,2.2vw,18px) clamp(14px,3vw,24px);border-radius:18px;background:linear-gradient(160deg,rgba(50,8,32,.95),rgba(16,4,12,.95));border:3px solid #ffd64d;box-shadow:0 0 32px rgba(255,200,60,.5),0 0 18px rgba(255,40,130,.4) inset;position:relative}
  .art-reel{width:min(24vw,18vh,128px);height:min(24vw,18vh,128px);overflow:hidden;border-radius:10px;background:#0a0309;border:1px solid rgba(255,160,60,.4)}
  .art-strip{position:relative;will-change:transform;line-height:0;display:flex;flex-direction:column}
  /* 每格＝正方，一張符號圖置中（停下保證在中央）；缺圖 fallback emoji 同樣置中 */
  .slot-cell{position:relative;width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;overflow:hidden}
  .slot-cell-img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:none}
  .slot-cell-img.has-img{display:block}
  .slot-cell:has(.slot-cell-img.has-img) .slot-cell-fb{display:none}
  .slot-cell-fb{font-size:min(14vw,11vh,76px);line-height:1}
  .art-slot-line{position:absolute;left:8px;right:8px;top:50%;height:2px;background:rgba(255,60,80,.7);box-shadow:0 0 8px #ff3050;z-index:2}

  /* 聖筊 */
  .art-jiao{display:flex;gap:clamp(24px,7vw,64px);align-items:center;justify-content:center}
  .art-jiao img,.jiao-fb{width:min(34vw,30vh,180px);height:auto;filter:drop-shadow(0 8px 14px rgba(0,0,0,.6))}
  .art-jiao img{display:none}.art-jiao img.has-img{display:block}.art-jiao img.has-img + .jiao-fb{display:none}
  .jiao-fb{font-size:min(30vw,26vh,150px);line-height:1}
  .art-jiao.tossing .a,.art-jiao.tossing .jiao-fb.a{animation:jiaoToss .5s ease-in-out 2}
  .art-jiao.tossing .b,.art-jiao.tossing .jiao-fb.b{animation:jiaoToss .5s ease-in-out 2 reverse}
  @keyframes jiaoToss{50%{transform:translateY(-44px) rotate(200deg)}}
  .landed{animation:jiaoLand .3s ease}
  @keyframes jiaoLand{0%{transform:translateY(-12px)}60%{transform:translateY(4px)}100%{transform:translateY(0)}}

  /* 黑骰問天：一個大骰盅裝三顆骰，搖大盅→揭大盅看三顆點數（骰子不轉） */
  .art-dice{display:flex;flex-direction:column;align-items:center;gap:clamp(4px,1.5vw,10px);width:100%}
  .dice-side{display:flex;flex-direction:column;align-items:center;gap:4px;width:100%}
  .dice-who{font-size:12px;font-weight:800;color:#ffe6ad;text-shadow:0 1px 3px #000;letter-spacing:1px}
  .dice-side.sky .dice-who{color:#ff9a9a}
  /* 舞台：三顆骰在底層，一個大盅蓋在上層 */
  .dice-stage{position:relative;display:inline-flex;align-items:center;justify-content:center}
  .dice-row{display:flex;gap:clamp(10px,4vw,24px);justify-content:center;align-items:center}
  .die{position:relative;width:min(20vw,15vh,96px);height:min(20vw,15vh,96px)}
  .svgdie{width:100%;height:100%}
  .svgdie .pip{fill:url(#pipG)}
  .die.trip .svgdie{filter:drop-shadow(0 0 16px rgba(255,210,80,.95))}
  /* 大骰盅(🥡 emoji)：絕對定位蓋住整列三顆骰（夠大才蓋得住全部）；搖動 = 抖；揭開 = 往上飛走淡出 */
  .dice-cup{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);z-index:2;
    font-size:min(68vw,46vh,330px);line-height:1;
    filter:drop-shadow(0 10px 16px rgba(0,0,0,.6));
    transition:transform .55s cubic-bezier(.3,.7,.25,1),opacity .55s ease}
  .dice-side.shaking .dice-cup{animation:cupShake .11s linear infinite}
  @keyframes cupShake{0%{transform:translate(calc(-50% - 7px),-50%) rotate(-5deg)}50%{transform:translate(calc(-50% + 8px),calc(-50% - 5px)) rotate(5deg)}100%{transform:translate(calc(-50% - 5px),-50%) rotate(-4deg)}}
  .dice-side.opened .dice-cup{transform:translate(-50%,-175%) rotate(-12deg) scale(.9);opacity:0;pointer-events:none}
  .dice-sum{font-size:14px;font-weight:800;color:#ffd96a;min-height:18px;text-shadow:0 1px 3px #000}
  .dice-vs{font-size:13px;font-weight:900;color:rgba(255,225,190,.6);letter-spacing:3px;margin:-2px 0}

  /* 大獎接管 */
  .cas-fx{position:fixed;inset:0;z-index:600;pointer-events:none;display:none}
  .cas-fx.show{display:block}
  .cas-jackpot{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
  .cas-jackpot-ray{position:absolute;width:200vmax;height:200vmax;background:conic-gradient(from 0deg,rgba(255,210,80,.5),transparent 12deg,rgba(255,210,80,.5) 24deg,transparent 36deg,rgba(255,210,80,.5) 48deg,transparent 60deg,rgba(255,210,80,.5) 72deg,transparent 84deg,rgba(255,210,80,.5) 96deg,transparent);animation:rayspin 1.9s linear;opacity:.6}
  @keyframes rayspin{from{transform:rotate(0)}to{transform:rotate(160deg)}}
  .cas-jackpot-txt{position:relative;font-size:clamp(38px,12vw,72px);font-weight:900;color:#fff;letter-spacing:2px;text-shadow:0 0 18px #ffb020,0 0 40px #ff7a00;animation:casPop .5s;text-align:center}
  .cas-jackpot-txt small{display:block;font-size:.5em;color:#ffd64d}

  /* ════ 底部：描金弧形霧面賭桌邊（不是分離方塊），托住一排籌碼 ════ */
  .cas-rail{position:relative;z-index:3;margin:0 auto;width:min(100%,720px);
    padding:14px clamp(14px,4vw,30px) calc(20px + env(safe-area-inset-bottom));
    border-radius:30px 30px 0 0;
    background:linear-gradient(180deg,rgba(46,24,8,.42),rgba(22,11,4,.78));
    border-top:1px solid rgba(255,206,110,.55);
    box-shadow:0 -10px 34px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,232,170,.35);
    backdrop-filter:blur(10px)}
  /* 上緣描金細線（賭桌包邊感） */
  .cas-rail::before{content:'';position:absolute;left:18px;right:18px;top:6px;height:1px;
    background:linear-gradient(90deg,transparent,rgba(255,214,120,.7),transparent)}
  /* 賠率說明：收進右上角 ⓘ，點了才從盤面升起浮層（不再常駐占版） */
  .cas-rail-odds{position:relative;display:flex;justify-content:flex-end;margin-bottom:10px}
  .cas-odds-btn{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:#ffe6ad;
    padding:5px 12px;border-radius:99px;background:rgba(20,8,4,.5);border:1px solid rgba(255,200,110,.4)}
  .cas-odds-btn i{font-style:normal;font-size:13px;opacity:.9}
  .cas-rail-odds.open .cas-odds-btn{background:linear-gradient(180deg,#ffe9a8,#d9a847);color:#1c0e02;border-color:#fff3cf}
  .cas-odds-pop{position:absolute;left:0;right:0;bottom:calc(100% + 8px);z-index:5;
    background:linear-gradient(180deg,rgba(30,16,6,.97),rgba(16,8,3,.98));border:1px solid rgba(255,206,110,.5);
    border-radius:16px;padding:12px 8px 14px;box-shadow:0 14px 40px rgba(0,0,0,.7);animation:oddsRise .22s ease}
  .cas-odds-pop[hidden]{display:none}
  @keyframes oddsRise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  /* 籌碼托盤：一排圓形描金籌碼，置中、可換行 */
  .cas-chips{display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-end;gap:clamp(10px,3vw,20px)}
  .cas-chips.busy{opacity:.5;pointer-events:none;filter:grayscale(.4)}
  /* 一枚圓籌碼：金邊＋虛線內圈＋面額。由小到大色階遞進 */
  .cas-chip{position:relative;width:clamp(74px,20vw,104px);aspect-ratio:1;border-radius:50%;cursor:pointer;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;color:#fff;
    background:radial-gradient(circle at 50% 34%,#7a1640,#4a0c26 64%,#2c0617);
    border:3px solid #ffd66a;box-shadow:0 6px 16px rgba(0,0,0,.55),0 0 14px rgba(255,180,60,.35),inset 0 0 0 5px rgba(255,255,255,.06);
    transition:transform .12s,box-shadow .2s;-webkit-tap-highlight-color:transparent}
  /* 內圈虛線（賭場籌碼刻痕） */
  .cas-chip::before{content:'';position:absolute;inset:9px;border-radius:50%;border:2px dashed rgba(255,224,150,.55)}
  .cas-chip:hover{box-shadow:0 8px 22px rgba(0,0,0,.6),0 0 22px rgba(255,200,80,.6)}
  .cas-chip:active{transform:scale(.92) translateY(2px)}
  .cas-chip.c1{background:radial-gradient(circle at 50% 34%,#1f5fa0,#103a6b 64%,#0a2240)}
  .cas-chip.c2{background:radial-gradient(circle at 50% 34%,#3a8a44,#1d5a2b 64%,#0f3318)}
  .cas-chip.c3{background:radial-gradient(circle at 50% 34%,#8a2bd0,#5a1690 64%,#330a55)}
  .cas-chip.c4{background:radial-gradient(circle at 50% 34%,#c9302c,#8a1410 64%,#500808);border-color:#ffe27a}
  .cas-chip-ic{font-size:clamp(20px,5.4vw,26px);line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}
  .cas-chip-name{font-size:clamp(11px,2.6vw,13px);font-weight:800;color:#ffe6ad;text-shadow:0 1px 2px #000}
  .cas-chip-amt{font-size:clamp(10px,2.4vw,12px);font-weight:700;color:#fff;text-shadow:0 1px 2px #000}
  .cas-chip.no{opacity:.34;filter:grayscale(.6);cursor:default;box-shadow:none}
  .cas-chip.no::before{border-color:rgba(255,255,255,.18)}
  .up-grid{display:flex;flex-direction:column;gap:10px;padding:0 14px 30px;max-width:520px;margin:0 auto;width:100%}
  .up-card{background:rgba(20,6,10,.6);border:1px solid rgba(201,162,39,.25);border-radius:16px;padding:12px 14px}
  .up-card.maxed{border-color:rgba(255,215,0,.5);box-shadow:0 0 16px rgba(255,215,0,.15)}
  .up-top{display:flex;gap:12px;align-items:center}
  .up-ico{font-size:30px}
  .up-info b{font-size:15px;color:#f4dd86}.up-info b small{font-size:10px;color:rgba(255,225,190,.5);font-weight:400}
  .up-desc{display:block;font-size:10.5px;color:rgba(255,225,190,.6);margin-top:2px;line-height:1.4}
  .up-eff{display:flex;justify-content:space-between;font-size:11px;color:rgba(255,225,190,.7);margin:8px 0}
  .up-eff .next{color:#9fe6a0}
  .up-buy{width:100%;padding:10px;border-radius:10px;font-size:13px;font-weight:800;background:linear-gradient(135deg,var(--gold),#b8860b);color:#1a0c06}
  .up-buy.no{background:rgba(255,255,255,.08);color:rgba(255,225,190,.4)}
  .up-buy.maxed{background:rgba(255,215,0,.15);color:#f4dd86}
  :root{--gold:#c9a227;--gold-l:#f4dd86;--god-glow-active:rgba(255,120,40,.4)}

  .hub-screen{position:fixed;inset:0;z-index:210;display:none;flex-direction:column;background:radial-gradient(ellipse at 50% 30%,rgba(24,8,12,.98),rgba(5,1,3,1));color:#fdf3e6;font-family:Iansui,serif;overflow-y:auto;-webkit-overflow-scrolling:touch}
  .hub-screen.show{display:flex}
  .hub-screen::-webkit-scrollbar{display:none}
  /* 畫面背景圖：固定鋪滿、半透明壓暗，內容浮在其上 */
  .scr-bg{position:fixed;inset:0;z-index:0;background-size:cover;background-position:center;opacity:0;transition:opacity .6s;pointer-events:none}
  .scr-bg.has-img{opacity:.32}
  .scr-bg.has-img::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,2,6,.55),rgba(5,1,3,.82))}
  .hub-screen>.scr-head,.hub-screen>.scr-stat,.hub-screen>.bcard-list,.hub-screen>.col-grid{position:relative;z-index:1}
  .scr-head{position:sticky;top:0;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;background:rgba(6,1,4,.9);backdrop-filter:blur(8px);z-index:2}
  .scr-head h2{font-size:18px;color:#f4dd86}
  .scr-close{font-size:14px;color:rgba(255,225,190,.8);padding:6px 12px;border-radius:99px;background:rgba(255,255,255,.06)}
  .scr-stat{text-align:center;font-size:12px;color:rgba(255,225,190,.7);padding:10px 16px}
  .empty{text-align:center;color:rgba(255,225,190,.5);padding:50px 20px;font-size:14px}

  .bcard-list{display:flex;flex-direction:column;gap:12px;padding:0 14px 30px;max-width:600px;margin:0 auto;width:100%}
  .bcard{display:flex;gap:14px;background:rgba(20,6,10,.6);border:1px solid rgba(201,162,39,.22);border-radius:18px;padding:14px;overflow:hidden;text-align:left;color:#fdf3e6;cursor:pointer;transition:transform .15s,border-color .15s}
  .bcard:hover{transform:translateY(-2px);border-color:#f4dd86}
  .bcard-img{width:104px;height:138px;flex-shrink:0;border-radius:14px;overflow:hidden;background:#0a0306}
  .bcard-img img{width:100%;height:100%;object-fit:cover;object-position:center top}
  .bcard-body{flex:1;min-width:0}
  .bcard-name{font-size:17px;color:#f4dd86}.bcard-name small{font-size:11px;color:rgba(255,225,190,.55);font-weight:400}
  .bcard-more{font-size:11px;color:rgba(255,215,120,.7);margin-top:6px}
  /* 信眾詳細 */
  .bd-wrap{padding:0 16px 36px;max-width:480px;margin:0 auto;width:100%}
  .bd-hero{width:100%;aspect-ratio:3/4;max-height:46vh;border-radius:16px;overflow:hidden;background:#0a0306;margin-bottom:10px}
  .bd-hero img{width:100%;height:100%;object-fit:cover;object-position:center top}
  .bd-id{font-size:18px;color:#f4dd86}.bd-id small{font-size:11px;color:rgba(255,225,190,.55)}
  .bd-ending{margin:10px 0;padding:10px 14px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(201,162,39,.25);font-size:14px;color:#f0d878}
  .bd-ending.good{color:#9fe6a0;border-color:rgba(120,220,140,.4)}.bd-ending.bad{color:#ff8a7a;border-color:rgba(255,120,100,.4)}
  .bd-ending small{color:rgba(255,225,190,.7);font-size:11px}
  .bd-bars{margin:12px 0}
  .bd-bar{display:flex;align-items:center;gap:8px;font-size:11px;color:rgba(255,225,190,.6);margin:5px 0}
  .bd-bar span{width:34px}.bd-bar i{height:7px;border-radius:99px;display:block}.bd-bar em{font-style:normal;font-variant-numeric:tabular-nums;width:26px;text-align:right}
  .bd-bar i.b-trust{background:#c9a227}.bd-bar i.b-wealth{background:#3fae6a}.bd-bar i.b-love{background:#e8638e}.bd-bar i.b-health{background:#4fb0d6}
  .bd-logtitle{font-size:13px;color:#f4dd86;margin:16px 0 10px;border-left:3px solid #c9a227;padding-left:8px}
  /* 「他一路被你引導」的時序故事：每段＝處境→你的建議→結果，左側時間線串起來 */
  .bd-beats{position:relative;padding-left:14px}
  .bd-beats::before{content:'';position:absolute;left:4px;top:6px;bottom:6px;width:2px;background:linear-gradient(180deg,rgba(201,162,39,.5),rgba(201,162,39,.1))}
  .bd-beat{position:relative;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.06);margin-bottom:10px}
  .bd-beat::before{content:'';position:absolute;left:-13px;top:14px;width:8px;height:8px;border-radius:50%;background:#c9a227;box-shadow:0 0 0 3px rgba(8,2,6,.9)}
  .bd-beat-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:5px}
  .bd-beat-head .bd-n{font-size:11px;color:rgba(255,215,120,.75);font-weight:700}
  .bd-kind{font-size:10px;padding:2px 8px;border-radius:99px;flex:none}
  .bd-kind.k-good{background:rgba(80,200,120,.16);color:#9fe6a0}
  .bd-kind.k-harm{background:rgba(255,120,60,.16);color:#ffb088}
  .bd-kind.k-scam{background:rgba(220,60,60,.18);color:#ff9a9a}
  .bd-kind.k-bull{background:rgba(180,120,255,.16);color:#d4b3ff}
  .bd-kind.k-neu{background:rgba(255,255,255,.08);color:rgba(255,235,205,.7)}
  .bd-ask{font-size:12.5px;color:#fbe6c8;line-height:1.55;margin-bottom:5px}
  .bd-ask.muted{color:rgba(255,225,190,.55);font-style:italic}
  .bd-advice{font-size:12.5px;color:#ffe6ad;line-height:1.55;padding:6px 9px;border-radius:8px;background:rgba(201,162,39,.1);margin-bottom:5px}
  .bd-advice b{color:#f4dd86}
  .bd-advice.muted{color:rgba(255,225,190,.6);background:rgba(255,255,255,.03)}
  .bd-outcome{font-size:12px;line-height:1.55;color:rgba(255,235,205,.82);padding-left:8px;border-left:2px solid rgba(255,255,255,.15)}
  .bd-outcome.k-good{border-left-color:#5ec888;color:#bfe8cc}
  .bd-outcome.k-harm{border-left-color:#ff8a4d;color:#ffcdb0}
  .bd-outcome.k-scam{border-left-color:#dc3c3c;color:#ffc2c2}
  .bd-outcome.k-bull{border-left-color:#b478ff;color:#dcc6ff}
  .bd-ending-cap{font-size:10px;letter-spacing:2px;color:rgba(255,225,190,.5);margin-bottom:4px}
  .bd-ending b{font-size:16px}
  .bd-ending.pending{color:rgba(255,225,190,.7)}
  .bcard-ending{font-size:12px;margin:4px 0;color:#f0d878}.bcard-ending small{display:block;font-size:10px;color:rgba(255,225,190,.6)}
  .bcard-ending.good{color:#9fe6a0}.bcard-ending.bad{color:#ff8a7a}
  .lbar{display:flex;align-items:center;gap:6px;font-size:9px;color:rgba(255,225,190,.5);margin-top:3px}
  .lbar span{width:28px;flex-shrink:0}
  .lbar i{height:5px;border-radius:99px;display:block;flex:none;background:#888}
  .lbar i.b-trust{background:#c9a227}.lbar i.b-wealth{background:#3fae6a}.lbar i.b-love{background:#e8638e}.lbar i.b-health{background:#4fb0d6}

  .col-grid{padding:0 14px 30px;max-width:620px;margin:0 auto;width:100%}
  .col-section{margin-bottom:16px}
  .col-sec-title{font-size:14px;color:#f4dd86;margin:0 2px 8px;border-left:3px solid #c9a227;padding-left:8px}
  .col-sec-title small{font-size:10px;color:rgba(255,225,190,.5);margin-left:6px}
  .col-cat{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:8px}
  .col-item{background:rgba(20,6,10,.6);border:1px solid rgba(201,162,39,.22);border-radius:12px;overflow:hidden;text-align:center}
  .col-img{aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:#0a0306;font-size:36px}
  .col-img img{width:100%;height:100%;object-fit:cover}
  .col-item{background:rgba(20,6,10,.6);border:1px solid rgba(201,162,39,.22);border-radius:12px;overflow:hidden;text-align:center;padding:0;cursor:pointer;transition:transform .15s,border-color .15s}
  .col-item:hover{transform:translateY(-3px);border-color:var(--gold-l)}
  .col-name{font-size:13px;color:#f4dd86;padding:6px 6px 0;line-height:1.3}
  .col-price{font-size:11px;color:rgba(255,225,190,.55);padding:0 6px 8px}
  .col-grid{max-width:760px}
  /* 品鑑頁：高級感 */
  .appraisal{position:fixed;inset:0;z-index:230;display:none;align-items:center;justify-content:center;padding:24px;
    background:radial-gradient(ellipse at 50% 40%,rgba(20,10,4,.9),rgba(2,1,0,.97));backdrop-filter:blur(8px);font-family:Iansui,serif}
  .appraisal.show{display:flex;animation:fadeUp .3s ease}
  .apr-card{position:relative;width:min(380px,92vw);background:linear-gradient(170deg,#1c130a,#0a0604);
    border:1px solid rgba(201,162,39,.5);border-radius:18px;padding:20px;text-align:center;
    box-shadow:0 0 60px rgba(255,180,40,.18),inset 0 1px 0 rgba(255,225,140,.12)}
  .apr-close{position:absolute;top:10px;right:12px;font-size:18px;color:rgba(255,225,190,.6);background:none;border:0}
  .apr-frame{padding:8px;border:1px solid rgba(201,162,39,.4);border-radius:14px;background:radial-gradient(circle at 50% 35%,rgba(60,40,16,.5),rgba(8,4,2,.6))}
  .apr-img{aspect-ratio:1;border-radius:10px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:64px;background:#0a0604}
  .apr-img img{width:100%;height:100%;object-fit:cover}
  .apr-seal{position:absolute;top:14px;left:14px;width:34px;height:34px;border-radius:6px;background:#b80f1a;color:#fff;
    display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;transform:rotate(-8deg);box-shadow:0 2px 8px rgba(0,0,0,.5)}
  .apr-name{font-size:20px;color:#f4dd86;margin-top:14px;letter-spacing:1px}
  .apr-price{font-size:12px;color:rgba(255,225,190,.7);margin:4px 0 12px}
  .apr-desc{font-size:13px;line-height:1.8;color:rgba(255,238,214,.92);text-align:left;
    border-top:1px solid rgba(201,162,39,.2);border-bottom:1px solid rgba(201,162,39,.2);padding:12px 0;margin-bottom:12px}
  .apr-irony{font-size:11px;color:#ff9a8a;line-height:1.6}

  /* ── 乩der 交友 App ── */
  .jd-app{display:flex;flex-direction:column;height:100%;max-width:480px;margin:0 auto;width:100%;background:linear-gradient(180deg,#1a0a14,#0c0508)}
  .jd-bar{display:flex;align-items:center;gap:10px;padding:10px 14px;flex:0 0 auto}
  .jd-bar .scr-close{font-size:22px;background:none;border:none;color:#ff7aa8;padding:2px 8px;cursor:pointer}
  .jd-logo{font-size:24px;font-weight:700;color:#ff4d8d;letter-spacing:-1px;text-shadow:0 0 14px rgba(255,77,141,.5)}
  .jd-logo span{color:#ffd54a}
  .jd-tabs{display:flex;gap:6px;margin-left:auto}
  .jd-tab{position:relative;font-size:13px;padding:7px 13px;border-radius:20px;border:1px solid rgba(255,122,168,.3);background:rgba(255,77,141,.08);color:#ffc9dc;cursor:pointer;font-family:inherit}
  .jd-tab.on{background:linear-gradient(135deg,#ff4d8d,#ff8a4d);color:#fff;border-color:transparent}
  .jd-badge{position:absolute;top:-6px;right:-4px;background:#ff3b3b;color:#fff;font-size:10px;min-width:16px;height:16px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-style:normal;padding:0 3px}
  .jd-body{flex:1 1 auto;display:flex;flex-direction:column;min-height:0;padding:6px 14px 16px}
  .jd-empty{margin:auto;text-align:center;color:#ffc9dc;font-size:15px;line-height:1.8}.jd-empty small{color:rgba(255,201,220,.6);font-size:12px}

  .jd-deck{flex:1 1 auto;position:relative;display:flex;align-items:stretch;min-height:0}
  .jd-card{position:relative;flex:1 1 auto;border-radius:20px;overflow:hidden;background:#160810;box-shadow:0 18px 50px rgba(0,0,0,.6);will-change:transform;touch-action:pan-y;cursor:grab}
  .jd-photo{position:absolute;inset:0}
  .jd-photo img{width:100%;height:100%;object-fit:cover;object-position:center top}
  .jd-photo.ph::after{content:'🔥';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:64px;background:#160810}
  .jd-grad{position:absolute;inset:0;background:linear-gradient(180deg,transparent 42%,rgba(8,3,6,.4) 66%,rgba(8,3,6,.96) 100%)}
  .jd-info{position:absolute;left:0;right:0;bottom:0;padding:16px 18px 18px}
  .jd-name{font-size:24px;font-weight:700;color:#fff}.jd-name span{font-size:18px;font-weight:400;opacity:.85}
  .jd-chip{display:inline-block;margin:6px 0 8px;font-size:12px;padding:3px 10px;border-radius:20px;background:var(--c,#888);color:#1a0a14;font-weight:700}
  .jd-bio{font-size:13.5px;color:#fbe6ee;line-height:1.6}
  .jd-stamp{position:absolute;top:26px;font-size:26px;font-weight:800;padding:5px 14px;border-radius:10px;border:3px solid;opacity:0;transition:opacity .12s;transform:rotate(-14deg)}
  .jd-stamp.like{left:18px;color:#4dff9e;border-color:#4dff9e;text-shadow:0 0 8px rgba(77,255,158,.5)}
  .jd-stamp.nope{right:18px;color:#ff5b7a;border-color:#ff5b7a;transform:rotate(14deg)}
  .jd-card.show-like .jd-stamp.like{opacity:1}.jd-card.show-nope .jd-stamp.nope{opacity:1}
  .jd-actions{flex:0 0 auto;display:flex;justify-content:center;gap:34px;padding:14px 0 4px}
  .jd-act{width:62px;height:62px;border-radius:50%;border:none;font-size:26px;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.5);transition:transform .12s}
  .jd-act:active{transform:scale(.88)}
  .jd-act.nope{background:#fff;color:#ff4d6a}.jd-act.like{background:linear-gradient(135deg,#ff4d8d,#ff7a4d);color:#fff;font-size:28px}
  .jd-count{flex:0 0 auto;text-align:center;font-size:11px;color:rgba(255,201,220,.55);padding-top:6px}

  /* 配對／打槍彈窗 */
  .jd-modal-ov{position:fixed;inset:0;z-index:520;display:none;align-items:center;justify-content:center;background:rgba(6,2,5,.82);backdrop-filter:blur(4px);padding:24px}
  .jd-modal-ov.show{display:flex}
  .jd-modal{width:100%;max-width:330px;text-align:center;color:#fff;background:linear-gradient(180deg,#2a0f1e,#16080f);border:1px solid rgba(255,122,168,.3);border-radius:22px;padding:26px 22px;animation:jdpop .3s cubic-bezier(.2,.9,.3,1.3)}
  @keyframes jdpop{from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}
  .jd-burst{font-size:52px;animation:jdbeat .9s ease-in-out infinite}
  @keyframes jdbeat{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
  .jd-modal h3{font-size:22px;margin:6px 0 4px;color:#ff7aa8}
  .jd-modal.match h3{background:linear-gradient(90deg,#ff4d8d,#ffd54a);-webkit-background-clip:text;background-clip:text;color:transparent}
  .jd-modal p{font-size:14px;color:#fbe6ee;margin:4px 0}
  .jd-modal-photo{width:96px;height:96px;border-radius:50%;overflow:hidden;margin:12px auto;border:3px solid #ff7aa8}
  .jd-modal-photo img{width:100%;height:100%;object-fit:cover;object-position:center top}
  .jd-line{font-size:15px;color:#ffd}.jd-soft{font-size:12px;color:rgba(255,201,220,.65);line-height:1.6}
  .jd-clue{margin:12px 0;padding:11px 13px;border-radius:12px;background:rgba(255,213,74,.1);border:1px solid rgba(255,213,74,.35);color:#ffe08a;font-size:13px;line-height:1.6;text-align:left}
  .jd-btn{margin-top:14px;width:100%;padding:13px;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;background:linear-gradient(135deg,#ff4d8d,#ff7a4d);color:#fff}
  .jd-btn.ghost{background:rgba(255,255,255,.1);color:#ffc9dc;border:1px solid rgba(255,122,168,.3)}

  /* 推播通知 */
  #jd-push{position:fixed;top:0;left:0;right:0;z-index:560;display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px;pointer-events:none}
  .jd-push-card{pointer-events:auto;display:flex;align-items:center;gap:12px;width:100%;max-width:380px;padding:12px 16px;border-radius:16px;background:rgba(28,12,20,.96);border:1px solid rgba(255,122,168,.4);box-shadow:0 10px 30px rgba(0,0,0,.5);color:#fff;cursor:pointer;transform:translateY(-130%);opacity:0;transition:transform .4s cubic-bezier(.2,.9,.3,1.2),opacity .4s;font-family:inherit;text-align:left}
  .jd-push-card.show{transform:translateY(0);opacity:1}
  .jd-push-ic{font-size:24px;flex:0 0 auto}
  .jd-push-txt{display:flex;flex-direction:column}.jd-push-txt b{font-size:13px;color:#ff7aa8}.jd-push-txt span{font-size:13px;color:#fbe6ee}

  /* 好友清單 */
  .jd-friends{display:flex;flex-direction:column;gap:9px;overflow-y:auto;padding-bottom:8px}
  .jd-fr{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:16px;background:rgba(255,77,141,.06);border:1px solid rgba(255,122,168,.18);text-align:left;color:#fdf3e6;font-family:inherit;cursor:pointer}
  .jd-fr[disabled]{opacity:.62;cursor:default}
  .jd-fr.live{border-color:rgba(255,122,168,.5);background:rgba(255,77,141,.13)}
  .jd-fr.ok{border-color:rgba(77,255,158,.4)}.jd-fr.bad{opacity:.5}
  .jd-fr.gone{opacity:.62}/* 談崩但仍可點進去看 */
  .jd-fr.cling{border-color:#ff5a2a;background:linear-gradient(100deg,rgba(255,90,42,.18),rgba(255,77,141,.14));box-shadow:0 0 18px rgba(255,90,42,.3);animation:clingGlow 1.6s ease-in-out infinite}
  @keyframes clingGlow{50%{box-shadow:0 0 26px rgba(255,90,42,.55)}}
  .jd-fr-img{position:relative;width:54px;height:54px;border-radius:50%;overflow:hidden;flex:0 0 auto;background:#160810}
  .jd-fr-img img{width:100%;height:100%;object-fit:cover;object-position:center top}
  .jd-fr-img.ph::after{content:'🔥';display:flex;align-items:center;justify-content:center;height:100%;font-size:24px}
  .jd-dot{position:absolute;right:2px;bottom:2px;width:12px;height:12px;border-radius:50%;background:#4dff9e;border:2px solid #16080f}
  .jd-dot.cling{background:#ff5a2a;animation:clingDot .8s ease-in-out infinite}
  @keyframes clingDot{50%{transform:scale(1.4)}}
  .jd-fr-name{font-size:15px;color:#ffd}.jd-fr-name small{font-size:11px;color:rgba(255,201,220,.6);margin-left:4px}
  .jd-fr-status{font-size:12px;color:#ff9ec0;margin-top:2px}
  .jd-fr.ok .jd-fr-status{color:#7dffb8}
  .jd-fr.gone .jd-fr-status{color:rgba(255,201,220,.5)}
  .jd-fr.cling .jd-fr-status{color:#ff8a4d;font-weight:700}
  /* 黏人聊天視覺：更躁、更暖 */
  .jd-app.chat.cling{background:linear-gradient(180deg,#1c0a08,#0a0407)}
  .jd-app.chat.cling .jd-chat-head b{color:#ff8a4d}
  .jd-hint{font-size:12px;line-height:1.7;color:#ffcf8a;text-align:center;padding:10px 16px;margin:4px 0}
  .jd-hint.gone{color:rgba(255,201,220,.55)}
  .jd-hint small{color:rgba(255,225,190,.55)}
  .jd-opt.cling{border-color:#ff5a2a;background:linear-gradient(135deg,#ff5a2a,#ff7a4d);color:#fff;font-weight:700}

  /* 聊天 */
  .jd-app.chat{background:linear-gradient(180deg,#160810,#0a0407)}
  .jd-chat-head{display:flex;align-items:center;gap:10px}
  .jd-chat-head img{width:38px;height:38px;border-radius:50%;object-fit:cover;object-position:center top;border:2px solid #ff7aa8}
  .jd-chat-head b{font-size:15px;color:#fff;display:block}.jd-chat-head span{font-size:11px;color:#ff9ec0}
  .jd-persona{margin-left:auto;font-size:10px;color:#ffd54a;border:1px solid rgba(255,213,74,.4);border-radius:20px;padding:3px 9px;white-space:nowrap;background:rgba(255,213,74,.08)}
  /* 好感度進度條 */
  .jd-affbar{position:relative;height:16px;margin:2px 14px 4px;border-radius:10px;background:rgba(255,255,255,.08);overflow:hidden;flex:0 0 auto}
  .jd-affbar i{position:absolute;inset:0;width:0;background:linear-gradient(90deg,#ff4d8d,#ff7a4d);transition:width .4s}
  .jd-affbar span{position:relative;z-index:1;display:block;text-align:center;font-size:10px;line-height:16px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.6)}
  .jd-opt.confess{border-color:#ff4d8d;background:linear-gradient(135deg,#ff4d8d,#c724a8);color:#fff;font-weight:800;justify-content:center}
  .jd-chatlog{flex:1 1 auto;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding:10px 4px}
  .jd-msg{display:flex;align-items:flex-end;gap:8px;max-width:84%}
  .jd-msg.them{align-self:flex-start}.jd-msg.me{align-self:flex-end;flex-direction:row-reverse}
  .jd-av{width:30px;height:30px;border-radius:50%;object-fit:cover;object-position:center top;flex:0 0 auto}
  .jd-bub{padding:11px 14px;border-radius:16px;font-size:14px;line-height:1.55}
  .jd-msg.them .jd-bub{background:rgba(255,255,255,.1);color:#fbe6ee;border-bottom-left-radius:5px}
  .jd-msg.me .jd-bub{background:linear-gradient(135deg,#ff4d8d,#ff7a4d);color:#fff;border-bottom-right-radius:5px}
  .jd-bub-stack{display:flex;flex-direction:column;gap:6px;align-items:flex-start}
  /* 「輸入中…」三點氣泡 */
  .jd-typing{display:flex;gap:4px;align-items:center;padding:13px 16px}
  .jd-typing i{width:7px;height:7px;border-radius:50%;background:rgba(255,225,240,.7);animation:jdtype 1.1s ease-in-out infinite}
  .jd-typing i:nth-child(2){animation-delay:.18s}.jd-typing i:nth-child(3){animation-delay:.36s}
  @keyframes jdtype{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-5px);opacity:1}}
  /* 自拍照泡泡 */
  .jd-bub.pic{padding:4px;overflow:hidden;width:clamp(150px,52vw,200px)}
  .jd-selfie{width:100%;border-radius:12px;display:none}
  .jd-selfie.has-img{display:block}
  .jd-pic-fb{display:flex;align-items:center;justify-content:center;min-height:120px;font-size:13px;color:rgba(255,225,240,.8);padding:14px}
  .jd-bub.pic .jd-selfie.has-img + .jd-pic-fb{display:none}
  .jd-bub.pic.noimg .jd-pic-fb{display:flex}
  /* 選項區「固定高度」：不論目前是 3 個、2 個、輸入中清空、或多一顆告白鈕，
     高度都不變 → 上方對話框高度恆定、不會跳動。內容超過(罕見 4 顆)時內部捲動。 */
  .jd-opts{flex:0 0 auto;height:clamp(168px,25vh,208px);display:flex;flex-direction:column;justify-content:flex-end;gap:8px;padding-top:10px;overflow-y:auto;scrollbar-width:none}
  .jd-opts::-webkit-scrollbar{display:none}
  .jd-opt{flex:0 0 auto;padding:13px 15px;border-radius:14px;border:1px solid rgba(255,122,168,.32);background:rgba(255,77,141,.08);color:#fff;font-size:14px;text-align:left;cursor:pointer;font-family:inherit;display:flex;justify-content:space-between;align-items:center;gap:8px}
  .jd-opt:active{transform:scale(.98)}
  .jd-opt[disabled]{opacity:.42;cursor:default}
  .jd-opt em{font-style:normal;font-size:12px;color:#ffd54a;flex:0 0 auto}
  .jd-opt em.lack{color:#ff8a8a}
  .jd-end{flex:0 0 auto;text-align:center;font-size:14px;line-height:1.7;padding:14px 16px;margin:8px 0;border-radius:14px}
  .jd-end.good{background:rgba(255,77,141,.14);border:1px solid rgba(255,122,168,.4);color:#ffd}
  .jd-end.bad{background:rgba(120,120,130,.12);border:1px solid rgba(180,180,190,.25);color:#cfc9d2}
  /* ── 結局卡（聊天故事走完後定格） ── */
  .jd-end-card{flex:0 0 auto;margin:6px 10px 4px;padding:16px 16px 18px;border-radius:18px;text-align:center;
    background:linear-gradient(180deg,rgba(40,18,28,.9),rgba(20,8,14,.95));border:1px solid rgba(255,255,255,.12);
    box-shadow:0 8px 28px rgba(0,0,0,.5)}
  .jd-end-card.good{background:linear-gradient(180deg,rgba(60,20,42,.92),rgba(28,8,20,.96));border-color:rgba(255,122,168,.55);box-shadow:0 8px 30px rgba(255,60,140,.25)}
  .jd-end-card.bad{background:linear-gradient(180deg,rgba(30,30,36,.92),rgba(14,14,18,.96));border-color:rgba(180,180,190,.3)}
  .jd-end-card.gray{background:linear-gradient(180deg,rgba(46,36,18,.92),rgba(22,16,8,.96));border-color:rgba(230,200,110,.4)}
  .jd-end-emoji{font-size:38px;line-height:1;margin-bottom:6px}
  .jd-end-title{font-size:18px;font-weight:900;letter-spacing:1px;margin-bottom:7px;
    background:linear-gradient(180deg,#fff0d6,#ffcf66);-webkit-background-clip:text;background-clip:text;color:transparent}
  .jd-end-card.bad .jd-end-title{background:linear-gradient(180deg,#e8e8ee,#b8b8c4);-webkit-background-clip:text;background-clip:text;color:transparent}
  .jd-end-desc{font-size:13px;line-height:1.7;color:rgba(255,236,222,.86)}
  /* 好友清單：已定格結局列 */
  .jd-fr.ended{opacity:.92}
  .jd-fr.ended.bad .jd-fr-status{color:#ff9a9a}
  .jd-fr.ended.gray .jd-fr-status{color:#ffd98a}
  .jd-endbook{width:100%;padding:13px 16px;margin-bottom:10px;border-radius:14px;font-size:14px;font-weight:800;
    color:#ffe6ad;background:linear-gradient(135deg,rgba(120,60,20,.5),rgba(40,18,8,.6));border:1px solid rgba(255,200,110,.45);text-align:left}
  /* ── 結局簿 ── */
  .endings-list{display:flex;flex-direction:column;height:100%}
  .dend-scroll{flex:1 1 auto;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding:8px 12px 24px}
  .dend-row{display:flex;gap:12px;align-items:flex-start;text-align:left;padding:12px;border-radius:16px;
    background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#fbe6ee;width:100%}
  .dend-row.good{border-color:rgba(255,122,168,.5);background:rgba(255,77,141,.09)}
  .dend-row.bad{border-color:rgba(180,180,190,.3);background:rgba(120,120,130,.08)}
  .dend-row.gray{border-color:rgba(230,200,110,.4);background:rgba(230,200,110,.07)}
  .dend-row.pending{opacity:.55}
  .dend-av{width:46px;height:46px;border-radius:12px;object-fit:cover;object-position:center top;flex:0 0 auto}
  .dend-info{display:flex;flex-direction:column;gap:3px;min-width:0}
  .dend-info b{font-size:15px;color:#fff;display:flex;align-items:center;gap:6px}
  .dend-info b small{font-size:10px;font-weight:400;color:rgba(255,225,190,.55)}
  .dend-tag{font-size:13px;font-weight:700;color:#ffd98a}
  .dend-row.bad .dend-tag{color:#ff9a9a}.dend-row.good .dend-tag{color:#ff9ec4}
  .dend-info em{font-style:normal;font-size:11.5px;line-height:1.55;color:rgba(255,236,222,.7)}
  `;
  const st = document.createElement('style'); st.id = 'hub-styles'; st.textContent = css; document.head.appendChild(st);
}
