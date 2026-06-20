import { applyBackgrounds, applyGodTheme, BG, spawnParticles, spawnScene } from './assets.js';
import { asset } from './asset.js';
import { genRoster, CHARACTERS } from './believers.js';
import { addBloodSplat, clearBlood, initBlood } from './blood.js';
import {
  PICK_N, R, RI, SCAN_LINES,
} from './content.js';
import { initGodFx, startGodFx, stopGodFx } from './godfx.js';
import { GODS, getGod } from './gods.js';
import { startPrep } from './prep.js';
import {
  addCash, bump, getSave, load, persist, resetSave, setRep,
} from './store.js';
import { tickLoan, debtEvent, owedAmount, hasLoan } from './loan.js';
import { PRODUCTS } from './shop.js';
import { tycoonReward, applyPayoutChain, scaleChance } from './windfall.js';
import {
  crowdSize, incenseGain, comboMultiplier, maxStamina, repDelta, repTitle, shiftOverhead,
} from './economy.js';
import { applyChoice, initLife, rollRevisit } from './life.js';
import { multipliers } from './upgrades.js';
import { activePerks } from './perks.js';
import { passiveOf, activesOf } from './skills.js';
import { initHub, openHub, openUpgradeScreen } from './hub.js';
import {
  ACHIEVEMENTS, genReplyOptions, getStage, ironyLines, judgePersona, PERSONAS, reactionLine,
} from './qa.js';
import { startRitual } from './rituals.js';

const $ = (id) => document.getElementById(id);
const phases = ['ph-start', 'ph-prep', 'ph-scan', 'ph-invoke', 'ph-serve', 'ph-exit'];
const stepNames = ['選神', '準備', '審查', '請神', '執務', '退駕'];
const stepSubs = [
  '選定神明，各自起駕儀式不同。',
  '依廟務清單完成降駕前準備。',
  '系統自動比對，心誠則靈。',
  '完成儀式後，長按請神並搖晃。',
  '元神降駕中，信眾請示於中央。',
  '值班結束，請結算香火。',
];

const freshScore = () => ({
  persona: { bold: 0, steady: 0, greedy: 0, bull: 0 },
  honest: 0, harm: 0, bull: 0, scam: 0,
  answers: 0, heckled: 0, lostFans: 0, burnout: false,
  incenseTotal: 0,
});

const state = {
  phase: 0,
  god: GODS[0],
  godIndex: 0,
  prepDone: {},
  prepCounts: {},
  ritualHits: 0,
  ritual: null,
  incense: 0,
  stable: 100,
  faith: 70,
  round: 0,
  maxRounds: RI(4, 6),
  believers: [],
  queue: [],
  current: null,
  stage: 0,
  curStage: null,
  eventsDone: new Set(),
  weakAura: false,
  score: freshScore(),
  startTime: 0,
  // ── 策略系統（每班重置）──
  combo: 0,
  mult: {}, // 升級乘數快取
  skill: { uses: 0, nextMult: 1, halfOverhead: false, shield: false, shiftMult: 1, drunk: false },
};

let shake = null;

// ph-invoke(3)/ph-serve(4) 是「鋪滿一頁、剛好 fit」的舞台，永遠不捲；其餘頁過長時才開放垂直捲動
const NO_SCROLL_PHASES = new Set([3, 4]);

function setPhase(i) {
  state.phase = i;
  phases.forEach((p, idx) => $(p).classList.toggle('active', idx === i));
  document.querySelectorAll('.step').forEach((el, idx) => el.classList.toggle('on', idx === i));
  $('hdr-sub').textContent = `${stepNames[i]} · ${stepSubs[i]}`;
  $('btn-start').classList.toggle('hidden', i !== 0);
  $('btn-prep-next').classList.toggle('hidden', i !== 1);
  document.body.classList.toggle('on-start', i === 0); // 選神頁隱藏右上統計，留給廟務經營
  document.body.classList.toggle('on-serve', i === 4); // 執務頁：頂部標題收簡、把空間讓給信眾圖
  if (i === 0) updateShiftCost(); // 選神頁顯示「本班起乩開銷」
  refreshScroll(); // 內容比畫面高時開放垂直捲動，避免下方按鈕點不到
}

/* 過長頁面才開放垂直捲動：量目前 active 頁內容是否超過可視高度，是就掛 .scrollable。
   舞台型頁（請神/執務）不捲。內容變動或視窗縮放後可再呼叫一次。 */
function refreshScroll() {
  const el = document.querySelector('.phase.active');
  if (!el) return;
  const idx = phases.indexOf(el.id);
  if (NO_SCROLL_PHASES.has(idx)) { el.classList.remove('scrollable'); return; }
  // 先量「不捲」時的自然高度，再決定要不要開捲動
  el.classList.remove('scrollable');
  requestAnimationFrame(() => {
    if (!el.classList.contains('active')) return;
    const overflowing = el.scrollHeight > el.clientHeight + 4;
    el.classList.toggle('scrollable', overflowing);
  });
}

/* 選神頁的「本班起乩開銷」提示：退駕結算時會從香火扣這筆固定開銷（隨名聲/天數成長） */
function updateShiftCost() {
  const el = $('shift-cost'); if (!el) return;
  const sv = getSave();
  const oh = Math.round(shiftOverhead(sv.rep, sv.day));
  el.innerHTML = `<span class="sc-ic">🪔</span>本班起乩開銷 <b>約 乩幣$${oh.toLocaleString()}</b><small>退駕結算時從香火扣（含廟租、油錢、人事）</small>`;
  updateShiftPerks();
}

/* 選神頁彙總「本班生效中的後宮加持」（攻略成功的伴侶提供，永久且可疊加） */
function updateShiftPerks() {
  const el = $('shift-perks'); if (!el) return;
  const perks = activePerks(getSave().dating?.partners || []);
  if (!perks.length) { el.innerHTML = ''; el.classList.remove('show'); return; }
  el.classList.add('show');
  el.innerHTML = `<div class="sp-head">💞 後宮加持・生效中 ${perks.length}</div>`
    + `<div class="sp-list">${perks.map((p) => `<span class="sp-chip" title="${p.blurb}">${p.title}</span>`).join('')}</div>`;
}

function vibrate(ms = 30) { if (navigator.vibrate) navigator.vibrate(ms); }

function screenShake(intensity = 1) {
  document.body.classList.add('shake-screen');
  document.body.style.setProperty('--shake-int', intensity);
  clearTimeout(screenShake._t);
  screenShake._t = setTimeout(() => document.body.classList.remove('shake-screen'), 240);
}

function setPossessionFx(god, entering = false) {
  document.body.classList.remove('fx-santaizi', 'fx-guan', 'fx-mazu', 'fx-jigong', 'fx-wangye');
  if (god?.possessionClass) document.body.classList.add(god.possessionClass);
  if (entering) showPossessionBurst(god);
}

function showPossessionBurst(god) {
  const burst = $('possession-burst');
  const line = R(god.entranceLines ?? [`${god.name}降駕！`]);
  burst.innerHTML = `<div class="burst-text">${line}</div>`;
  burst.classList.remove('show');
  void burst.offsetWidth;
  burst.classList.add('show');
  setTimeout(() => burst.classList.remove('show'), 2400);
}

/* ════════════════ 1 · God carousel (circular, swipe, transform) ════════════════ */
function renderCarousel() {
  const track = $('god-grid');
  track.innerHTML = GODS.map((g, i) => `
    <button type="button" class="god-card${g.landscape ? ' landscape' : ''}" data-god="${g.id}" data-i="${i}" aria-label="${g.name}">
      <div class="god-card-img">
        <div class="god-card-bg" style="background-image:url(${asset(g.image)})"></div>
        <img src="${asset(g.image)}" alt="${g.name}" loading="lazy" />
      </div>
      <div class="god-card-body">
        <b>${g.name}</b>
        <span>${g.title}</span>
        <small>${g.tagline}</small>
      </div>
    </button>`).join('');
  track.querySelectorAll('.god-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.i);
      if (i === state.godIndex) return;
      selectIndex(i);
    });
  });
  layoutCarousel();
  requestAnimationFrame(layoutCarousel); // re-measure once cards have real dimensions
  bindCarouselSwipe();
}

/* position each card relative to the centered one (circular).
   neighbours are spaced by the centre card's own width so they sit beside it,
   never overlapping, and the whole fan stays centred on the stage. */
function layoutCarousel() {
  const grid = $('god-grid');
  const cards = [...grid.querySelectorAll('.god-card')];
  const n = cards.length;
  if (!n) return;
  const cardW = cards[0].offsetWidth || (grid.clientHeight * 0.86 * 0.75) || 200;
  const step = cardW * 0.92; // gap between adjacent card centres → neighbours just clear the centre
  cards.forEach((card, i) => {
    let off = i - state.godIndex;
    if (off > n / 2) off -= n;
    if (off < -n / 2) off += n;
    const abs = Math.abs(off);
    const x = off * step;
    const scale = off === 0 ? 1 : Math.max(0.66, 0.82 - (abs - 1) * 0.09);
    const rot = off === 0 ? 0 : (off < 0 ? 16 : -16);
    card.style.marginLeft = `${-(card.offsetWidth || cardW) / 2}px`; // 置中於 left:50%（用未縮放寬度）
    card.style.transform = `translateX(${x}px) scale(${scale}) rotateY(${rot}deg)`;
    card.style.zIndex = String(50 - abs);
    card.style.opacity = abs > 2 ? '0' : String(1 - abs * 0.24);
    card.style.pointerEvents = abs > 2 ? 'none' : 'auto';
    card.classList.toggle('selected', off === 0);
  });
}

function selectIndex(i) {
  const n = GODS.length;
  state.godIndex = ((i % n) + n) % n;
  state.god = GODS[state.godIndex];
  applyGodTheme(state.god);
  layoutCarousel();
  updateGodDetail();
  $('btn-start').disabled = false;
  vibrate(10);
}
const nextGod = () => selectIndex(state.godIndex + 1);
const prevGod = () => selectIndex(state.godIndex - 1);

function bindCarouselSwipe() {
  const track = $('god-grid');
  if (track._swipeBound) return;
  track._swipeBound = true;
  window.addEventListener('resize', () => { if (state.phase === 0) layoutCarousel(); refreshScroll(); });
  window.addEventListener('orientationchange', () => setTimeout(refreshScroll, 200));
  let x0 = 0; let active = false;
  track.addEventListener('pointerdown', (e) => { active = true; x0 = e.clientX; });
  window.addEventListener('pointerup', (e) => {
    if (!active) return; active = false;
    const dx = e.clientX - x0;
    if (dx < -40) nextGod(); else if (dx > 40) prevGod();
  });
  // arrows
  $('god-prev')?.addEventListener('click', prevGod);
  $('god-next')?.addEventListener('click', nextGod);
  window.addEventListener('keydown', (e) => {
    if (state.phase !== 0) return;
    if (e.key === 'ArrowRight') nextGod();
    if (e.key === 'ArrowLeft') prevGod();
  });
}

function updateGodDetail() {
  const g = state.god;
  const sk = passiveOf(g.id); const acts = activesOf(g.id);
  const smalls = acts.filter((a) => !a.ult);
  const big = acts.find((a) => a.ult);
  $('god-detail-title').textContent = `${g.name} · ${g.title}`;
  $('god-detail-desc').innerHTML = `${g.tagline}。儀式：${g.ritual.label}。`
    + `<br><span class="god-skill">🔮 被動：${sk.name}｜${sk.desc}</span>`
    + `<br><span class="god-skill act">小招：${smalls.map((a) => `${a.icon}${a.name}`).join('、')}</span>`
    + (big ? `<br><span class="god-skill ult">${big.icon} 大招：${big.name}｜${big.desc.replace('【大招】', '')}</span>` : '');
  $('god-specialty').textContent = `擅長：${g.specialties.join('、')} ｜ 風格：${g.replyStyle}`;
}

/* ════════════════ Possession transitions ════════════════ */
function enterPossession() {
  applyBackgrounds(true);
  setPossessionFx(state.god, true);
  startGodFx(state.god);
  document.body.classList.add('entering', 'possessed');
  $('hdr-title').textContent = `${state.god.name}降駕中`;
  $('s-status').textContent = '降駕';
  spawnParticles($('particles'), state.god.particles, 56);
  spawnScene(state.believers, $('scene-objects'), $('believers'));
  vibrate([50, 30, 80, 50]);
  screenShake(2);
  setTimeout(() => document.body.classList.remove('entering'), 1000);
}

function exitPossessionImmediate() {
  applyBackgrounds(false);
  stopGodFx();
  document.body.classList.remove('possessed', 'entering', 'exiting-possession');
  document.body.classList.remove('fx-santaizi', 'fx-guan', 'fx-mazu', 'fx-jigong', 'fx-wangye');
  $('hdr-title').textContent = '乩身值班系統';
  $('s-status').textContent = '待機';
  $('particles').innerHTML = '';
  $('scene-objects').innerHTML = '';
  $('believers').innerHTML = '';
  $('exit-flash').classList.remove('show');
  $('exit-banner').classList.remove('show');
}

async function exitPossessionAnimated() {
  document.body.classList.add('exiting-possession');
  $('hdr-title').textContent = '元神退駕中';
  $('s-status').textContent = '退駕';
  $('exit-flash').classList.add('show');
  $('exit-banner').classList.add('show');
  vibrate([100, 60, 100, 40]);
  await new Promise((r) => setTimeout(r, 1600));
  exitPossessionImmediate();
}

const CHAR_COUNT = 16; // 每場洗一份信眾名冊（角色總數內）

/* ════════════════ 2 · Prep — 每步驟一個 canvas 小遊戲 ════════════════ */
let activePrep = null;
function renderPrep() {
  const g = state.god;
  state.prepDone = {};
  $('prep-title').textContent = `${g.name} · 降駕前準備`;
  const grid = $('prep-grid');
  grid.innerHTML = g.prep.map((item) => `
    <button type="button" class="prep-tile" data-prep="${item.id}">
      <span class="ico">${item.icon}</span>
      <span class="prep-label">${item.label}</span>
      <span class="prep-check">✓</span>
    </button>`).join('');
  grid.querySelectorAll('.prep-tile').forEach((tile) => {
    tile.addEventListener('click', () => openPrepGame(g.prep.find((p) => p.id === tile.dataset.prep), tile));
  });
  checkPrep();
  refreshScroll();
}

function openPrepGame(item, tile) {
  if (state.prepDone[item.id]) return;
  closePrepGame();
  const stage = $('prep-stage');
  stage.classList.add('show');
  stage.innerHTML = `
    <div class="prep-game-card">
      <canvas id="prep-canvas" class="prep-canvas"></canvas>
      <div class="prep-game-bar"><i id="prep-progress"></i></div>
      <button class="prep-close" id="prep-close">略過</button>
    </div>`;
  const canvas = $('prep-canvas');
  const bar = $('prep-progress');
  activePrep = startPrep(item, canvas, {
    accent: state.god.theme?.accent,
    onProgress: (p) => { if (bar) bar.style.width = `${Math.round(p * 100)}%`; },
    onDone: () => {
      state.prepDone[item.id] = true;
      tile.classList.add('done');
      vibrate(30);
      checkPrep();
      setTimeout(closePrepGame, 450);
    },
  });
  $('prep-close').addEventListener('click', () => {
    // 略過：直接視為完成（避免卡關），但不給「精準」感
    state.prepDone[item.id] = true; tile.classList.add('done'); checkPrep(); closePrepGame();
  });
}

function closePrepGame() {
  if (activePrep) { activePrep.destroy(); activePrep = null; }
  const stage = $('prep-stage');
  if (stage) { stage.classList.remove('show'); stage.innerHTML = ''; }
}

function checkPrep() {
  const ok = state.god.prep.every((p) => state.prepDone[p.id]);
  $('btn-prep-next').disabled = !ok;
}

/* ════════════════ 3 · Scan ════════════════ */
async function runScan() {
  setPhase(2);
  const list = $('scan-list');
  list.innerHTML = '';
  const lines = PICK_N([...SCAN_LINES, ...state.god.scanExtra], RI(7, 9));
  for (const fn of lines) {
    await new Promise((r) => setTimeout(r, RI(220, 380)));
    const d = document.createElement('div');
    d.className = 'scan-line';
    d.textContent = typeof fn === 'function' ? fn() : fn;
    list.appendChild(d);
    await new Promise((r) => setTimeout(r, 60));
    d.classList.add('done');
  }
  await new Promise((r) => setTimeout(r, 360));
  setPhase(3);
  setupRitual();
}

/* ════════════════ 4a · Ritual (physics mini-game) ════════════════ */
function setupRitual() {
  const r = state.god.ritual;
  state.ritualHits = 0;
  document.body.classList.remove('ritual-blood');
  $('invoke-phase').classList.add('hidden');
  const zone = $('ritual-zone');
  zone.classList.remove('hidden');
  zone.className = `ritual-zone ritual-${r.type}`;
  zone.innerHTML = `
    <p class="invoke-hint">${r.hint}</p>
    <canvas id="ritual-canvas" class="ritual-canvas"></canvas>
    <p class="ritual-feedback" id="ritual-feedback"></p>`;

  if (state.ritual) { state.ritual.destroy(); state.ritual = null; }
  const canvas = $('ritual-canvas');
  state.ritual = startRitual(r.mechanic, canvas, state.god, {
    onProgress: (done) => { state.ritualHits = done; state.score && (state.stats_ritual = done); },
    onFeedback: (q, line) => { const fb = $('ritual-feedback'); if (fb) { fb.textContent = line; fb.dataset.q = q; } },
    onPhysics: (kind, intensity, count) => ritualPhysics(kind, intensity, count),
    onComplete: () => {
      if (state.ritual) { state.ritual.destroy(); state.ritual = null; }
      $('ritual-zone').classList.add('hidden');
      $('invoke-phase').classList.remove('hidden');
      setupInvoke();
    },
  });
}

function ritualPhysics(kind, intensity, count) {
  if (kind === 'club') {
    document.body.classList.add('ritual-blood');
    addBloodSplat(count);
    screenShake(1 + count * 0.85 + intensity);
    vibrate([50, 25, 50, 25, 60]);
  } else if (kind === 'slap') {
    screenShake(0.8 + intensity);
    vibrate([35, 15, 35]);
  } else if (kind === 'slap-miss') {
    screenShake(0.5);
    vibrate(60);
  } else if (kind === 'bow') {
    screenShake(0.4);
    vibrate(18);
  } else if (kind === 'blocks') {
    screenShake(0.6);
    vibrate([30, 20, 30]);
  } else if (kind === 'blocks-miss') {
    screenShake(0.3);
  } else if (kind === 'incense') {
    // 點香：柔光，不震動（依使用者要求）
    screenShake(0.2);
  }
}

/* ════════════════ 4b · Invoke — whole-screen shake, fill = summon ════════════════ */
function cleanupInvoke() {
  if (!shake) return;
  shake.active = false;
  if (shake.raf) cancelAnimationFrame(shake.raf);
  document.body.classList.remove('invoke-shaking');
  document.body.style.removeProperty('--inv-x');
  document.body.style.removeProperty('--inv-y');
  $('invoke-btn').classList.remove('holding');
  $('invoke-ring').classList.remove('charging');
  if (shake.handlers) {
    const { btn, move, up } = shake.handlers;
    btn.removeEventListener('pointerdown', shake.handlers.down);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('keydown', shake.handlers.key);
  }
}

function setupInvoke() {
  const inv = state.god.invoke;
  state.weakAura = false;
  $('shake-fill').style.width = '0%';
  $('shake-status').textContent = '氣場強度：0%';
  $('invoke-btn').textContent = inv.label;

  const isTouch = 'ontouchstart' in window;
  $('invoke-hint').innerHTML = isTouch ? inv.hintMobile : inv.hintDesktop;

  const btn = $('invoke-btn');
  const ring = $('invoke-ring');
  const SHAKE_NEED = inv.shakeNeed;
  let summoned = false;

  shake = { active: false, total: 0, lastX: 0, lastY: 0, raf: 0, hasMoved: false };

  const setPct = () => {
    const pct = Math.min(100, Math.round((shake.total / SHAKE_NEED) * 100));
    $('shake-fill').style.width = `${pct}%`;
    $('shake-status').textContent = `氣場強度：${pct}%`;
    // whole-screen shake intensity grows with charge
    const k = (pct / 100) * 1.2;
    document.body.style.setProperty('--inv-x', `${(Math.random() - 0.5) * 14 * k}px`);
    document.body.style.setProperty('--inv-y', `${(Math.random() - 0.5) * 14 * k}px`);
    if (pct % 12 === 0 && pct > 0) vibrate(10);
    if (pct >= 100 && !summoned) { summoned = true; finishInvoke(); }
  };

  const down = (e) => {
    e.preventDefault();
    shake.active = true;
    shake.lastX = e.clientX ?? 0;
    shake.lastY = e.clientY ?? 0;
    btn.classList.add('holding');
    ring.classList.add('charging');
    document.body.classList.add('invoke-shaking');
    decay();
  };
  const move = (e) => {
    if (!shake.active) return;
    const x = e.clientX ?? shake.lastX;
    const y = e.clientY ?? shake.lastY;
    const mult = inv.chaotic ? 1.35 : inv.gentle ? 0.95 : 1;
    shake.total += (Math.abs(x - shake.lastX) + Math.abs(y - shake.lastY)) * mult;
    shake.lastX = x; shake.lastY = y;
    shake.hasMoved = true;
    setPct();
  };
  const up = () => {
    if (!shake.active) return;
    shake.active = false;
    btn.classList.remove('holding');
    ring.classList.remove('charging');
    document.body.classList.remove('invoke-shaking');
  };
  // device motion (phones): feed shake from accelerometer if granted
  const onMotion = (e) => {
    if (!shake.active) return;
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a) return;
    shake.total += (Math.abs(a.x || 0) + Math.abs(a.y || 0)) * 1.4;
    setPct();
  };
  window.addEventListener('devicemotion', onMotion);

  // gentle decay so you must keep shaking
  const decay = () => {
    if (!shake.active) { shake.raf = 0; return; }
    shake.total = Math.max(0, shake.total - SHAKE_NEED * 0.004);
    setPct();
    shake.raf = requestAnimationFrame(decay);
  };

  const key = (e) => {
    if (state.phase !== 3) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') {
      shake.total += inv.chaotic ? 60 : 42;
      if (!shake.active) { shake.active = true; btn.classList.add('holding'); ring.classList.add('charging'); document.body.classList.add('invoke-shaking'); decay(); }
      setPct();
      e.preventDefault();
    }
  };

  btn.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('keydown', key);
  shake.handlers = { btn, down, move, up, key, onMotion };
}

async function finishInvoke() {
  window.removeEventListener('devicemotion', shake?.handlers?.onMotion ?? (() => {}));
  cleanupInvoke();
  enterPossession();
  state.startTime = Date.now();
  state.round = 0;
  state.incense = 0; // 本班香火從零算（淨利結算才入帳）
  state.score = freshScore();
  state.combo = 0;
  state.ledger = []; // 本班逐項增減（事件/回訪），結算時對得上
  state.repBonus = 0; // 事件造成的名聲增減（結算併入）
  state._chanceThisShift = false; // 本班機會命運事件僅一次
  state._gainSamples = []; // 金幣雨門檻基準

  // ── 本班策略狀態：升級乘數 + 神明技能 ──
  state.mult = multipliers();
  state.stable = maxStamina(state.mult.staminaBonus);
  state.stableMax = state.stable;
  state.faith = RI(58, 72);
  const actives = activesOf(state.god.id);
  state.skill = {
    list: actives, uses: actives.map((a) => a.uses), // 每個技能各自剩餘次數
    nextMult: 1, halfOverhead: false, shield: false, shiftMult: 1, drunk: false,
    calm: false, comboLock: false, repNext: 1, critNext: 0, // 新增效果旗標
  };

  // 本班來幾位信眾由名聲 + 分壇升級決定
  state.maxRounds = crowdSize(getSave().rep, state.mult.crowdBonus);
  state.queue = PICK_N(state.believers, state.believers.length).slice(0, state.maxRounds + 2);
  renderSkillButton();
  updateMeters();
  await new Promise((r) => setTimeout(r, 1200));
  setPhase(4);
  nextRound();
}

/* 哪些技能效果「待命中」（給技能列顯示 ✦ 狀態）— 用 kind 判定 */
function skillArmed(a) {
  const sk = state.skill;
  switch (a.kind) {
    case 'nextAnswerMult': return sk.nextMult > 1;
    case 'nextCrit': return sk.critNext > 0;
    case 'allInNext': return sk.nextMult > 1;
    case 'drunk': return sk.drunk;
    case 'calm': return sk.calm;
    case 'comboLock': return sk.comboLock;
    case 'repNext': return sk.repNext > 1;
    case 'shield': return sk.shield;
    case 'halfOverhead': return sk.halfOverhead;
    case 'shiftMult': return sk.shiftMult > 1;
    default: return false;
  }
}

/* 技能效果的「一眼懂」短標籤（直接顯示在卡上，不靠 hover） */
function skillBrief(a) {
  switch (a.kind) {
    case 'nextAnswerMult': return `下筆香火 ×${a.value}`;
    case 'allInNext': return `下筆 ×${a.value}・元神 -${a.value2}`;
    case 'nextCrit': return `下筆必爆 ×${a.value}`;
    case 'refundStamina': return `回元神 +${a.value}`;
    case 'calm': return '下題不掉滿意';
    case 'comboLock': return '連段不中斷';
    case 'repNext': return `名聲 +${a.value}`;
    case 'halfOverhead': return '開銷減半';
    case 'shield': return '免鬧場掉粉';
    case 'shiftMult': return `結算香火 ×${a.value}`;
    case 'drunk': return '三選項都高香火';
    default: return a.desc || '';
  }
}

/* 神明技能列：3 小招 + 1 大招（效果直接寫在卡上） */
function renderSkillButton() {
  const bar = $('skill-bar');
  if (!bar) return;
  const list = state.skill.list || [];
  bar.innerHTML = list.map((a, i) => {
    const uses = state.skill.uses[i];
    const usable = uses > 0;
    const armed = skillArmed(a);
    return `<button class="sk-chip ${a.ult ? 'ult' : ''} ${!usable && !armed ? 'spent' : ''} ${armed ? 'armed' : ''}"
      data-skill="${i}" title="${a.desc}" ${usable ? '' : 'disabled'}>
      <span class="sk-ico">${a.icon}</span>
      <span class="sk-name">${a.name}</span>
      <span class="sk-eff">${skillBrief(a)}</span>
      <span class="sk-uses">${armed ? '✦ 待命中' : usable ? `可用 ×${uses}` : '已用完'}</span>
    </button>`;
  }).join('');
  bar.querySelectorAll('[data-skill]').forEach((b) => { b.onclick = () => castSkill(+b.dataset.skill); });
}

function castSkill(i) {
  const a = state.skill.list?.[i];
  if (!a || state.skill.uses[i] <= 0) return;
  state.skill.uses[i] -= 1;
  let toast = '';
  if (a.kind === 'nextAnswerMult') { state.skill.nextMult = Math.max(state.skill.nextMult, a.value); toast = `${a.name}！下一筆香火 ×${a.value}`; }
  else if (a.kind === 'allInNext') { state.skill.nextMult = Math.max(state.skill.nextMult, a.value); state.skill._allInDrain = a.value2; toast = `${a.name}！下一筆 ×${a.value}，但元神將大失`; }
  else if (a.kind === 'nextCrit') { state.skill.critNext = a.value; toast = `${a.name}！下一筆必爆 ×${a.value}`; }
  else if (a.kind === 'refundStamina') { state.stable = clampStable(state.stable + a.value); toast = `${a.name}！回復 ${a.value} 點元神`; updateMeters(); }
  else if (a.kind === 'calm') { state.skill.calm = true; toast = `${a.name}！下一題滿意度不會掉`; }
  else if (a.kind === 'comboLock') { state.skill.comboLock = true; toast = `${a.name}！本班連段不再中斷`; }
  else if (a.kind === 'repNext') { state.repBonus = (state.repBonus || 0) + (a.value || 2); toast = `${a.name}！本班名聲 +${a.value || 2}`; }
  else if (a.kind === 'halfOverhead') { state.skill.halfOverhead = true; toast = `${a.name}！本班廟務開銷減半`; }
  else if (a.kind === 'shield') { state.skill.shield = true; toast = `${a.name}！本班不會被鬧場、不掉粉`; }
  else if (a.kind === 'shiftMult') { state.skill.shiftMult = (state.skill.shiftMult || 1) * a.value; toast = `${a.name}！本班結算香火 ×${a.value}`; }
  else if (a.kind === 'drunk') { state.skill.drunk = true; toast = `${a.name}！下一題三選項都變高香火（元神狂掉）`; }
  vibrate(a.ult ? [60, 30, 90] : [40, 20, 60]);
  screenShake(a.ult ? 1.6 : 1.0);
  coinRain(a.ult ? 24 : 12, !!a.ult);
  const fx = $('reply-fx');
  if (fx) { fx.textContent = `${a.icon} ${toast}`; fx.classList.remove('show'); void fx.offsetWidth; fx.classList.add('show'); clearTimeout(fx._t); fx._t = setTimeout(() => fx.classList.remove('show'), 2600); }
  renderSkillButton();
}

/* ════════════════ 5 · Serve — QA game with 3 meters + chain consequences ════════════════ */
function updateMeters() {
  $('m-incense').textContent = state.incense.toLocaleString();
  $('m-stable').textContent = `${Math.round(state.stable)}%`;
  $('m-faith').textContent = `${Math.round(state.faith)}%`;
  $('mb-incense').style.width = `${Math.min(100, state.incense / 30)}%`;
  $('mb-stable').style.width = `${clamp(state.stable / (state.stableMax || 100) * 100)}%`;
  $('mb-faith').style.width = `${clamp(state.faith)}%`;
  $('mb-faith').classList.toggle('low', state.faith < 35);
  $('mb-stable').classList.toggle('low', state.stable < 35);
}
function clamp(v) { return Math.max(0, Math.min(100, v)); }
// 元神專用 clamp：上限是 state.stableMax（會被 staff 升級 / Hana 加持拉高到 >100）
function clampStable(v) { return Math.max(0, Math.min(state.stableMax || 100, v)); }

/* 帶來新的信眾（stage 0） */
function nextRound() {
  state.round += 1;
  if (state.round > state.maxRounds) { showExit(); return; }
  if (state.stable <= 12) { state.score.burnout = true; showExit(); return; }

  const b = state.queue.shift() ?? R(state.believers);
  state.current = b;
  state.stage = 0;

  // 回訪事件：曾被你影響過的信眾，這次可能帶著後果回來
  if (b.cid && state.round > 1 && !state.revisitsDone?.has(b.cid)) {
    const rv = rollRevisit(b.cid);
    if (rv) {
      (state.revisitsDone ??= new Set()).add(b.cid);
      return showRevisit(b, rv);
    }
  }

  const img = $('serve-img');
  img.classList.remove('show');
  img.src = asset(b.portrait);
  img.alt = b.name;
  img.onload = () => img.classList.add('show');
  if (img.complete) img.classList.add('show');

  const seen = b.cid && getSave().believers[b.cid];
  const life = b.cid ? initLife(b.cid) : null;
  $('ask-meta').innerHTML = `
    <span class="tag">${b.tag}</span>
    <span class="who">${b.name}（${b.age}）· ${b.archetypeLabel}</span>
    <span class="ask-mood">${seen ? `第 ${(life.visits || 0) + 1} 次來` : b.mood}</span>`;
  renderBelieverStats(life);

  showStage();
}

/* 問神期間顯示信眾人生數值（信任/財務/感情/健康小條）
   flash=true 時，與上次相比有變動的條會閃一下並顯示 +/- 數字。 */
let prevLife = null;
function renderBelieverStats(life, flash = false) {
  const box = $('believer-stats');
  if (!box) return;
  if (!life) { box.innerHTML = ''; prevLife = null; return; }
  const fields = [['信任', 'trust', 'b-trust'], ['財務', 'wealth', 'b-wealth'], ['感情', 'love', 'b-love'], ['健康', 'health', 'b-health']];
  box.innerHTML = fields.map(([label, key, cls]) => {
    const v = Math.round(life[key]);
    const d = flash && prevLife ? v - Math.round(prevLife[key]) : 0;
    const delta = d !== 0 ? `<em class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d}</em>` : '';
    return `<div class="bstat${d !== 0 ? ' changed' : ''}"><span>${label}${delta}</span><i class="${cls}" style="width:${v}%"></i></div>`;
  }).join('');
  prevLife = { ...life };
}

/* 顯示目前信眾的某一階段問題 + 三神諭 */
function showStage() {
  const b = state.current;
  const stage = getStage(b, state.stage);
  state.curStage = stage;
  b.stance = stage.stance;
  const crowdB = state.mult.crowdBonus || 0;
  $('round-label').textContent = `執務輪次 ${state.round} / ${state.maxRounds}　·　信眾 ${b.name}`
    + (crowdB ? `　·　分壇加成 +${crowdB} 人` : '');

  typeText($('ask-text'), stage.ask);
  $('ask-text').classList.remove('reaction');

  const grid = $('reply-grid');
  grid.innerHTML = '';
  const opts = genReplyOptions(state.god, b, stage.stance, stage.topic);
  opts.forEach((opt) => {
    const btn = document.createElement('button');
    btn.className = 'reply-btn';
    btn.innerHTML = `<span class="rl">${PERSONAS[opt.persona].emoji} ${opt.personaLabel}</span>${opt.text}`;
    btn.addEventListener('click', () => pickReply(opt, btn));
    grid.appendChild(btn);
  });
}

let typeTimer = 0;
function typeText(el, text) {
  clearInterval(typeTimer);
  el.textContent = '';
  let i = 0;
  typeTimer = setInterval(() => {
    el.textContent = text.slice(0, ++i);
    if (i >= text.length) clearInterval(typeTimer);
  }, 16);
}

function pickReply(opt, btn) {
  document.querySelectorAll('.reply-btn').forEach((b) => { b.disabled = true; });
  btn.classList.add('picked');

  const e = opt.effects;
  const passive = passiveOf(state.god.id);
  const perk = state.mult.perk || {}; // 後宮加持
  const isGood = opt.tags.includes('honest');
  // 林思涵「嘴甜文昌」：唬爛升級成好牌——會推進連段、還算進香火
  const bullPower = perk.bullPower && opt.tags.includes('bull');
  const countsAsGood = isGood || bullPower;
  // 坑錢(scam) 會中斷 combo；唬爛(bull) 是省力安全牌，不推進也不中斷
  const breaksCombo = opt.tags.includes('scam') && !opt.keepCombo;

  // ── combo：好答累積、坑錢歸零；唬爛保留現狀（兩派拉扯＋安全牌）──
  if (countsAsGood) {
    const rate = passive.comboRate || 1;
    state.combo += (rate >= 1.5 ? 2 : 1) + (perk.comboRateAdd || 0); // 三太子/Kevin 衝更快
  } else if (breaksCombo && !state.skill.comboLock) {
    state.combo = 0;
  } // 唬爛(keepCombo) 或 連段鎖(comboLock) → combo 不變
  const comboMult = comboMultiplier(state.combo, state.mult.comboCapBonus || 0);

  // ── 多乘數相乘的香火 ──
  // 唬爛被「嘴甜文昌」加持時，補一份香火點數（原本 bull 收入低）
  if (bullPower && (e.incense || 0) < 3) e.incense = 3;
  const godMult = (passive.incenseMult || 1) * (state.skill.nextMult || 1);
  // 技能「下一筆必爆」最優先；其次後宮 YUNA 常駐暴擊；再來神明被動方差
  const crit = state.skill.critNext > 0
    ? { chance: 1, mult: state.skill.critNext }
    : (perk.critChance > 0
      ? { chance: perk.critChance, mult: Math.max(perk.critMult || 1, passive.critMult || 1) }
      : (passive.variance ? { chance: passive.critChance, mult: passive.critMult } : null));
  const res = incenseGain(e.incense || 0, {
    rep: getSave().rep,
    incenseMult: state.mult.incenseMult || 1,
    godMult,
    comboMult,
    vipChance: state.mult.vipChance || 0,
    crit,
  });
  state.skill.nextMult = 1; // 倍率技只作用一次
  state.skill.critNext = 0; // 爆擊技只作用一次
  renderSkillButton(); // 清掉「待命」標示
  const incGain = res.gain;
  state.incense += incGain;
  state.score.incenseTotal += Math.max(0, incGain);
  state.lastCrit = res.crit;
  if (incGain > 0) spawnCoins(incGain, res.crit); // 賺乩幣：醒目錢特效

  const faithMul = passive.faithPenalty || 1; // 王爺滿意更難拉
  // 定神(calm)：本題若滿意度會掉，擋掉這次下降（正向加成照常）
  let faithDelta = (e.faith || 0) * 6 * (e.faith > 0 ? faithMul : 1);
  if (faithDelta > 0) faithDelta *= (perk.faithGainMul || 1); // 凜・神級應援：滿意正成長加倍
  if (state.skill.calm && faithDelta < 0) faithDelta = 0;
  state.skill.calm = false;
  state.faith = clamp(state.faith + faithDelta);
  if (perk.faithFloor) state.faith = Math.max(state.faith, perk.faithFloor); // 滿意度地板：跌不破
  const drain = (state.skill.drunk ? 3 : 1) * (passive.staminaDrain || 1);
  state.skill.drunk = false;
  const allIn = state.skill._allInDrain || 0; state.skill._allInDrain = 0; // 大招額外耗元神
  // Hana・仙丹：每答回元神，抵銷甚至倒灌耗損 → 元神永動
  state.stable = clampStable(state.stable + (e.stable || 0) * 5 - RI(1, 3) * drain - allIn + (perk.staminaRegen || 0));
  updateComboHud();

  state.score.persona[opt.persona] += 1;
  state.score.answers += 1;
  if (opt.tags.includes('honest')) state.score.honest += 1;
  if (opt.tags.includes('harm')) state.score.harm += 1;
  if (opt.tags.includes('bull')) state.score.bull += 1;
  if (opt.tags.includes('scam')) state.score.scam += 1;

  // 改變這位信眾的人生（持久累積）+ 即時更新畫面上的數值條
  let tycoonWin = null;
  if (state.current?.cid) {
    const before = getSave().believers[state.current.cid]?.endingId || null;
    const life = applyChoice(state.current, opt, state.curStage?.stance, {
      ask: state.curStage?.ask || '',
      visit: (getSave().believers[state.current.cid]?.visits || 0),
    });
    renderBelieverStats(life, true);
    // 富信眾「最終好結局」剛剛達成 → 謝神巨獻（被動爆發鏈的主要來源）
    const GOOD = ['rich', 'wedding', 'healed'];
    if (!before && life.endingId && GOOD.includes(life.endingId)) {
      const ch = CHARACTERS.find((c) => c.id === state.current.cid);
      const repReq = ch?.repReq || 0;
      if (repReq >= 30) tycoonWin = { ch, repReq, comboMult }; // 仕紳級以上才觸發巨獻
    }
  }

  updateMeters();
  vibrate(35);
  showReplyFx(opt);

  const stage = state.curStage;
  const reaction = reactionLine(state.current, state.stage, opt.persona);
  const hasNext = stage.hasStory && !stage.last;

  const advanceCore = () => {
    if (state.stable <= 12) { state.score.burnout = true; showExit(); return; }
    if (hasNext) { state.stage += 1; maybeChainEvent(() => showStage()); }
    else maybeChainEvent(() => nextRound());
  };
  // 富信眾巨獻：先播謝神巨獻事件（會乘上當下的爆發鏈），點繼續再推進
  const advance = tycoonWin ? () => showTycoonWindfall(tycoonWin, advanceCore) : advanceCore;

  // 顯示「信眾對你選擇的反應」→ 要點一下才繼續（不再自動跳、字看得完）
  setTimeout(() => {
    if (reaction) {
      $('reply-grid').innerHTML = '';
      $('ask-text').classList.add('reaction');
      typeText($('ask-text'), `${state.current.name}：${reaction}`);
      waitTap(advance);
    } else {
      setTimeout(advance, RI(500, 800));
    }
  }, 600);
}

/* 富信眾「最終好結局」謝神巨獻：金額隨身價縮放，再乘上當下的爆發鏈（連段×神技×身價×VIP）。
   全條件完美結合才摸得到一班一億——極難奇蹟。 */
function showTycoonWindfall(win, done) {
  const save = getSave();
  const base = tycoonReward(save, win.repReq); // 已含名聲×身價×權貴權重縮放
  // 爆發鏈：用「當下」的連段倍率 + 生效中的神技倍率 + VIP 命中 + 名聲大方度
  const skillMult = Math.max(state.skill.nextMult || 1, state.skill.shiftMult || 1);
  const vipHit = Math.random() < (state.mult.vipChance || 0);
  const { amount, parts } = applyPayoutChain(base, {
    comboMult: win.comboMult || 1, godMult: skillMult, vipHit, rep: save.rep,
  });
  // 入帳（走本班記帳，結算才入袋，與其他事件一致）
  logEvent(`${win.ch.name}・謝神巨獻`, amount, 0);
  state.skill.nextMult = 1; renderSkillButton(); // 神技倍率被這筆吃掉（時機用對才有）

  const big = amount >= 5_000_000;
  const chainTxt = parts.length ? `<div class="revisit-why">爆發鏈：${parts.join(' × ')}</div>` : '';
  const ov = $('event-overlay');
  $('evt-title').textContent = `💰 ${win.ch.name} 謝神巨獻`;
  $('evt-body').innerHTML = `<div class="finale-body">${win.ch.name}（${win.ch.label}）在你的指點下走上人生巔峰，`
    + `帶著一卡車的香火回來謝神。<br>「師父，這點心意，您一定要收下！」</div>`
    + `<div class="revisit-line">💰 香火 +乩幣$${amount.toLocaleString()}</div>${chainTxt}`;
  const btns = $('evt-btns'); btns.innerHTML = '';
  const b = document.createElement('button'); b.className = 'evt-primary'; b.textContent = '笑納（神明會懂）';
  b.addEventListener('click', () => { ov.classList.remove('show'); done?.(); });
  btns.appendChild(b);
  ov.classList.add('show');
  coinRain(big ? 60 : 34, big); screenShake(big ? 2.2 : 1.4); vibrate([60, 30, 90]);
  try { window.__casinoWin?.(big); } catch { /* noop */ }
}

/* 在執務區顯示「點一下繼續」並等待點擊；點了才呼叫 cb。
   ⚠️ 為什麼這樣寫：信眾反應後選項會清空，舊版只在底部放一條小提示，
   手機上常被誤以為卡住。改成「在原本選項位置補一顆明顯的整排繼續鈕」，
   點該鈕、底部提示、或畫面任一處皆可推進，確保一定點得到。 */
function waitTap(cb) {
  let done = false;
  const hint = $('tap-continue');
  const grid = $('reply-grid');
  // 在選項區放一顆顯眼的整排「繼續」鈕（選項剛被清空，這裡正是手指預期的位置）
  let contBtn = null;
  if (grid) {
    grid.innerHTML = '';
    contBtn = document.createElement('button');
    contBtn.className = 'reply-btn continue-btn';
    contBtn.innerHTML = '<span class="rl">▸ 點此繼續</span>聽聽信眾怎麼說 ⋯⋯';
    grid.appendChild(contBtn);
  }
  if (hint) hint.classList.add('show');

  const go = (e) => {
    if (done) return;
    done = true;
    e?.stopPropagation();
    if (hint) hint.classList.remove('show');
    document.removeEventListener('pointerdown', go, true);
    cb();
  };
  // 繼續鈕可立即點；整頁點擊給打字機一點時間再開放，避免手滑略過
  contBtn?.addEventListener('click', go);
  setTimeout(() => { if (!done) document.addEventListener('pointerdown', go, true); }, 350);
}

function showReplyFx(opt) {
  const fx = [];
  if (state.lastCrit) fx.push('💥 暴擊 ×5！');
  if (opt.effects.incense > 0) fx.push(`💰 香火 +${opt.effects.incense > 2 ? '大量' : '少許'}`);
  if (state.combo >= 2 && opt.tags.includes('honest')) fx.push(`🔥 連段 ×${comboMultiplier(state.combo, state.mult.comboCapBonus || 0).toFixed(1)}`);
  if (opt.effects.faith > 0) fx.push('😊 滿意 ↑'); else if (opt.effects.faith < 0) fx.push('😠 滿意 ↓');
  // 連段提示要與實際狀態一致：唬爛(keepCombo)/連段鎖(comboLock) 不會斷；只有真的歸零才顯示「中斷」
  const reallyBroke = opt.tags.includes('scam') && !opt.keepCombo && !state.skill.comboLock;
  if (reallyBroke) fx.push('💢 連段中斷');
  else if (opt.tags.includes('bull') && state.combo >= 2) fx.push('🪢 連段保留');
  const tag = $('reply-fx');
  if (tag) {
    tag.textContent = fx.join('　');
    tag.classList.remove('show'); void tag.offsetWidth; tag.classList.add('show');
    clearTimeout(tag._t); tag._t = setTimeout(() => tag.classList.remove('show'), 2200);
  }
}

/* 賺乩幣特效：金幣從信眾飛向香火表 + 大字 +乩幣$ 彈出（捐香油錢的爽感） */
function spawnCoins(amount, crit) {
  const layer = $('coin-layer') || (() => { const d = document.createElement('div'); d.id = 'coin-layer'; document.body.appendChild(d); return d; })();
  const heroRect = ($('serve-hero') || document.body).getBoundingClientRect();
  const targetRect = ($('m-incense') || document.body).getBoundingClientRect();
  const sx = heroRect.left + heroRect.width / 2;
  const sy = heroRect.top + heroRect.height * 0.4;
  const tx = targetRect.left + targetRect.width / 2;
  const ty = targetRect.top + targetRect.height / 2;
  const n = crit ? 18 : Math.min(14, 5 + Math.floor(amount / 800));
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'coin';
    c.textContent = '🪙';
    const jx = (Math.random() - 0.5) * 90;
    const jy = (Math.random() - 0.5) * 60;
    c.style.cssText = `left:${sx + jx}px;top:${sy + jy}px;--tx:${tx - sx - jx}px;--ty:${ty - sy - jy}px;--d:${i * 28}ms`;
    layer.appendChild(c);
    setTimeout(() => c.remove(), 900 + i * 28);
  }
  // 大字彈出
  const pop = document.createElement('div');
  pop.className = `coin-pop${crit ? ' crit' : ''}`;
  pop.textContent = `${crit ? '💥 ' : ''}+乩幣$${amount.toLocaleString()}`;
  pop.style.cssText = `left:${sx}px;top:${sy - 30}px`;
  layer.appendChild(pop);
  setTimeout(() => pop.remove(), 1400);
  // 香火數字跳動
  const inc = $('m-incense'); if (inc) { inc.classList.remove('bump'); void inc.offsetWidth; inc.classList.add('bump'); }
  vibrate(crit ? [30, 20, 50] : 18);

  // ── 浮誇：金額越大／暴擊 → 全螢幕金幣雨 + 金光閃（門檻相對化，開局也看得到）──
  // 以本班目前平均單筆當基準：超過 ~1.6 倍就算「大筆」，暴擊一定觸發。
  state._gainSamples = (state._gainSamples || []).concat(amount).slice(-8);
  const avg = state._gainSamples.reduce((a, b) => a + b, 0) / state._gainSamples.length;
  const big = crit || amount >= Math.max(400, avg * 1.6);
  if (big) coinRain(crit ? 46 : Math.min(40, 16 + Math.floor(amount / 150)), crit);
}

/* 全螢幕金幣雨 + 金光閃爍（發大財的爽感） */
function coinRain(count, crit) {
  const layer = $('coin-layer') || (() => { const d = document.createElement('div'); d.id = 'coin-layer'; document.body.appendChild(d); return d; })();
  // 金光閃
  const flash = document.createElement('div');
  flash.className = 'gold-flash';
  layer.appendChild(flash);
  setTimeout(() => flash.remove(), 700);
  // 落幣
  const W = window.innerWidth;
  for (let i = 0; i < count; i++) {
    const c = document.createElement('div');
    c.className = 'rain-coin';
    c.textContent = Math.random() < 0.2 ? '💰' : '🪙';
    const dur = 900 + Math.random() * 800;
    c.style.cssText = `left:${Math.random() * W}px;top:-40px;font-size:${18 + Math.random() * 22}px;`
      + `--dur:${dur}ms;--delay:${Math.random() * 400}ms;--rot:${(Math.random() - 0.5) * 720}deg;--sway:${(Math.random() - 0.5) * 80}px`;
    layer.appendChild(c);
    setTimeout(() => c.remove(), dur + 500);
  }
}

/* HUD：顯示目前連段與倍率 */
function updateComboHud() {
  const el = $('combo-hud');
  if (!el) return;
  if (state.combo >= 2) {
    const m = comboMultiplier(state.combo, state.mult.comboCapBonus || 0);
    el.innerHTML = `🔥 連段 ${state.combo}　香火 ×${m.toFixed(1)}`;
    el.classList.add('show');
  } else {
    el.classList.remove('show');
  }
}

/* 統一記帳：所有事件對「本班香火 / 名聲」的增減都走這裡，結算才對得上 */
function logEvent(label, incenseDelta = 0, repDelta = 0) {
  if (incenseDelta) state.incense = Math.max(0, state.incense + Math.round(incenseDelta));
  if (repDelta) state.repBonus += repDelta;
  state.ledger.push({ label, incense: Math.round(incenseDelta), rep: repDelta });
  updateMeters();
}

/* chain consequences: low faith → heckle; greedy → lose fans; 一律說明「誰、為什麼」 */
function maybeChainEvent(done) {
  if (state.skill?.shield) { done(); return; } // 媽祖庇佑：本班免疫鬧場/掉粉
  const who = state.current?.name ?? '一位信眾';
  const lastTopic = state.curStage?.tag || state.current?.tag || '所問之事';

  if (state.faith < 30 && !state.eventsDone.has('heckle')) {
    state.eventsDone.add('heckle');
    state.score.heckled += 1;
    return showEvent({
      title: '🍅 信眾當場翻臉',
      body: `${who}覺得你剛才那番「${lastTopic}」的指點根本在敷衍他，越想越不對，當眾拍桌：「你這什麼神棍！」現場信眾的眼神都涼了。`,
      opts: [
        { t: '霸氣壓場（元神 -）', primary: true, fn: () => { state.stable = clampStable(state.stable - RI(8, 16)); logEvent('壓場安撫', 0, 0); state.faith = clamp(state.faith + 10); } },
        { t: '退香油息事（香火 -）', fn: () => { logEvent('退香油息事', -RI(400, 900)); state.faith = clamp(state.faith + 18); } },
      ],
    }, done);
  }
  if (state.score.scam >= 3 && !state.eventsDone.has('fanloss')) {
    state.eventsDone.add('fanloss');
    state.score.lostFans = true;
    return showEvent({
      title: '📉 廟方關切：掉粉了',
      body: '你連坑了好幾筆香油錢，社群開始出現負評：「斂財宮」「快逃」。短期香火很爽，長期信眾在流失。',
      opts: [
        { t: '繼續衝業績（滿意 -）', primary: true, fn: () => { state.faith = clamp(state.faith - 12); logEvent('硬衝業績', RI(500, 1100)); } },
        { t: '佛系收斂（名聲 +）', fn: () => { state.faith = clamp(state.faith + 14); logEvent('收斂止血', 0, 2); } },
      ],
    }, done);
  }
  // 機會命運：偶發、效果顯著、不一定好壞，選了才知道
  if (Math.random() < 0.34 && !state._chanceThisShift) {
    state._chanceThisShift = true;
    return chanceEvent(done);
  }
  done();
}

/* 小米歐・小太陽運：開掛時命運卡擲骰永遠回 0 → 一律落在「好結果」分支。
   未攻略時就是普通 Math.random()。 */
function luckyRandom() { return (state.mult?.perk?.chanceLuck) ? 0 : Math.random(); }

/* 機會命運事件 — 像大富翁的命運卡：選一個動作，結果顯著且不保證好 */
const CHANCE_EVENTS = [
  {
    title: '📸 網美求合照', body: (n) => `${n}說要幫廟「衝聲量」，請你合照發限動。鏡頭一架，全場都在看你怎麼回應。`,
    opts: [
      { t: '盛裝合照、給她最大版位', primary: true, roll() { return luckyRandom() < 0.62
        ? { msg: '限動爆紅！新粉湧入，香火與名聲齊漲。', inc: RI(800, 1600), rep: 5 }
        : { msg: '她拍完只標自己沒標廟。沒蹭到，但你帥照也被瘋傳，小賺。', inc: RI(200, 500), rep: -1 }; } },
      { t: '冷處理、繼續辦正事', roll() { return { msg: '沒蹭到流量，但專心服務信眾，小有香火。', inc: RI(150, 400), rep: 1 }; } },
    ],
  },
  {
    title: '🎁 神秘金主遞紅包', body: (n) => `一位西裝筆挺的大哥透過${n}遞來一個厚紅包，說「師父幫個忙，懂的」。沒說是什麼忙。`,
    opts: [
      { t: '收下，不問', primary: true, roll() { return luckyRandom() < 0.65
        ? { msg: '紅包很厚，香火大進。至於那個「忙」⋯⋯之後再說。', inc: RI(1800, 3400), rep: -1 }
        : { msg: '原來是要你掛名站台，麻煩了一下，但紅包照收。', inc: RI(800, 1500), rep: -5 }; } },
      { t: '婉拒，這種錢燙手', roll() { return { msg: '清譽要緊，名聲微漲。', inc: 0, rep: 3 }; } },
    ],
  },
  {
    title: '📺 地方新聞要來拍', body: () => '記者想做「靈驗神壇」專題。鏡頭是雙面刃，可以封神，也可以翻車。',
    opts: [
      { t: '大方受訪、show 出排場', primary: true, roll() { return luckyRandom() < 0.6
        ? { msg: '報導爆紅，「全國最靈」上熱搜，香火與名聲齊飛！', inc: RI(1000, 2000), rep: 9 }
        : { msg: '記者拍到你滑手機等收工，被酸了一下，但版面還是有露出。', inc: RI(200, 500), rep: -4 }; } },
      { t: '低調謝絕', roll() { return { msg: '少了曝光，但穩穩服務香客，小有進帳。', inc: RI(150, 400), rep: 1 }; } },
    ],
  },
  {
    title: '🛕 隔壁宮來踢館', body: () => '隔壁「天威宮」放話說你是假乩，約你公開鬥法比靈驗。輸了難看，贏了名震四方。',
    opts: [
      { t: '接戰！當場起乩給他看', primary: true, roll() { return luckyRandom() < 0.6
        ? { msg: '你一個倒栽蔥配狼牙棒，全場跪服，對手摸摸鼻子走人。名聲大漲！', inc: RI(600, 1200), rep: 11 }
        : { msg: '你抖到一半閃到腰，有點糗，但敢接戰這份膽識鄉民反而挺你。', inc: 0, rep: -4 }; } },
      { t: '不理他，清者自清', roll() { return { msg: '沒接招，但你淡定的氣度也圈了一波粉。', inc: 0, rep: 2 }; } },
    ],
  },
  {
    title: '🤲 香客掉了錢包', body: (n) => `${n}走後，神桌底下有個鼓鼓的錢包，裡面厚厚一疊，沒人看到。`,
    opts: [
      { t: '招領歸還失主', primary: true, roll() { return luckyRandom() < 0.7
        ? { msg: '失主感激涕零，到處說你德高望重，名聲大漲、還包了謝禮。', inc: RI(400, 900), rep: 8 }
        : { msg: '失主只說了聲謝就走，但旁人都看在眼裡，名聲穩漲。', inc: 0, rep: 5 }; } },
      { t: '收進功德箱（神明會懂）', roll() { return { msg: '香火帳多了一筆來路不明的錢。良心？神明說它在睡覺。', inc: RI(1200, 2400), rep: -3 }; } },
    ],
  },
];
function chanceEvent(done) {
  const ev = R(CHANCE_EVENTS);
  const who = state.current?.name ?? '一位信眾';
  // 第一層：選擇；不在這裡 done，改在「結果頁」按繼續才 done（要點一下、看得完）
  showEvent({
    title: `🎲 機會・${ev.title}`,
    body: typeof ev.body === 'function' ? ev.body(who) : ev.body,
    holdOpen: true, // 不自動關閉，交給結果頁接手
    opts: ev.opts.map((o) => ({
      t: o.t,
      primary: o.primary,
      fn: () => {
        const res = o.roll();
        // 機會金額隨身價縮放（後期不再無感）；只放大正向香火，扣錢維持原樣
        if (res.inc > 0) res.inc = scaleChance(getSave(), res.inc);
        logEvent(ev.title.replace(/^[^一-鿿]+/, ''), res.inc || 0, res.rep || 0);
        const good = (res.inc || 0) > 0 || (res.rep || 0) > 0;
        if ((res.inc || 0) >= 1000 || (res.rep || 0) >= 6) coinRain(24, false);
        // 第二層：結果頁（點繼續才走）
        const fx = [];
        if (res.inc) fx.push(`${res.inc > 0 ? '💰 香火 +' : '💸 香火 -'}乩幣$${Math.abs(res.inc).toLocaleString()}`);
        if (res.rep) fx.push(`📣 名聲 ${res.rep > 0 ? '+' : ''}${res.rep}`);
        showEvent({
          title: good ? '✨ 結果' : '💀 結果',
          body: `${res.msg}\n\n${fx.join('　')}`,
          opts: [{ t: '繼續', primary: true, fn: () => {} }],
        }, done);
      },
    })),
  }, () => {}); // 第一層的 done 不做事（交給結果頁）
}

/* 回訪事件：帶圖、說明「為什麼回來」、效果走統一記帳（併入本班結算） */
function showRevisit(believer, rv) {
  const ov = $('event-overlay');
  const eff = rv.effect || {};
  let cashD = eff.cash ? eff.cash() : 0;
  if (cashD > 0) cashD = scaleChance(getSave(), cashD); // 包紅包回訪隨身價放大，後期不再只是零頭
  const repD = eff.rep ? eff.rep() : 0;
  const datingD = eff.dating ? eff.dating() : 0;
  // 走本班香火與名聲（結算才入袋），與其他事件一致
  if (cashD || repD) logEvent(`${believer.name}回訪・${rv.title.replace(/^[^一-鿿]+/, '')}`, cashD, repD);
  if (datingD) { const s = getSave(); s.dating.score = (s.dating.score || 0) + datingD; persist(); }

  // 為什麼回來：綁定他的人生狀態（你之前的回答造成的）
  const reason = rv.good
    ? '（因為你上次的指點，他的人生有了起色，特地回來謝神。）'
    : '（因為你上次的指點，他的人生出了狀況，這筆帳算到你頭上。）';

  $('evt-title').textContent = rv.title;
  $('evt-body').innerHTML = `<div class="revisit-img"><img src="${asset(rv.img)}" alt="" onerror="this.style.display='none'"/></div>`
    + `<div class="revisit-line">${rv.line(believer.name)}</div>`
    + `<div class="revisit-why">${reason}</div>`
    + `<div class="revisit-eff">${[cashD ? `${cashD > 0 ? '💰 香火' : '💸 損失'} ${cashD > 0 ? '+' : '-'}乩幣$${Math.abs(cashD).toLocaleString()}` : '', repD ? `📣 名聲 ${repD > 0 ? '+' : ''}${repD}` : ''].filter(Boolean).join('　')}</div>`;
  const btns = $('evt-btns'); btns.innerHTML = '';
  const b = document.createElement('button'); b.className = 'evt-primary'; b.textContent = rv.good ? '阿彌陀佛，收下' : '⋯⋯（硬著頭皮）';
  b.addEventListener('click', () => { ov.classList.remove('show'); vibrate(30); if (cashD > 1200 || repD > 3) coinRain(20, false); nextRound(); });
  btns.appendChild(b);
  ov.classList.add('show');
}

function showEvent(ev, done) {
  $('evt-title').textContent = ev.title;
  $('evt-body').innerHTML = String(ev.body).split('\n\n').map((s) => `<p>${s.replace(/\n/g, '<br>')}</p>`).join('');
  const btns = $('evt-btns');
  btns.innerHTML = '';
  ev.opts.forEach((opt) => {
    const b = document.createElement('button');
    b.className = opt.primary ? 'evt-primary' : 'evt-secondary';
    b.textContent = opt.t;
    b.addEventListener('click', () => {
      opt.fn?.();
      updateMeters();
      if (!ev.holdOpen) $('event-overlay').classList.remove('show'); // holdOpen：交給下一頁接手
      vibrate(30);
      done();
    });
    btns.appendChild(b);
  });
  $('event-overlay').classList.add('show');
}

/* ════════════════ 6 · Settlement — 經濟結算 + 持久化 ════════════════ */
async function showExit() {
  await exitPossessionAnimated();
  setPhase(5);

  const save = getSave();
  const passive = passiveOf(state.god.id);
  const perk = state.mult.perk || {}; // 後宮加持
  // 王爺「開壇」/被動 → 結算香火倍率
  const shiftMult = (state.skill.shiftMult || 1);
  const gross = Math.round(state.incense * shiftMult);
  // 關聖「義薄雲天」→ 開銷減半；Tina・免稅特權 → overheadMul（0=全免）
  const overhead = Math.round(shiftOverhead(save.rep, save.day) * (state.skill.halfOverhead ? 0.5 : 1) * (perk.overheadMul != null ? perk.overheadMul : 1));
  const repGain = (state.mult.repGain || 1) * (passive.repGain || 1);
  let repD = repDelta(state.faith, state.score.heckled > 0, state.score.lostFans, repGain) + (state.repBonus || 0);
  // Coco 姐・名媛背書：每班名聲保底大漲（取正成長與保底的較大值）
  if (perk.repFloor) repD = Math.max(repD, perk.repFloor);
  // 香火毛收 = 信眾問答 + 事件增減（兩者都已累進 state.incense），這裡拆出事件淨額供顯示
  const eventIncense = (state.ledger || []).reduce((sum, it) => sum + (it.incense || 0), 0);
  const answerIncense = Math.round((state.incense - eventIncense) * shiftMult);

  // 淨額（毛收 − 開銷）；不足就先扣現金（現金可被扣到 0，再不夠就是真的繳不出 → 之後 loan tick 會逾期）
  const net = gross - overhead;
  addCash(net); // addCash 內部 clamp >=0，等於現金不夠時歸零

  // 薇薇安・喬掉債務：高利貸一筆勾銷（零利率＝直接清掉本班的債務 tick）
  let lt;
  if (perk.loanFree) {
    if (save.loan && save.loan.owed > 0) { save.loan = { principal: 0, owed: 0, missed: 0 }; persist(); }
    lt = { autoPaidFromCash: 0, interest: 0, missed: false, milestone: null };
  } else {
    // 高利貸：每班自動扣現金繳「當輪應繳」、剩餘滾利，繳不出就逾期累計
    lt = tickLoan(save);
    if (lt.autoPaidFromCash > 0) addCash(-lt.autoPaidFromCash);
  }
  persist();
  setRep(save.rep + repD);
  bump('lifetimeIncome', Math.max(0, gross));
  bump('lifetimeOverhead', overhead);
  bump('answers', state.score.answers);
  ['honest', 'harm', 'bull', 'scam'].forEach((k) => bump(k, state.score[k]));
  save.day += 1; save.shiftCount += 1; persist();

  const persona = judgePersona(state.score);
  $('settle-persona-title').textContent = persona.title;
  $('settle-persona-desc').textContent = persona.desc;

  // 乘數拆解（讓玩家看懂自己的 build）
  const mb = [];
  if ((state.mult.incenseMult || 1) > 1) mb.push(`香爐×${(state.mult.incenseMult).toFixed(2)}`);
  if ((passive.incenseMult || 1) !== 1) mb.push(`${state.god.name}×${passive.incenseMult}`);
  if ((state.mult.vipChance || 0) > 0) mb.push(`VIP ${Math.round(state.mult.vipChance * 100)}%`);
  if (shiftMult > 1) mb.push(`技能×${shiftMult}`);
  if (state.combo >= 2) mb.push(`連段最高×${comboMultiplier(state.combo, state.mult.comboCapBonus || 0).toFixed(1)}`);

  const sign = (n) => (n >= 0 ? `+乩幣$${n.toLocaleString()}` : `-乩幣$${Math.abs(n).toLocaleString()}`);
  // 事件逐項（誰、增減多少）— 讓數字對得上
  const eventRows = (state.ledger || []).filter((it) => it.incense || it.rep).map((it) => [
    `　└ ${it.label}`,
    [it.incense ? sign(it.incense) : '', it.rep ? `名聲${it.rep > 0 ? '+' : ''}${it.rep}` : ''].filter(Boolean).join('　'),
  ]);
  const rows = [
    ['降駕神明', state.god.name],
    ['回答信眾', `${state.score.answers} 位`],
    ...(mb.length ? [['收入加成', mb.join('・')]] : []),
    ['信眾香火', `+乩幣$${answerIncense.toLocaleString()}`],
    ...eventRows,
    ['香火毛收 小計', `+乩幣$${gross.toLocaleString()}`],
    ['廟務開銷', `-乩幣$${overhead.toLocaleString()}`],
    ['本班淨利', sign(net)],
    ...(lt.autoPaidFromCash > 0 ? [['還錢莊（當輪）', `-乩幣$${lt.autoPaidFromCash.toLocaleString()}`]] : []),
    ...(lt.missed ? [['⚠ 繳不出當輪・逾期', `第 ${getSave().loan.missed} 次`]] : []),
    ...(lt.interest > 0 ? [['🩸 高利貸滾息', `+欠款 乩幣$${lt.interest.toLocaleString()}`]] : []),
    ['名聲變動', `${repD >= 0 ? '+' : ''}${repD}（${repTitle(save.rep)}）`],
    ['目前現金', `乩幣$${save.cash.toLocaleString()}`],
    ...(hasLoan(save) ? [['目前欠錢莊', `乩幣$${owedAmount(save).toLocaleString()}`]] : []),
  ];
  $('settle-rows').innerHTML = rows.map(([k, v]) => `<div class="settle-row"><span>${k}</span><b>${v}</b></div>`).join('');

  $('settle-irony').innerHTML = '<div class="irony-head">廟務內部備查（信眾看不到）</div>'
    + ironyLines(state.score).map((l) => `<div class="irony-line">${l}</div>`).join('');

  const got = ACHIEVEMENTS.filter((a) => a.test(state.score));
  $('settle-ach').innerHTML = got.length
    ? got.map((a) => `<span class="ach">${a.label}</span>`).join('')
    : '<span class="ach muted">本場無解鎖成就（太正常了）</span>';
  refreshScroll(); // 結算列很長，小螢幕要能捲到「重新開始」鈕

  // 高利貸逾期里程碑：第 3 / 7 / 10 班越來越嚴重；第 10 班＝沉海 game over
  if (lt.milestone) {
    setTimeout(() => showDebtEvent(lt.milestone), 1200);
    return;
  }
  // 大結局彩蛋（非強制結束）：達成里程碑時播一次（讓玩家先看結算再跳）
  setTimeout(maybeGrandFinale, 1500);
}

/* 討債事件：第 3/7 班有實際損失（扣現金、掉名聲、搶收藏）；第 10 班＝沉海 game over */
function showDebtEvent(milestone) {
  const save = getSave();
  const ev = debtEvent(milestone);
  const ov = $('event-overlay');
  $('evt-title').textContent = ev.title;

  if (ev.fatal) {
    bump('gameOvers', 1);
    $('evt-body').innerHTML = `<div class="finale-body">${ev.body.replace(/\n/g, '<br>')}</div>`;
    const btns = $('evt-btns'); btns.innerHTML = '';
    const b = document.createElement('button'); b.className = 'evt-primary'; b.textContent = '⚱️ 重新做人（清空存檔）';
    b.addEventListener('click', () => { resetSave(); ov.classList.remove('show'); backToHub(); });
    btns.appendChild(b);
    ov.classList.add('show');
    screenShake(3); vibrate([200, 80, 200, 80, 300]);
    return;
  }

  // 非致命：套用損失
  const losses = [];
  if (ev.cashLoss) { const amt = Math.round(save.cash * ev.cashLoss); if (amt > 0) { addCash(-amt); losses.push(`被搜走現金 乩幣$${amt.toLocaleString()}`); } }
  if (ev.repLoss) { setRep(save.rep - ev.repLoss); losses.push(`名聲 -${ev.repLoss}`); }
  if (ev.seizeItem && (save.owned || []).length) {
    // 抵債：拖走一件最便宜的收藏（留著貴的給玩家心痛感較低，但仍肉痛）
    const owned = [...save.owned];
    const seized = owned[Math.floor(Math.random() * owned.length)];
    save.owned = owned.filter((x) => x !== seized); persist();
    const pr = PRODUCTS.find((p) => p.id === seized);
    losses.push(`收藏「${pr ? pr.name : seized}」被拖走抵債`);
  }
  persist();
  $('evt-body').innerHTML = `<div class="finale-body">${ev.body.replace(/\n/g, '<br>')}</div>`
    + (losses.length ? `<div class="revisit-why">損失：${losses.join('、')}</div>` : '');
  const btns = $('evt-btns'); btns.innerHTML = '';
  const b = document.createElement('button'); b.className = 'evt-primary'; b.textContent = '⋯下次一定還（吞下）';
  b.addEventListener('click', () => { ov.classList.remove('show'); setTimeout(maybeGrandFinale, 600); });
  btns.appendChild(b);
  ov.classList.add('show');
  screenShake(2); vibrate([120, 50, 120]);
}

/* 里程碑大結局：買到頂級豪宅 或 所有固定信眾都有結局 → 播「大師的一生」彩蛋（玩家可繼續經營） */
function maybeGrandFinale() {
  const save = getSave();
  save.flags ||= {};
  const ownsTopMansion = (save.owned || []).some((id) => id === 'mansion-dibao' || id === 'mansion-palm-island');
  const fixedTotal = CHARACTERS.length;
  const resolved = Object.keys(save.believers || {}).filter((cid) => save.believers[cid]?.endingId && !cid.startsWith('passer-')).length;
  const allResolved = resolved >= fixedTotal;
  if (ownsTopMansion && !save.flags.finaleMansion) { save.flags.finaleMansion = true; persist(); return showFinale('mansion'); }
  if (allResolved && !save.flags.finaleAll) { save.flags.finaleAll = true; persist(); return showFinale('all'); }
}

function showFinale(kind) {
  const save = getSave();
  const good = Object.values(save.believers || {}).filter((l) => l.endingId && ['rich', 'wedding', 'healed'].includes(l.endingId)).length;
  const bad = Object.values(save.believers || {}).filter((l) => l.endingId && ['ruin', 'heartbreak', 'sick'].includes(l.endingId)).length;
  const ov = $('event-overlay');
  const head = kind === 'mansion' ? '🏰 大師的一生・登峰造極' : '🛕 大師的一生・功德圓滿（？）';
  const body = kind === 'mansion'
    ? `你終於住進了帝寶頂樓。落地窗外，整座城市的香火在腳下閃爍。\n你幫到了 ${good} 個人、也親手送走了 ${bad} 個人——但住在這個高度，已經聽不見樓下的聲音了。\n神明保佑，阿彌陀佛。`
    : `你接觸過的每一位信眾，人生都有了結局：${good} 人因你而好、${bad} 人因你而壞。\n他們的命運寫進了功德堂，而你的香火簿，還在繼續翻頁。\n「神明從不犯錯，犯錯的都是信錯的人。」`;
  $('evt-title').textContent = head;
  $('evt-body').innerHTML = `<div class="finale-body">${body.replace(/\n/g, '<br>')}</div>`
    + '<div class="revisit-why">（這不是結束——乩天宮永遠開門，香火永遠燒著。）</div>';
  const btns = $('evt-btns'); btns.innerHTML = '';
  const b = document.createElement('button'); b.className = 'evt-primary'; b.textContent = '繼續當大師';
  b.addEventListener('click', () => { ov.classList.remove('show'); coinRain(40, true); });
  btns.appendChild(b);
  ov.classList.add('show');
  coinRain(46, true);
}

function showGameOver() {
  const ov = $('event-overlay');
  $('evt-title').textContent = '廟被查封了';
  $('evt-body').textContent = `負債 乩幣$${getSave().debt.toLocaleString()} 還不出來，錢莊找上門，廟務系統強制停權。`
    + '神明也保佑不了你的財務。要從頭再來嗎？';
  const btns = $('evt-btns'); btns.innerHTML = '';
  const b = document.createElement('button'); b.className = 'evt-primary'; b.textContent = '東山再起（清空存檔）';
  b.addEventListener('click', () => { resetSave(); ov.classList.remove('show'); backToHub(); });
  btns.appendChild(b);
  ov.classList.add('show');
}

/* ════════════════ Actions ════════════════ */
function bindActions() {
  $('btn-start').addEventListener('click', () => { setPhase(1); renderPrep(); });
  $('btn-to-map')?.addEventListener('click', backToHub); // 選神畫面 → 回地圖
  $('btn-biz')?.addEventListener('click', () => openUpgradeScreen()); // 廟務經營（升級頁覆蓋在選神之上）
  $('btn-prep-next').addEventListener('click', runScan);
  $('btn-share').addEventListener('click', () => {
    const persona = $('settle-persona-title').textContent;
    const text = [
      '【乩身值班結算】',
      `神明：${state.god.name}　人格鑑定：${persona}`,
      ...$('settle-rows').innerText.split('\n'),
      '—— 廟務備查 ——',
      ...ironyLines(state.score),
    ].join('\n');
    navigator.clipboard?.writeText(text).then(() => {
      $('btn-share').textContent = '已複製！';
      setTimeout(() => { $('btn-share').textContent = '複製結算報告'; }, 2000);
    }).catch(() => alert(text));
  });
  $('btn-restart').addEventListener('click', backToHub);
}

/* 回到待機大廳（值班間） */
function backToHub() {
  Object.assign(state, {
    phase: 0, prepDone: {}, ritualHits: 0, incense: 0, stable: 100, faith: 70,
    round: 0, eventsDone: new Set(), revisitsDone: new Set(), weakAura: false,
    score: freshScore(), startTime: 0, current: null, stage: 0, ledger: [], repBonus: 0,
  });
  if (state.ritual) { state.ritual.destroy(); state.ritual = null; }
  $('event-overlay').classList.remove('show');
  $('ritual-zone').classList.remove('hidden');
  $('invoke-phase').classList.add('hidden');
  clearBlood();
  document.body.classList.remove('ritual-blood');
  exitPossessionImmediate();
  openHub();
}

/* 已有結局的固定角色（退場、收藏在功德堂） */
function resolvedCids() {
  const b = getSave().believers || {};
  return new Set(Object.keys(b).filter((cid) => b[cid]?.endingId));
}

/* 從大廳開始一場值班 → 進選神 */
function startShift() {
  state.believers = genRoster(CHAR_COUNT, resolvedCids(), getSave().rep);
  applyBackgrounds(false);
  applyGodTheme(state.god);
  renderCarousel();
  selectIndex(state.godIndex);
  refreshTopStats();
  setPhase(0);
}

function refreshTopStats() {
  const s = getSave();
  $('s-money').textContent = `乩幣$${s.cash.toLocaleString()}`;
  $('s-count').textContent = s.rep;
}

$('bg-photo').style.backgroundImage = `url(${asset(BG.normal)})`;
$('bg-texture').style.backgroundImage = `url(${asset(BG.texture)})`;
// 預載 Iansui，確保 canvas 文字（儀式提示）也用得到 webfont
if (document.fonts?.load) document.fonts.load('16px Iansui').catch(() => {});

load(); // 讀取存檔（真實累積）
initBlood();
initGodFx();
bindActions();
// 準備好選神 carousel（大廳「開始值班」時才顯示）
state.believers = genRoster(CHAR_COUNT);
applyGodTheme(state.god);
renderCarousel();
exitPossessionImmediate();

// 大廳：所有頁面導航的中樞
initHub({ onStartShift: startShift, onBack: backToHub });
openHub();

// 娛樂城贏錢 → 全螢幕金幣雨（hub.js 會呼叫）
window.__casinoWin = (big) => coinRain(big ? 46 : 22, !!big);

if (import.meta.env?.DEV) { window.__state = state; window.__store = getSave(); window.__finishInvoke = finishInvoke; window.__startShift = startShift; }

/* ── 鎖死手機縮放：iOS 捏放手勢、雙擊縮放、雙指捲動都擋掉，畫面全版固定像 App ── */
(() => {
  // iOS Safari 的捏放是 gesture 事件（user-scalable=no 擋不掉）
  ['gesturestart', 'gesturechange', 'gestureend'].forEach((ev) =>
    document.addEventListener(ev, (e) => e.preventDefault(), { passive: false }));
  // 雙指 touchmove = 捏放 → 擋掉（單指照常，遊戲互動不受影響）
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  // 桌機/部分瀏覽器的 dblclick 也擋（保險）
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  // 雙擊縮放：350ms 內、位置相近的「第二下」才擋（位置遠＝是兩顆不同按鈕的快速連點，照常放行）。
  // ⚠️ 不再因為點在按鈕上就放行——iOS 雙擊「同一顆按鈕」一樣會觸發整頁縮放；
  //    只用「時間+位置接近」判定 zoom 手勢，這樣連點不同下注鈕/選項不受影響。
  let lastTap = 0; let lastX = 0; let lastY = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    const t = e.changedTouches && e.changedTouches[0];
    const x = t ? t.clientX : 0; const y = t ? t.clientY : 0;
    const near = Math.abs(x - lastX) < 36 && Math.abs(y - lastY) < 36;
    if (now - lastTap < 350 && near) e.preventDefault(); // 同位置雙擊＝縮放手勢 → 擋掉（click 仍由第一下觸發）
    lastTap = now; lastX = x; lastY = y;
  }, { passive: false });
})();
