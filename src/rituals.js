/**
 * 起駕儀式 — 五種 canvas + rAF 物理小遊戲。
 * 每種都有真實手感：慣性、量表、節奏、拋擲物理、穩定度。
 *
 * 用法：
 *   const ritual = startRitual(mechanic, canvas, god, {
 *     onProgress(done, need),        // 完成一次（達標）
 *     onFeedback(quality, line),     // quality: 'perfect' | 'ok' | 'weak'
 *     onPhysics(kind, intensity),    // kind:'club'|'slap'… → main 觸發血/震/震動
 *     onComplete(),                  // need 達成
 *   });
 *   ritual.destroy();                // 切換階段時清掉
 *
 * 全部用指標事件（pointerdown/move/up），passive 安全，桌機+手機通用。
 */

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);

function fit(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect();
  const w = Math.max(1, r.width);
  const h = Math.max(1, r.height);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

/* ── 共用引擎：每幀呼叫 step(ctx,w,h,dt)，回傳清理函式 ── */
function engine(canvas, step) {
  let raf = 0;
  let dims = fit(canvas);
  let last = 0;
  const onResize = () => { dims = fit(canvas); };
  window.addEventListener('resize', onResize);
  const frame = (t) => {
    const dt = last ? Math.min(48, t - last) : 16;
    last = t;
    step(dims.ctx, dims.w, dims.h, dt);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
}

function accentRGB(god) {
  const hex = (god?.auraColor ?? god?.theme?.accent ?? '#ffcc33').replace('#', '');
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

/* =========================================================================
   1) charge — 三太子狼牙棒：長按蓄力，力道環進紅區放開，揮棒帶慣性砸下
   ========================================================================= */
function mechCharge(canvas, god, cb) {
  const need = god.ritual.need;
  let done = 0;
  let charge = 0;          // 0..1 蓄力
  let holding = false;
  let dir = 1;
  let swing = 0;           // 揮棒動畫 0..1
  let swinging = false;
  let swingPower = 0;
  const [r, g, b] = accentRGB(god);

  const press = (e) => { e.preventDefault(); if (swinging || done >= need) return; holding = true; charge = 0; dir = 1; };
  const release = () => {
    if (!holding || swinging) return;
    holding = false;
    swinging = true; swing = 0; swingPower = charge;
  };
  canvas.addEventListener('pointerdown', press);
  window.addEventListener('pointerup', release);

  const stop = engine(canvas, (ctx, w, h, dt) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h * 0.5;

    if (holding) { charge += dir * dt * 0.0016; if (charge >= 1) { charge = 1; dir = -1; } if (charge <= 0) { charge = 0; dir = 1; } }

    // power ring
    const ringR = Math.min(w, h) * 0.34;
    ctx.lineWidth = 12;
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, TAU); ctx.stroke();
    // sweet zone (red, top arc 0.72–0.96)
    ctx.strokeStyle = `rgba(${r},${g},${b},.9)`;
    ctx.beginPath(); ctx.arc(cx, cy, ringR, -Math.PI / 2 + TAU * 0.72, -Math.PI / 2 + TAU * 0.96); ctx.stroke();
    // charge arc
    ctx.lineWidth = 12;
    ctx.strokeStyle = charge > 0.72 && charge < 0.96 ? '#fff' : `rgba(${r},${g},${b},1)`;
    ctx.beginPath(); ctx.arc(cx, cy, ringR, -Math.PI / 2, -Math.PI / 2 + TAU * charge); ctx.stroke();

    // club
    let clubAngle = -0.6;
    if (swinging) {
      swing += dt * 0.006;
      clubAngle = lerp(-1.4, 0.5, Math.min(1, swing * 1.6));
      if (swing >= 0.5 && swing - dt * 0.006 < 0.5) {
        // impact moment
        const perfect = swingPower > 0.72 && swingPower < 0.96;
        const okHit = swingPower > 0.5;
        done += 1;
        const q = perfect ? 'perfect' : okHit ? 'ok' : 'weak';
        const line = perfect ? pick(god.ritual.perfectLines) : !okHit ? pick(god.ritual.weakLines) : pick(god.ritual.hitLines);
        cb.onFeedback?.(q, line);
        cb.onPhysics?.('club', perfect ? 1 : okHit ? 0.7 : 0.35, done);
        cb.onProgress?.(done, need);
        if (done >= need) { cb.onFeedback?.('perfect', god.ritual.doneLine); setTimeout(() => cb.onComplete?.(), 700); }
      }
      if (swing >= 1) { swinging = false; charge = 0; }
    } else if (holding) {
      clubAngle = lerp(-0.6, -1.3, charge);
    }
    drawClub(ctx, cx, cy, ringR, clubAngle, r, g, b);
    drawHint(ctx, w, h, holding ? '放開！瞄準紅區' : done >= need ? '' : '長按蓄力', `${done} / ${need}`);
  });

  return () => { canvas.removeEventListener('pointerdown', press); window.removeEventListener('pointerup', release); stop(); };
}
function drawClub(ctx, cx, cy, ringR, angle, r, g, b) {
  ctx.save();
  ctx.translate(cx, cy + ringR * 0.1);
  ctx.rotate(angle);
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(-6, 0, 12, ringR * 0.7);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.beginPath(); ctx.arc(0, -ringR * 0.02, 26, 0, TAU); ctx.fill();
  ctx.fillStyle = '#4a3018';
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; ctx.beginPath(); ctx.arc(Math.cos(a) * 26, -ringR * 0.02 + Math.sin(a) * 26, 4, 0, TAU); ctx.fill(); }
  ctx.restore();
}

/* =========================================================================
   2) angle — 關聖參拜：下拉把身形鞠躬到「敬區」停住，三叩成禮
   ========================================================================= */
function mechAngle(canvas, god, cb) {
  const need = god.ritual.need;
  let done = 0;
  let bow = 0;            // 0 直立 .. 1 全鞠躬
  let target = 0;
  let dragging = false;
  let inZoneMs = 0;
  let dwellMs = 0;
  const [r, g, b] = accentRGB(god);
  let startY = 0;

  const press = (e) => { e.preventDefault(); dragging = true; startY = pointerY(e, canvas); };
  const move = (e) => {
    if (!dragging) return;
    const y = pointerY(e, canvas);
    const rect = canvas.getBoundingClientRect();
    target = clamp((y - startY) / (rect.height * 0.6), 0, 1);
  };
  const release = () => { dragging = false; };
  canvas.addEventListener('pointerdown', press);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', release);

  const stop = engine(canvas, (ctx, w, h, dt) => {
    ctx.clearRect(0, 0, w, h);
    bow = lerp(bow, dragging ? target : 0, 0.18);
    const cx = w / 2;
    const groundY = h * 0.82;

    // bow gauge bar (left)
    const gx = w * 0.14;
    const top = h * 0.18;
    const bot = h * 0.82;
    ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath(); ctx.moveTo(gx, top); ctx.lineTo(gx, bot); ctx.stroke();
    // 敬區 0.7–0.9
    ctx.strokeStyle = `rgba(${r},${g},${b},.85)`;
    ctx.beginPath(); ctx.moveTo(gx, lerp(top, bot, 0.7)); ctx.lineTo(gx, lerp(top, bot, 0.9)); ctx.stroke();
    // marker
    const my = lerp(top, bot, bow);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(gx, my, 9, 0, TAU); ctx.fill();

    // figure (stick body that bows forward)
    drawWorshipper(ctx, cx, groundY, bow, r, g, b);

    const inZone = bow > 0.7 && bow < 0.9 && dragging;
    if (inZone) { dwellMs += dt; } else { dwellMs = 0; }
    if (dwellMs > 380 && done < need) {
      done += 1; dwellMs = -99999; // lock until released
      cb.onFeedback?.('perfect', pick(god.ritual.perfectLines));
      cb.onPhysics?.('bow', 0.6, done);
      cb.onProgress?.(done, need);
      if (done >= need) { cb.onFeedback?.('perfect', god.ritual.doneLine); setTimeout(() => cb.onComplete?.(), 700); }
    }
    if (!dragging) dwellMs = 0;
    drawHint(ctx, w, h, done >= need ? '' : dragging ? (inZone ? '穩住…叩首' : '再下去一點') : '按住向下拉，鞠躬至敬區', `${done} / ${need}`);
  });

  return () => {
    canvas.removeEventListener('pointerdown', press);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', release);
    stop();
  };
}
function drawWorshipper(ctx, cx, groundY, bow, r, g, b) {
  const ang = bow * 1.2; // lean forward
  const headLen = 70;
  const hx = cx + Math.sin(ang) * headLen;
  const hy = groundY - Math.cos(ang) * headLen;
  ctx.strokeStyle = `rgb(${r},${g},${b})`;
  ctx.lineWidth = 12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx, groundY); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.fillStyle = '#f0d878';
  ctx.beginPath(); ctx.arc(hx, hy, 16, 0, TAU); ctx.fill();
  // arms (palms together)
  ctx.strokeStyle = `rgba(${r},${g},${b},.7)`; ctx.lineWidth = 7;
  const ex = cx + Math.sin(ang) * headLen * 0.55;
  const ey = groundY - Math.cos(ang) * headLen * 0.55;
  ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(hx + Math.sin(ang) * 20, hy + Math.cos(ang) * 20); ctx.stroke();
}

/* =========================================================================
   3) steady — 媽祖點香：把香尖移到燭火上「穩住」直到點燃；手抖會熄。不震動。
   ========================================================================= */
function mechSteady(canvas, god, cb) {
  const need = god.ritual.need;
  let done = 0;
  let px = 0;
  let py = 0;
  let has = false;
  let lit = 0;            // 0..1 點燃進度
  let smoke = [];
  let flameX = 0;
  let flameY = 0;
  const [r, g, b] = accentRGB(god);

  const move = (e) => {
    const rect = canvas.getBoundingClientRect();
    px = (e.clientX ?? e.touches?.[0]?.clientX ?? 0) - rect.left;
    py = (e.clientY ?? e.touches?.[0]?.clientY ?? 0) - rect.top;
    has = true;
  };
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerdown', move);

  let lastX = 0;
  let lastY = 0;
  const stop = engine(canvas, (ctx, w, h, dt) => {
    ctx.clearRect(0, 0, w, h);
    flameX = w / 2; flameY = h * 0.66;
    // candle
    ctx.fillStyle = '#caa15a'; ctx.fillRect(flameX - 10, flameY, 20, h * 0.22);
    drawFlame(ctx, flameX, flameY, 1);

    // jitter = movement speed
    const speed = has ? Math.hypot(px - lastX, py - lastY) : 999;
    lastX = px; lastY = py;
    const near = has && Math.hypot(px - flameX, py - (flameY - 6)) < 34;
    const steadyOK = near && speed < 2.2;

    if (steadyOK) lit += dt * 0.0016;
    else lit -= dt * 0.0022;
    lit = clamp(lit, 0, 1);

    // incense stick at pointer
    if (has) {
      ctx.save();
      ctx.translate(px, py);
      ctx.fillStyle = '#8a5a2a'; ctx.fillRect(-3, 0, 6, 64);
      // glowing tip
      const tipC = lit > 0 ? `rgba(255,${120 + lit * 120},40,${0.6 + lit * 0.4})` : 'rgba(120,90,60,.8)';
      ctx.fillStyle = tipC;
      ctx.beginPath(); ctx.arc(0, 0, 4 + lit * 4, 0, TAU); ctx.fill();
      ctx.restore();
      if (lit > 0.15 && Math.random() < 0.4) smoke.push({ x: px, y: py - 2, vy: -0.5 - Math.random(), a: 0.5, r: 3 + Math.random() * 3 });
    }
    // smoke
    smoke = smoke.filter((s) => s.a > 0);
    for (const s of smoke) { s.y += s.vy; s.x += Math.sin(s.y * 0.05) * 0.4; s.a -= 0.006; s.r += 0.2; ctx.fillStyle = `rgba(220,220,210,${s.a})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); }

    // steady meter ring around flame
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath(); ctx.arc(flameX, flameY - 6, 40, 0, TAU); ctx.stroke();
    ctx.strokeStyle = steadyOK ? '#9fe' : `rgba(${r},${g},${b},.9)`;
    ctx.beginPath(); ctx.arc(flameX, flameY - 6, 40, -Math.PI / 2, -Math.PI / 2 + TAU * lit); ctx.stroke();

    if (lit >= 1 && done < need) {
      done += 1; lit = 0;
      cb.onFeedback?.('perfect', pick(god.ritual.perfectLines));
      cb.onPhysics?.('incense', 0.4, done); // 點香：柔光，不震動
      cb.onProgress?.(done, need);
      if (done >= need) { cb.onFeedback?.('perfect', god.ritual.doneLine); setTimeout(() => cb.onComplete?.(), 700); }
    }
    let hintMsg = '把香尖移到燭火，靜止點燃';
    if (near && !steadyOK) hintMsg = '手抖了，穩住別動';
    else if (steadyOK) hintMsg = '穩住…香要燃了';
    drawHint(ctx, w, h, done >= need ? '' : hintMsg, `${done} / ${need}`);
  });

  return () => { canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerdown', move); stop(); };
}
function drawFlame(ctx, x, y, s) {
  const grd = ctx.createRadialGradient(x, y - 8 * s, 0, x, y - 8 * s, 18 * s);
  grd.addColorStop(0, 'rgba(255,240,180,.95)');
  grd.addColorStop(0.5, 'rgba(255,150,40,.7)');
  grd.addColorStop(1, 'rgba(255,80,0,0)');
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.ellipse(x, y - 8 * s, 9 * s, 16 * s, 0, 0, TAU); ctx.fill();
}

/* =========================================================================
   4) rhythm — 濟公拍頭：光點掃過甜蜜區時拍；亂拍倒扣
   ========================================================================= */
function mechRhythm(canvas, god, cb) {
  const need = god.ritual.need;
  let done = 0;
  let pos = 0;            // 0..1 sweeping marker
  let dir = 1;
  let flash = 0;
  let flashGood = false;
  const [r, g, b] = accentRGB(god);

  const ZONE = [0.38, 0.62]; // 24% sweet zone — challenging but fair
  let cooldown = 0;
  const tap = (e) => {
    e.preventDefault();
    if (done >= need || cooldown > 0) return;
    cooldown = 180; // debounce so一次點擊只判一次
    const good = pos > ZONE[0] && pos < ZONE[1];
    flash = 1; flashGood = good;
    if (good) {
      done += 1;
      cb.onFeedback?.('perfect', pick(god.ritual.perfectLines));
      cb.onPhysics?.('slap', 0.7, done);
      cb.onProgress?.(done, need);
      if (done >= need) { cb.onFeedback?.('perfect', god.ritual.doneLine); setTimeout(() => cb.onComplete?.(), 700); }
    } else {
      // 拍歪了：不倒扣（只是沒醒），避免太挫折
      cb.onFeedback?.('weak', pick(god.ritual.weakLines));
      cb.onPhysics?.('slap-miss', 0.3, done);
    }
  };
  canvas.addEventListener('pointerdown', tap);

  const stop = engine(canvas, (ctx, w, h, dt) => {
    ctx.clearRect(0, 0, w, h);
    if (cooldown > 0) cooldown -= dt;
    pos += dir * dt * 0.00095 * (1 + done * 0.08); // 稍慢、緩坡加速
    if (pos >= 1) { pos = 1; dir = -1; } if (pos <= 0) { pos = 0; dir = 1; }
    const cy = h * 0.5;
    const x0 = w * 0.14; const x1 = w * 0.86;
    // track
    ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.1)';
    ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(x1, cy); ctx.stroke();
    // sweet zone
    ctx.strokeStyle = `rgba(${r},${g},${b},.9)`;
    ctx.beginPath(); ctx.moveTo(lerp(x0, x1, ZONE[0]), cy); ctx.lineTo(lerp(x0, x1, ZONE[1]), cy); ctx.stroke();
    // marker
    const mx = lerp(x0, x1, pos);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(mx, cy, 11, 0, TAU); ctx.fill();
    // hand emoji-ish
    if (flash > 0) { flash -= dt * 0.005; ctx.globalAlpha = Math.max(0, flash); ctx.font = `${40 + (1 - flash) * 20}px serif`; ctx.textAlign = 'center'; ctx.fillStyle = flashGood ? '#9fe' : '#f66'; ctx.fillText(flashGood ? '✋' : '💢', w / 2, cy - 40); ctx.globalAlpha = 1; }
    drawHint(ctx, w, h, done >= need ? '' : '光點進中央甜區時點擊', `${done} / ${need}`);
  });

  return () => { canvas.removeEventListener('pointerdown', tap); stop(); };
}

/* =========================================================================
   5) throw — 王爺擲筊：上滑擲出兩筊，拋物線翻滾落地，需三聖筊
   ========================================================================= */
function mechThrow(canvas, god, cb) {
  const need = god.ritual.need;
  let holy = 0;          // 聖筊累計
  let blocks = [];
  let resolving = false;
  let startY = 0;
  let startT = 0;
  const [r, g, b] = accentRGB(god);

  const press = (e) => { if (resolving) return; startY = pointerY(e, canvas); startT = performance.now(); };
  const release = (e) => {
    if (resolving) return;
    const dy = startY - pointerY(e, canvas);
    const dtm = Math.max(40, performance.now() - startT);
    const power = clamp((dy / dtm) * 12, 0.4, 2.2);
    throwBlocks(power);
  };
  canvas.addEventListener('pointerdown', press);
  window.addEventListener('pointerup', release);

  function throwBlocks(power) {
    resolving = true;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height * 0.86;
    blocks = [0, 1].map((i) => ({
      x: cx + (i ? 40 : -40), y: cy, vx: rnd(-1.2, 1.2), vy: -8 * power - rnd(0, 3),
      rot: rnd(0, TAU), vr: rnd(-0.4, 0.4), landed: false, face: 0,
    }));
  }

  const stop = engine(canvas, (ctx, w, h, dt) => {
    ctx.clearRect(0, 0, w, h);
    const groundY = h * 0.86;
    // ground line
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w * 0.1, groundY + 22); ctx.lineTo(w * 0.9, groundY + 22); ctx.stroke();

    let allLanded = blocks.length > 0;
    for (const bl of blocks) {
      if (!bl.landed) {
        bl.vy += 0.5; bl.x += bl.vx; bl.y += bl.vy; bl.rot += bl.vr;
        if (bl.y >= groundY) {
          bl.y = groundY; bl.vy *= -0.4; bl.vr *= 0.5;
          if (Math.abs(bl.vy) < 1.5) { bl.landed = true; bl.face = Math.random() < 0.5 ? 1 : 0; bl.rot = bl.face ? 0 : Math.PI; }
        }
      }
      allLanded = allLanded && bl.landed;
      drawBlock(ctx, bl, r, g, b);
    }

    if (resolving && allLanded) {
      resolving = false;
      const faces = blocks.reduce((s, x) => s + x.face, 0); // 1 flat-up = 聖筊面
      // 一正一反 = 聖筊
      const isHoly = faces === 1;
      const isLaugh = faces === 2; // 兩平 = 笑筊
      blocks = [];
      if (isHoly) {
        holy += 1;
        cb.onFeedback?.('perfect', pick(god.ritual.perfectLines));
        cb.onPhysics?.('blocks', 0.6, holy);
        cb.onProgress?.(holy, need);
        if (holy >= need) { cb.onFeedback?.('perfect', god.ritual.doneLine); setTimeout(() => cb.onComplete?.(), 700); }
      } else {
        cb.onFeedback?.('weak', isLaugh ? pick(god.ritual.weakLines) : pick(god.ritual.weakLines));
        cb.onPhysics?.('blocks-miss', 0.3, holy);
        cb.onProgress?.(holy, need);
      }
    }
    drawHint(ctx, w, h, resolving ? '看天意…' : (holy >= need ? '' : '由下往上滑，擲出筊杯'), `聖筊 ${holy} / ${need}`);
  });

  return () => { canvas.removeEventListener('pointerdown', press); window.removeEventListener('pointerup', release); stop(); };
}
function drawBlock(ctx, bl, r, g, b) {
  ctx.save();
  ctx.translate(bl.x, bl.y);
  ctx.rotate(bl.rot);
  ctx.fillStyle = bl.landed && bl.face ? `rgb(${r},${g},${b})` : '#7a1020';
  ctx.beginPath();
  ctx.moveTo(-16, 8); ctx.quadraticCurveTo(0, -14, 16, 8); ctx.quadraticCurveTo(0, 14, -16, 8);
  ctx.fill();
  ctx.restore();
}

/* ── shared helpers ── */
function pointerY(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  return (e.clientY ?? e.touches?.[0]?.clientY ?? 0) - rect.top;
}
function pick(a) { return a && a.length ? a[Math.floor(Math.random() * a.length)] : ''; }
function drawHint(ctx, w, h, msg, counter) {
  ctx.textAlign = 'center';
  ctx.font = '600 15px Iansui, "Noto Serif TC", serif';
  ctx.fillStyle = 'rgba(255,235,205,.9)';
  if (msg) ctx.fillText(msg, w / 2, h * 0.12);
  ctx.font = '700 20px Iansui, "Noto Serif TC", serif';
  ctx.fillStyle = '#f0d878';
  ctx.fillText(counter, w / 2, h * 0.94);
}

const MECHANICS = {
  charge: mechCharge,
  angle: mechAngle,
  steady: mechSteady,
  rhythm: mechRhythm,
  throw: mechThrow,
};

export function startRitual(mechanic, canvas, god, cb) {
  const fn = MECHANICS[mechanic] ?? mechCharge;
  return { destroy: fn(canvas, god, cb) };
}
