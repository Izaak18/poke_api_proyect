import { getTypeColor } from './config.js';
import { get } from './cache.js';

const viewHandlers = {};

export function registerView(name, onEnter) {
  viewHandlers[name] = onEnter;
}

export function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const view = document.getElementById(name);
  if (view) view.classList.add('active');
  const btn = document.querySelector(`.nav-btn[data-view="${name}"]`);
  if (btn) btn.classList.add('active');
  if (viewHandlers[name]) viewHandlers[name]();
}

export function initNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });
}

export function typePill(type) {
  return `<span class="ptype" style="background:${getTypeColor(type)}">${type}</span>`;
}

export function typePills(types) {
  return types.map(typePill).join('');
}

export function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function updateHomeStats() {
  const studied = get('studied') || [];
  const score = get('score') || 0;
  const streak = get('streak') || 0;
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('home-studied', studied.length);
  set('home-score', score);
  set('home-streak', streak);
}