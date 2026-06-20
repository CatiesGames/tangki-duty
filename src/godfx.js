/**
 * 起駕 Canvas 特效引擎 — 每位神明一套浮誇全屏動畫。
 * 由 gods.js 的 fxKind 驅動：
 *   flame-talisman  三太子 — 火舌上竄 + 金色符令旋落 + 火花
 *   thunder-blade   關聖   — 青龍刀光橫掃 + 雷閃 + 金塵
 *   sea-wave        媽祖   — 藍金海波湧動 + 浮光 + 慈光粒子
 *   gold-laughter   濟公   — 金光酒花四濺 + 旋轉葫蘆光 + 笑紋漣漪
 *   edict-march     王爺   — 朱紅符令行列推進 + 鑼震波 + 金印火星
 *
 * 設計重點：高 DPR、永遠 fit 全屏、神聖莊嚴的放射光 + 該神明專屬母題。
 */

let canvas;
let ctx;
let raf = 0;
let particles = [];
let t = 0;
let kind = null;
let accent = '#ffd700';
let dpr = 1;
let W = 0;
let H = 0;
let running = false;

const TAU = Math.PI * 2;
const rand = (a, b) => Math.random() * (b - a) + a;

function resize() {
  if (!canvas) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function initGodFx() {
  canvas = document.getElementById('godfx-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
}

/* ── particle factories per kind ── */
function seed() {
  particles = [];
  const cx = W / 2;
  const cy = H * 0.46;

  if (kind === 'flame-talisman') {
    for (let i = 0; i < 70; i++) {
      particles.push({ type: 'flame', x: rand(0, W), y: H + rand(0, 200), vy: rand(1.4, 4), w: rand(10, 40), life: rand(0, 1), hue: rand(-12, 22) });
    }
    for (let i = 0; i < 14; i++) {
      particles.push({ type: 'talisman', x: rand(0, W), y: rand(-H, 0), vy: rand(0.6, 1.6), rot: rand(0, TAU), vr: rand(-0.02, 0.02), s: rand(18, 40) });
    }
    for (let i = 0; i < 50; i++) {
      particles.push({ type: 'spark', x: rand(0, W), y: rand(0, H), a: rand(0, TAU), sp: rand(0.4, 2.2), r: rand(1, 3) });
    }
  } else if (kind === 'thunder-blade') {
    for (let i = 0; i < 5; i++) {
      particles.push({ type: 'blade', off: i / 5, speed: rand(0.5, 0.9), len: rand(0.5, 0.9) });
    }
    for (let i = 0; i < 70; i++) {
      particles.push({ type: 'dust', x: rand(0, W), y: rand(0, H), vy: rand(-0.3, -1.1), vx: rand(-0.4, 0.4), r: rand(0.6, 2.4), a: rand(0.2, 0.7) });
    }
    particles.push({ type: 'lightning', next: 0 });
  } else if (kind === 'sea-wave') {
    for (let i = 0; i < 4; i++) {
      particles.push({ type: 'wave', base: 0.55 + i * 0.11, amp: rand(14, 30), len: rand(0.004, 0.009), speed: rand(0.4, 0.9), phase: rand(0, TAU), op: 0.16 - i * 0.025 });
    }
    for (let i = 0; i < 60; i++) {
      particles.push({ type: 'glow', x: rand(0, W), y: rand(H * 0.3, H), vy: rand(-0.3, -1), r: rand(1, 4), a: rand(0.2, 0.8) });
    }
  } else if (kind === 'gold-laughter') {
    for (let i = 0; i < 80; i++) {
      particles.push({ type: 'goldspray', x: cx, y: cy, a: rand(0, TAU), sp: rand(1, 6), r: rand(1.5, 5), life: rand(0.2, 1), decay: rand(0.003, 0.01) });
    }
    for (let i = 0; i < 3; i++) {
      particles.push({ type: 'ripple', r: i * 120, max: Math.max(W, H), cx, cy });
    }
    for (let i = 0; i < 40; i++) {
      particles.push({ type: 'float', x: rand(0, W), y: rand(0, H), vy: rand(-0.4, -1.2), r: rand(1, 3), a: rand(0.3, 0.9) });
    }
  } else if (kind === 'edict-march') {
    for (let i = 0; i < 10; i++) {
      particles.push({ type: 'edict', x: rand(0, W), y: rand(0, H), vx: rand(0.4, 1.4), s: rand(20, 46), op: rand(0.12, 0.3) });
    }
    for (let i = 0; i < 60; i++) {
      particles.push({ type: 'ember', x: rand(0, W), y: rand(0, H), vy: rand(-0.4, -1.6), vx: rand(-0.3, 0.6), r: rand(1, 3), a: rand(0.3, 0.9) });
    }
    particles.push({ type: 'gong', next: 0, cx, cy: H * 0.5 });
  }
}

/* ── drawing ── */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function drawTalisman(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.globalAlpha = 0.55;
  const g = ctx.createLinearGradient(0, -p.s, 0, p.s);
  g.addColorStop(0, 'rgba(220,30,40,.9)');
  g.addColorStop(1, 'rgba(150,10,20,.7)');
  ctx.fillStyle = g;
  ctx.fillRect(-p.s * 0.35, -p.s, p.s * 0.7, p.s * 2);
  ctx.strokeStyle = 'rgba(255,215,0,.9)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-p.s * 0.35, -p.s, p.s * 0.7, p.s * 2);
  ctx.beginPath();
  for (let i = -2; i <= 2; i++) {
    ctx.moveTo(-p.s * 0.2, i * p.s * 0.35);
    ctx.lineTo(p.s * 0.2, i * p.s * 0.35 + p.s * 0.12);
  }
  ctx.stroke();
  ctx.restore();
}

function step() {
  if (!running) return;
  t += 1;
  ctx.clearRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  const [r, g, b] = hexToRgb(accent);

  for (const p of particles) {
    switch (p.type) {
      case 'flame': {
        p.y -= p.vy;
        p.life += 0.012;
        if (p.y < -40) { p.y = H + rand(0, 120); p.life = 0; p.x = rand(0, W); }
        const fl = Math.sin(p.life * Math.PI);
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.w);
        grd.addColorStop(0, `rgba(255,${200 + p.hue},${60 + p.hue},${0.5 * fl})`);
        grd.addColorStop(0.5, `rgba(255,${90 + p.hue},20,${0.32 * fl})`);
        grd.addColorStop(1, 'rgba(180,0,0,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.w, 0, TAU);
        ctx.fill();
        break;
      }
      case 'talisman': {
        p.y += p.vy; p.rot += p.vr;
        if (p.y > H + 60) { p.y = -60; p.x = rand(0, W); }
        drawTalisman(p);
        break;
      }
      case 'spark': {
        p.a += 0.02;
        p.x += Math.cos(p.a) * p.sp;
        p.y -= p.sp * 0.6;
        if (p.y < -10) { p.y = H + 10; p.x = rand(0, W); }
        ctx.fillStyle = `rgba(255,220,120,${rand(0.3, 0.8)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
        break;
      }
      case 'blade': {
        const prog = ((t * 0.004 * (0.6 + p.speed) + p.off) % 1);
        const y = H * (0.15 + p.off * 0.62);
        const x = prog * (W + 400) - 200;
        const len = W * 0.5 * p.len;
        const grd = ctx.createLinearGradient(x - len, y, x, y);
        grd.addColorStop(0, 'rgba(201,162,39,0)');
        grd.addColorStop(0.7, `rgba(255,235,150,${0.25})`);
        grd.addColorStop(1, 'rgba(255,255,220,.7)');
        ctx.strokeStyle = grd;
        ctx.lineWidth = rand(2, 5);
        ctx.beginPath();
        ctx.moveTo(x - len, y + 30);
        ctx.lineTo(x, y - 30);
        ctx.stroke();
        break;
      }
      case 'dust': {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -10) { p.y = H + 10; p.x = rand(0, W); }
        ctx.fillStyle = `rgba(${r},${g},${b},${p.a * 0.5})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
        break;
      }
      case 'lightning': {
        if (t > p.next) {
          p.next = t + rand(40, 130);
          p.flash = 8;
          p.path = [];
          let lx = rand(W * 0.2, W * 0.8);
          let ly = 0;
          while (ly < H * 0.7) { p.path.push([lx, ly]); lx += rand(-50, 50); ly += rand(30, 70); }
        }
        if (p.flash > 0) {
          p.flash -= 1;
          ctx.strokeStyle = `rgba(255,255,230,${p.flash / 8})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          (p.path || []).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.stroke();
        }
        break;
      }
      case 'wave': {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 12) {
          const y = H * p.base + Math.sin(x * p.len + t * 0.02 * p.speed + p.phase) * p.amp
            + Math.sin(x * p.len * 2.3 + t * 0.03) * p.amp * 0.4;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
        const grd = ctx.createLinearGradient(0, H * p.base - p.amp, 0, H);
        grd.addColorStop(0, `rgba(${r},${g},${b},${p.op})`);
        grd.addColorStop(1, 'rgba(255,215,120,0)');
        ctx.fillStyle = grd;
        ctx.fill();
        break;
      }
      case 'glow': {
        p.y += p.vy; p.x += Math.sin(t * 0.01 + p.y) * 0.3;
        if (p.y < H * 0.2) { p.y = H; p.x = rand(0, W); }
        ctx.fillStyle = `rgba(220,240,255,${p.a * (0.4 + 0.4 * Math.sin(t * 0.05 + p.x))})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
        break;
      }
      case 'goldspray': {
        p.x += Math.cos(p.a) * p.sp;
        p.y += Math.sin(p.a) * p.sp - 0.4;
        p.sp *= 0.985;
        p.life -= p.decay;
        if (p.life <= 0) { p.x = W / 2; p.y = H * 0.46; p.a = rand(0, TAU); p.sp = rand(1, 6); p.life = 1; }
        ctx.fillStyle = `rgba(255,${200 + rand(-30, 40)},${80},${Math.max(0, p.life) * 0.9})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
        break;
      }
      case 'ripple': {
        p.r += 2.2;
        if (p.r > p.max) p.r = 0;
        ctx.strokeStyle = `rgba(255,200,80,${Math.max(0, 0.4 - p.r / p.max * 0.4)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, p.r, 0, TAU);
        ctx.stroke();
        break;
      }
      case 'float': {
        p.y += p.vy; if (p.y < -10) { p.y = H + 10; p.x = rand(0, W); }
        ctx.fillStyle = `rgba(255,220,120,${p.a * 0.6})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
        break;
      }
      case 'edict': {
        p.x += p.vx; if (p.x > W + 40) p.x = -40;
        ctx.save();
        ctx.globalAlpha = p.op;
        ctx.fillStyle = `rgba(${r},${g},${b},1)`;
        ctx.fillRect(p.x - p.s * 0.3, p.y - p.s * 0.5, p.s * 0.6, p.s);
        ctx.strokeStyle = 'rgba(255,215,0,.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x - p.s * 0.3, p.y - p.s * 0.5, p.s * 0.6, p.s);
        ctx.restore();
        break;
      }
      case 'ember': {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -10) { p.y = H + 10; p.x = rand(0, W); }
        ctx.fillStyle = `rgba(255,${rand(60, 160)},40,${p.a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
        break;
      }
      case 'gong': {
        if (t > p.next) { p.next = t + rand(60, 110); p.wave = 0; }
        if (p.wave !== undefined) {
          p.wave += 6;
          const rr = p.wave;
          if (rr < Math.max(W, H)) {
            ctx.strokeStyle = `rgba(255,180,60,${Math.max(0, 0.35 - rr / Math.max(W, H) * 0.35)})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(p.cx, p.cy, rr, 0, TAU);
            ctx.stroke();
          }
        }
        break;
      }
      default: break;
    }
  }

  // central radial holy glow
  ctx.globalCompositeOperation = 'lighter';
  const cg = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, Math.max(W, H) * 0.5);
  const pulse = 0.06 + 0.04 * Math.sin(t * 0.04);
  cg.addColorStop(0, `rgba(${r},${g},${b},${pulse})`);
  cg.addColorStop(0.4, `rgba(${r},${g},${b},${pulse * 0.4})`);
  cg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cg;
  ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = 'source-over';
  raf = requestAnimationFrame(step);
}

export function startGodFx(god) {
  if (!ctx) return;
  kind = god?.fxKind ?? 'flame-talisman';
  accent = god?.auraColor ?? god?.theme?.accent ?? '#ffd700';
  resize();
  seed();
  t = 0;
  if (!running) { running = true; raf = requestAnimationFrame(step); }
}

export function stopGodFx() {
  running = false;
  cancelAnimationFrame(raf);
  if (ctx) ctx.clearRect(0, 0, W, H);
  particles = [];
}
