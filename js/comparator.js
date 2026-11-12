import { getPokemon, getPokemonList } from './api.js';
import { getTypeColor } from './config.js';
import { typePills, capitalize } from './ui.js';

let pokemonList = null;
let currentA = null;
let currentB = null;
let initialized = false;

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Ataque',
  defense: 'Defensa',
  'special-attack': 'Atq. Esp.',
  'special-defense': 'Def. Esp.',
  speed: 'Velocidad'
};
const STAT_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

export async function init() {
  if (initialized) return;
  initialized = true;

  try {
    if (!pokemonList) pokemonList = await getPokemonList();
  } catch (e) {
    initialized = false;
    return;
  }

  const selectA = document.getElementById('compare-a');
  const selectB = document.getElementById('compare-b');

  if (selectA.options.length <= 1) {
    const opts = pokemonList.map(p => `<option value="${p.id}">${capitalize(p.name)}</option>`).join('');
    selectA.innerHTML = '<option value="">Selecciona Pokémon A</option>' + opts;
    selectB.innerHTML = '<option value="">Selecciona Pokémon B</option>' + opts;
  }

  if (!selectA.dataset.bound) {
    selectA.addEventListener('change', () => loadComparison('A', parseInt(selectA.value) || 0));
    selectB.addEventListener('change', () => loadComparison('B', parseInt(selectB.value) || 0));
    selectA.dataset.bound = '1';
  }

  renderComparison();
}

async function loadComparison(slot, id) {
  if (!id) {
    if (slot === 'A') currentA = null;
    else currentB = null;
    renderComparison();
    return;
  }
  try {
    const data = await getPokemon(id);
    if (slot === 'A') currentA = data;
    else currentB = data;
    renderComparison();
  } catch (e) {
    console.error(e);
  }
}

function getStat(p, name) {
  return p.stats.find(s => s.name === name)?.value || 0;
}

function renderComparison() {
  const container = document.getElementById('compare-result');
  if (!container) return;

  if (!currentA || !currentB) {
    container.innerHTML = '<div class="empty-msg">Selecciona dos Pokémon para compararlos</div>';
    return;
  }

  const totalA = currentA.stats.reduce((s, x) => s + x.value, 0);
  const totalB = currentB.stats.reduce((s, x) => s + x.value, 0);

  const statsHTML = (poke) => STAT_ORDER.map(name => `
    <div class="cmp-stat-row">
      <span class="cmp-stat-label">${STAT_LABELS[name]}</span>
      <span class="cmp-stat-value">${getStat(poke, name)}</span>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="cmp-grid">
      <div class="cmp-card" style="border-color:${getTypeColor(currentA.types[0])}">
        <img src="${currentA.artwork || currentA.sprite}" alt="${currentA.name}">
        <h3>${capitalize(currentA.name)}</h3>
        <div class="ptypes">${typePills(currentA.types)}</div>
        ${statsHTML(currentA)}
        <div class="cmp-total">Total: <b>${totalA}</b></div>
      </div>
      <div class="cmp-vs">VS</div>
      <div class="cmp-card" style="border-color:${getTypeColor(currentB.types[0])}">
        <img src="${currentB.artwork || currentB.sprite}" alt="${currentB.name}">
        <h3>${capitalize(currentB.name)}</h3>
        <div class="ptypes">${typePills(currentB.types)}</div>
        ${statsHTML(currentB)}
        <div class="cmp-total">Total: <b>${totalB}</b></div>
      </div>
    </div>
  `;

  const [cardA, cardB] = container.querySelectorAll('.cmp-card');
  STAT_ORDER.forEach((name, i) => {
    const vA = getStat(currentA, name);
    const vB = getStat(currentB, name);
    const rowA = cardA.querySelectorAll('.cmp-stat-row')[i];
    const rowB = cardB.querySelectorAll('.cmp-stat-row')[i];
    if (vA > vB) { rowA.classList.add('winner'); rowB.classList.add('loser'); }
    else if (vB > vA) { rowB.classList.add('winner'); rowA.classList.add('loser'); }
  });
}

export async function prefillA(id) {
  await init();
  const select = document.getElementById('compare-a');
  if (select) {
    select.value = String(id);
    await loadComparison('A', id);
  }
}