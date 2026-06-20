/** 狼牙棒全版流血 — 重口味、永久累積、不消失、越打越誇張 */
let canvas;
let ctx;
let splats = [];
let dpr = 1;

function RI(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
const rnd = (a, b) => Math.random() * (b - a) + a;

/* 全版重繪：高 DPR、resize 時整批重畫，累積永不消失 */
function resize() {
  if (!canvas) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  redraw();
}

function bloodColor(dark = 0) {
  const r = 120 + Math.floor(Math.random() * 60) - dark * 30;
  return `rgba(${Math.max(60, r)}, ${Math.floor(Math.random() * 10)}, ${Math.floor(Math.random() * 20)}, `;
}

function drawSplat(s) {
  // main pool
  const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
  g.addColorStop(0, `${s.color}${s.alpha})`);
  g.addColorStop(0.35, `${s.color}${s.alpha * 0.7})`);
  g.addColorStop(0.7, `${s.color}${s.alpha * 0.25})`);
  g.addColorStop(1, `${s.color}0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(s.x, s.y, s.r, s.r * (0.6 + Math.random() * 0.25), s.rot, 0, Math.PI * 2);
  ctx.fill();

  // satellite droplets around the splat — chunky, organic
  for (let i = 0; i < s.blobs; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = s.r * (0.7 + Math.random() * 1.1);
    const br = s.r * (0.06 + Math.random() * 0.22);
    ctx.fillStyle = `${s.color}${s.alpha * 0.8})`;
    ctx.beginPath();
    ctx.arc(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, br, 0, Math.PI * 2);
    ctx.fill();
  }

  // drips running down — longer & more with intensity
  for (let i = 0; i < s.drips; i++) {
    const dx = s.x + (Math.random() - 0.5) * s.r * 1.3;
    const dy = s.y + Math.random() * s.r * 0.7;
    const len = 40 + Math.random() * (90 + s.intensity * 55);
    ctx.strokeStyle = `${s.color}${s.alpha * 0.9})`;
    ctx.lineWidth = 2 + Math.random() * (5 + s.intensity);
    ctx.beginPath();
    ctx.moveTo(dx, dy);
    ctx.quadraticCurveTo(dx + (Math.random() - 0.5) * 24, dy + len * 0.5, dx + (Math.random() - 0.5) * 10, dy + len);
    ctx.stroke();
    // droplet at the tail
    ctx.fillStyle = `${s.color}${s.alpha})`;
    ctx.beginPath();
    ctx.arc(dx + (Math.random() - 0.5) * 10, dy + len, 1.5 + Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function redraw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  splats.forEach(drawSplat);
}

export function initBlood() {
  canvas = document.getElementById('blood-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
}

export function addBloodSplat(hit = 1) {
  if (!ctx) return;
  const intensity = hit;
  const W = window.innerWidth;
  const H = window.innerHeight;

  // ── central impact burst (狼牙棒落點，畫面中上) ──
  const impactX = W * (0.5 + (Math.random() - 0.5) * 0.18);
  const impactY = H * (0.32 + Math.random() * 0.12);
  splats.push({
    x: impactX, y: impactY,
    r: 60 + Math.random() * (70 + intensity * 40),
    alpha: 0.7 + Math.random() * 0.25,
    rot: Math.random() * Math.PI,
    drips: RI(4, 7 + intensity * 2),
    blobs: RI(8, 16 + intensity * 2),
    intensity,
    color: bloodColor(),
  });

  // ── scatter across whole screen, more with each hit ──
  const count = 6 + hit * 4;
  for (let i = 0; i < count; i++) {
    splats.push({
      x: Math.random() * W,
      y: Math.random() * H * 0.95,
      r: 26 + Math.random() * (55 + intensity * 40),
      alpha: 0.45 + Math.random() * 0.4,
      rot: Math.random() * Math.PI,
      drips: RI(2, 5 + intensity),
      blobs: RI(3, 8 + intensity),
      intensity,
      color: bloodColor(Math.random() < 0.4 ? 1 : 0),
    });
  }

  // ── edge splatter (四邊潑濺，框住全版) ──
  const edges = [
    { x: 0, y: Math.random() * H },
    { x: W, y: Math.random() * H },
    { x: Math.random() * W, y: 0 },
    { x: Math.random() * W, y: H },
  ];
  edges.forEach((e) => {
    splats.push({
      x: e.x + (Math.random() - 0.5) * 100,
      y: e.y + (Math.random() - 0.5) * 100,
      r: 70 + Math.random() * (90 + intensity * 45),
      alpha: 0.55 + Math.random() * 0.35,
      rot: Math.random() * Math.PI,
      drips: 3 + intensity,
      blobs: RI(4, 10),
      intensity,
      color: 'rgba(140, 0, 10, ',
    });
  });

  // ── bottom pooling builds up as hits accumulate ──
  if (hit >= 2) {
    for (let i = 0; i < hit; i++) {
      splats.push({
        x: Math.random() * W,
        y: H - Math.random() * 40,
        r: 80 + Math.random() * 120,
        alpha: 0.4 + Math.random() * 0.3,
        rot: 0,
        drips: 0,
        blobs: RI(2, 6),
        intensity,
        color: 'rgba(90, 0, 6, ',
      });
    }
  }

  redraw();
  document.body.classList.add('blood-flash');
  setTimeout(() => document.body.classList.remove('blood-flash'), 130);
}

export function clearBlood() {
  splats = [];
  redraw();
}
