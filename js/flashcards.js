import { getPokemon } from './api.js';
import { get, set } from './cache.js';
import { getTypesData, getTypeColor, getConfig } from './config.js';
import { capitalize, showView } from './ui.js';

let currentPokemon = null;
let score = 0;
let streak = 0;
let answered = false;

export function init() {
  score = get('fc_score') || 0;
  streak = get('fc_streak') || 0;
  updateScoreUI();
}

export async function start() {
  showView('flashcards');
  await newRound();
}

async function newRound() {
  const container = document.getElementById('fc-container');
  container.innerHTML = '<div class="loading-msg"><div class="spinner"></div>Cargando...</div>';

  try {
    const maxId = getConfig().flashcards.maxPokemonId;
    const randomId = Math.floor(Math.random() * maxId) + 1;
    currentPokemon = await getPokemon(randomId);
    answered = false;
    render();
  } catch (e) {
    container.innerHTML = '<div class="error-msg">Error al cargar. Intenta de nuevo.</div>';
  }
}

function render() {
  const container = document.getElementById('fc-container');
  const allTypes = getTypesData().order;
  const typeButtons = allTypes.map(t => {
    const color = getTypeColor(t);
    return `<button class="fc-type-btn" data-type="${t}" style="--type-color:${color}">${t}</button>`;
  }).join('');

  container.innerHTML = `
    <div class="fc-card">
      <div class="fc-sprite-wrapper">
        <img src="${currentPokemon.artwork || currentPokemon.sprite}" alt="???" class="fc-sprite">
      </div>
      <h2 class="fc-question">¿Qué tipo tiene este Pokémon?</h2>
      <div class="fc-types-grid">${typeButtons}</div>
      <div class="fc-feedback" id="fc-feedback"></div>
      <div class="fc-actions">
        <button class="btn-secondary" id="fc-reveal">Revelar respuesta</button>
        <button class="btn-primary" id="fc-next">Siguiente ➜</button>
      </div>
    </div>
  `;

  document.querySelectorAll('.fc-type-btn').forEach(btn => {
    btn.addEventListener('click', () => handleGuess(btn.dataset.type, btn));
  });
  document.getElementById('fc-reveal').addEventListener('click', reveal);
  document.getElementById('fc-next').addEventListener('click', newRound);
}

function handleGuess(type, btn) {
  if (answered) return;
  answered = true;

  const isCorrect = currentPokemon.types.includes(type);
  document.querySelectorAll('.fc-type-btn').forEach(b => b.classList.add('disabled'));

  if (isCorrect) {
    btn.classList.add('correct');
    score += getConfig().flashcards.pointsPerCorrect;
    streak += 1;
    showFeedback('success', `¡Correcto! 🎉 ${capitalize(currentPokemon.name)} es ${currentPokemon.types.map(capitalize).join('/')}.`);
  } else {
    btn.classList.add('wrong');
    streak = 0;
    document.querySelectorAll('.fc-type-btn').forEach(b => {
      if (currentPokemon.types.includes(b.dataset.type)) b.classList.add('correct');
    });
    showFeedback('error', `¡Incorrecto! ❌ ${capitalize(currentPokemon.name)} es ${currentPokemon.types.map(capitalize).join('/')}.`);
  }

  updateScoreUI();
  saveProgress();
}

function reveal() {
  if (answered) return;
  answered = true;
  document.querySelectorAll('.fc-type-btn').forEach(b => {
    b.classList.add('disabled');
    if (currentPokemon.types.includes(b.dataset.type)) b.classList.add('correct');
  });
  showFeedback('info', `${capitalize(currentPokemon.name)} es ${currentPokemon.types.map(capitalize).join('/')}.`);
}

function showFeedback(cls, html) {
  const fb = document.getElementById('fc-feedback');
  if (!fb) return;
  fb.className = `fc-feedback show ${cls}`;
  fb.innerHTML = html;
}

function updateScoreUI() {
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('fc-score', score);
  set('fc-streak', streak);
}

function saveProgress() {
  set('fc_score', score);
  set('fc_streak', streak);
}