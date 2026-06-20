import { PICK_N, R, RI } from './content.js';
import { asset } from './asset.js';

export const BG = {
  normal: '/bg/temple-day.webp',
  possessed: '/bg/possession.webp',
  texture: '/bg/ritual-texture.webp',
};

export function applyBackgrounds(possessed = false) {
  $('bg-photo').style.backgroundImage = `url(${asset(possessed ? BG.possessed : BG.normal)})`;
  document.documentElement.style.setProperty('--god-glow', possessed ? 'var(--p-glow-active)' : 'transparent');
}

const $ = (id) => document.getElementById(id);

const BELIEVER_POSITIONS = [
  { bottom: '4%', left: '0.5%', scale: 1.05 },
  { bottom: '6%', right: '0.5%', scale: 1 },
  { top: '14%', left: '0%', scale: 0.92 },
  { top: '20%', right: '0%', scale: 1 },
  { bottom: '30%', left: '1%', scale: 0.85 },
  { top: '40%', right: '0.5%', scale: 0.95 },
];

export function spawnParticles(container, colors, count = 56) {
  container.innerHTML = '';
  const palette = colors ?? ['#ffd700', '#ff4400', '#ffaa00', '#fff'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = RI(2, 10);
    p.style.cssText = `
      width:${size}px;height:${size}px;
      left:${Math.random() * 100}%;
      bottom:-10px;
      background:${R(palette)};
      animation-duration:${RI(4, 16)}s;
      animation-delay:${Math.random() * 6}s;
    `;
    container.appendChild(p);
  }
}

export function spawnScene(believers, objBox, belBox) {
  objBox.innerHTML = '';
  belBox.innerHTML = '';

  const bels = PICK_N(believers, Math.min(BELIEVER_POSITIONS.length, RI(5, 6)));
  bels.forEach((b, i) => {
    const d = document.createElement('div');
    const pos = BELIEVER_POSITIONS[i % BELIEVER_POSITIONS.length];
    d.className = 'believer-float' + (b.hot ? ' believer-hot' : '');
    const scale = pos.scale ?? 1;
    d.style.cssText = Object.entries(pos)
      .filter(([k]) => k !== 'scale')
      .map(([k, v]) => `${k}:${v}`)
      .join(';');
    d.style.setProperty('--bel-scale', scale);
    d.innerHTML = `
      <div class="believer-float-card">
        <div class="believer-float-photo"><img src="${asset(b.portrait)}" alt="${b.name}" loading="lazy" /></div>
        <div class="believer-float-info">
          <div class="nm">${b.name}</div>
          <div class="st">${b.archetypeLabel}</div>
        </div>
      </div>`;
    belBox.appendChild(d);
    setTimeout(() => d.classList.add('show'), 200 + i * 140);
  });
}

export function applyGodTheme(god) {
  const root = document.documentElement;
  root.style.setProperty('--god-accent', god.theme.accent);
  root.style.setProperty('--god-glow-active', god.theme.glow);
  root.style.setProperty('--god-scale', god.theme.scale);
  document.body.dataset.god = god.id;
}