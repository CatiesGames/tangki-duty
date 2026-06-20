/**
 * 降駕前準備 — 每個步驟一個 canvas 2D 仿 3D 小互動（不再只是點一下）。
 * 共用一個 rAF 引擎，五種 mechanic：
 *   chew   嚼/啜 — 節奏點擊填滿（下巴/酒杯彈動）
 *   equip  佩戴 — 把物件拖到身上定位
 *   charge 蓄能 — 長按填滿（聲波／氣場環脈動）
 *   tally  計數 — 節奏點擊，3D 物件彈跳累計
 *   wave   揮舞 — 來回拖曳劃過軌跡（刀勢／扇）
 *
 * startPrep(mech, canvas, item, { onProgress(p), onDone() })
 *   p: 0..1 進度；onDone 完成時呼叫一次。回傳 { destroy }。
 */

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);

function fit(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect();
  const w = Math.max(1, r.width); const h = Math.max(1, r.height);
  canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}
function engine(canvas, step) {
  let raf = 0; let dims = fit(canvas); let last = 0;
  const onR = () => { dims = fit(canvas); };
  window.addEventListener('resize', onR);
  const frame = (t) => { const dt = last ? Math.min(48, t - last) : 16; last = t; step(dims.ctx, dims.w, dims.h, dt); raf = requestAnimationFrame(frame); };
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onR); };
}
function accent(item) { return item._accent || '#ffcc33'; }
function pos(e, canvas) { const r = canvas.getBoundingClientRect(); return [(e.clientX ?? 0) - r.left, (e.clientY ?? 0) - r.top]; }

/* ── chew / sip ── 節奏點擊，下巴或酒杯彈動，填滿 progress ── */
function mechChew(canvas, item, cb) {
  const need = item.need || 8;
  let n = 0; let squeeze = 0; let glow = 0;
  const tap = (e) => { e.preventDefault(); if (n >= need) return; n += 1; squeeze = 1; glow = 1; cb.onProgress?.(n / need); if (n >= need) { cb.onDone?.(); } };
  canvas.addEventListener('pointerdown', tap);
  const a = accent(item);
  const stop = engine(canvas, (ctx, w, h, dt) => {
    ctx.clearRect(0, 0, w, h); squeeze = Math.max(0, squeeze - dt * 0.006); glow = Math.max(0, glow - dt * 0.003);
    const cx = w / 2; const cy = h * 0.5;
    // 3D-ish sphere (betel/cup) that squashes on tap
    const sq = 1 - squeeze * 0.28;
    const r = Math.min(w, h) * 0.2;
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r * 1.2);
    g.addColorStop(0, '#fff'); g.addColorStop(0.3, a); g.addColorStop(1, '#5a2a08');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, r / sq, r * sq, 0, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,220,120,${glow * 0.4})`; ctx.beginPath(); ctx.arc(cx, cy, r * (1.4 + glow), 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    drawLabel(ctx, w, h, item.label, n, need);
  });
  return () => { canvas.removeEventListener('pointerdown', tap); stop(); };
}

/* ── equip ── 把發光物件拖到身上的定位圈 ── */
function mechEquip(canvas, item, cb) {
  let placed = false;
  let dragging = false;
  let ix = 0; let iy = 0; // item pos
  let started = false;
  const a = accent(item);
  const tx = () => [canvasW * 0.5, canvasH * 0.42]; // target
  let canvasW = 0; let canvasH = 0;
  const down = (e) => { e.preventDefault(); if (placed) return; const [x, y] = pos(e, canvas); ix = x; iy = y; dragging = true; started = true; };
  const move = (e) => { if (!dragging) return; const [x, y] = pos(e, canvas); ix = x; iy = y; };
  const up = () => {
    if (!dragging) return; dragging = false;
    const [txx, tyy] = tx();
    if (Math.hypot(ix - txx, iy - tyy) < Math.min(canvasW, canvasH) * 0.18) { placed = true; cb.onProgress?.(1); cb.onDone?.(); }
  };
  canvas.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  const stop = engine(canvas, (ctx, w, h, dt) => {
    canvasW = w; canvasH = h; ctx.clearRect(0, 0, w, h);
    if (!started) { ix = w * 0.5; iy = h * 0.78; }
    const [txx, tyy] = tx();
    // body silhouette + target ring
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 2; ctx.setLineDash([5, 6]);
    ctx.beginPath(); ctx.arc(txx, tyy, Math.min(w, h) * 0.16, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.ellipse(txx, tyy + h * 0.18, w * 0.13, h * 0.22, 0, 0, TAU); ctx.fill();
    // the item (glowing token with emoji)
    const r = Math.min(w, h) * 0.12;
    const g = ctx.createRadialGradient(ix, iy, 1, ix, iy, r);
    g.addColorStop(0, a); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ix, iy, r, 0, TAU); ctx.fill();
    ctx.font = `${r}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(item.icon || '◆', ix, iy);
    drawLabel(ctx, w, h, placed ? `${item.label}　已就位` : `拖曳${item.label}至定位`, placed ? 1 : 0, 1, true);
  });
  return () => { canvas.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); stop(); };
}

/* ── charge ── 長按蓄滿（聲波/氣場環脈動）── */
function mechCharge(canvas, item, cb) {
  const ms = item.ms || 1000;
  let holding = false; let p = 0; let done = false; let phase = 0;
  const a = accent(item);
  const down = (e) => { e.preventDefault(); if (done) return; holding = true; };
  const up = () => { holding = false; };
  canvas.addEventListener('pointerdown', down);
  window.addEventListener('pointerup', up);
  const stop = engine(canvas, (ctx, w, h, dt) => {
    ctx.clearRect(0, 0, w, h); phase += dt * 0.01;
    if (holding && !done) { p = clamp(p + dt / ms, 0, 1); cb.onProgress?.(p); if (p >= 1) { done = true; cb.onDone?.(); } }
    else if (!done) { p = clamp(p - dt / (ms * 2.5), 0, 1); }
    const cx = w / 2; const cy = h * 0.5; const R = Math.min(w, h) * 0.3;
    // pulsing aura ring
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.strokeStyle = a; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * p); ctx.stroke();
    // voice waveform inside
    ctx.strokeStyle = `rgba(255,230,160,${0.4 + p * 0.5})`; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = -R * 0.7; x <= R * 0.7; x += 4) { const amp = (10 + p * 40) * (holding ? 1 : 0.3); const y = Math.sin(x * 0.08 + phase * 6) * amp * Math.cos(x / R * 1.4); if (x === -R * 0.7) ctx.moveTo(cx + x, cy + y); else ctx.lineTo(cx + x, cy + y); }
    ctx.stroke();
    drawLabel(ctx, w, h, done ? `${item.label}　完成` : `長按蓄滿：${item.label}`, p, 1, true);
  });
  return () => { canvas.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); stop(); };
}

/* ── tally ── 節奏點擊，3D 物件彈跳累計（跳步/敲鑼/敬香）── */
function mechTally(canvas, item, cb) {
  const need = item.need || 3;
  let n = 0; const balls = [];
  const a = accent(item);
  const tap = (e) => {
    e.preventDefault(); if (n >= need) return; n += 1;
    balls.push({ x: rnd(0.2, 0.8), y: 1, vy: -rnd(0.018, 0.026), rot: rnd(0, TAU) });
    cb.onProgress?.(n / need); if (n >= need) cb.onDone?.();
  };
  canvas.addEventListener('pointerdown', tap);
  const stop = engine(canvas, (ctx, w, h, dt) => {
    ctx.clearRect(0, 0, w, h);
    // ground
    ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.beginPath(); ctx.moveTo(w * 0.1, h * 0.82); ctx.lineTo(w * 0.9, h * 0.82); ctx.stroke();
    balls.forEach((b) => { b.vy += 0.0009 * dt; b.y += b.vy * dt; b.rot += 0.02 * dt; if (b.y > 1 && b.vy > 0) { b.y = 1; b.vy *= -0.5; } });
    balls.forEach((b) => {
      const x = w * b.x; const y = h * (0.18 + 0.64 * b.y); const r = Math.min(w, h) * 0.07;
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
      g.addColorStop(0, '#fff'); g.addColorStop(0.4, a); g.addColorStop(1, '#3a1a04');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.font = `${r}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(item.icon || '●', x, y);
    });
    drawLabel(ctx, w, h, `${item.label}`, n, need);
  });
  return () => { canvas.removeEventListener('pointerdown', tap); stop(); };
}

/* ── wave ── 來回揮舞劃過左右兩側（刀勢/開扇）── */
function mechWave(canvas, item, cb) {
  const need = item.need || 3;
  let n = 0; let dragging = false; let lastSide = 0; let trail = []; let done = false;
  const a = accent(item);
  const down = (e) => { e.preventDefault(); if (done) return; dragging = true; };
  const move = (e) => { if (!dragging) return; const [x, y] = pos(e, canvas); trail.push({ x, y, life: 1 }); if (trail.length > 16) trail.shift();
    const r = canvas.getBoundingClientRect(); const side = x < r.width * 0.4 ? -1 : x > r.width * 0.6 ? 1 : 0;
    if (side !== 0 && side !== lastSide && lastSide !== 0) { n += 1; cb.onProgress?.(n / need); if (n >= need && !done) { done = true; cb.onDone?.(); } }
    if (side !== 0) lastSide = side; };
  const up = () => { dragging = false; };
  canvas.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  const stop = engine(canvas, (ctx, w, h, dt) => {
    ctx.clearRect(0, 0, w, h);
    // left/right swipe zones
    ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(0, 0, w * 0.4, h); ctx.fillRect(w * 0.6, 0, w * 0.4, h);
    ctx.globalCompositeOperation = 'lighter';
    trail.forEach((t) => { t.life -= dt * 0.004; if (t.life < 0) t.life = 0; });
    trail = trail.filter((t) => t.life > 0);
    ctx.strokeStyle = a; ctx.lineCap = 'round';
    for (let i = 1; i < trail.length; i++) { ctx.globalAlpha = trail[i].life; ctx.lineWidth = 10 * trail[i].life; ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    drawLabel(ctx, w, h, `左右揮舞：${item.label}`, n, need);
  });
  return () => { canvas.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); stop(); };
}

function drawLabel(ctx, w, h, msg, val, max, ratio = false) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = '600 14px Iansui, serif'; ctx.fillStyle = 'rgba(255,235,205,.92)';
  ctx.fillText(msg, w / 2, h * 0.13);
  ctx.font = '700 18px Iansui, serif'; ctx.fillStyle = '#f0d878';
  ctx.fillText(ratio ? `${Math.round((val / max) * 100)}%` : `${val} / ${max}`, w / 2, h * 0.95);
}

/* prep id → mechanic + 參數 */
const PREP_MAP = {
  betel: ['chew', { need: 8 }], wine: ['chew', { need: 6 }],
  gold: ['equip', {}], robe: ['equip', {}], tidy: ['equip', {}], stamp: ['equip', {}], scroll: ['equip', {}], fan: ['equip', {}],
  voice: ['charge', {}], face: ['charge', {}], calm: ['charge', {}],
  steps: ['tally', { need: 7 }], laugh: ['tally', { need: 3 }], cymbal: ['tally', { need: 3 }], incense: ['tally', { need: 3 }],
  blade: ['wave', { need: 3 }],
};
const MECHS = { chew: mechChew, equip: mechEquip, charge: mechCharge, tally: mechTally, wave: mechWave };

export function startPrep(item, canvas, cb) {
  const [mech, params] = PREP_MAP[item.id] || (item.type === 'hold' ? ['charge', {}] : item.type === 'count' ? ['tally', { need: item.need }] : ['equip', {}]);
  const merged = { ...item, ...params, ms: item.ms || params.ms, need: item.need || params.need, _accent: cb.accent };
  return { destroy: MECHS[mech](canvas, merged, cb) };
}
