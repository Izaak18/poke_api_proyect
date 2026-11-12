import { getPokemon } from './api.js';
import { get, set } from './cache.js';
import { getConfig } from './config.js';
import { canDefeat, calcEffectiveness } from './types.js';
import { showView, typePills, capitalize, shuffle, rand } from './ui.js';

let pool = [];
let currentRound = null;
let score = 0;
let streak = 0;
let timerInterval = null;
let timerValue = 0;
let answered = false;

export function init() {
  score = get('score') || 0;
  streak = get('streak') || 0;
  updateScoreUI();

  document.getElementById('start-quiz-btn').addEventListener('click', start);
  document.getElementById('new-round-btn').addEventListener('click', () => {
    if (pool.length) newRound();
    else start();
  });
}

export async function start() {
  showView('quiz');
  const loading = document.getElementById('quiz-loading');
  const content = document.getElementById('quiz-content');
  loading.style.display = 'flex';
  content.style.display = 'none';
  document.getElementById('quiz-loading-text').textContent = 'Cargando datos de Pokémon...';

  try {
    await loadPool();
    newRound();
  } catch (e) {
    document.getElementById('quiz-loading-text').textContent = 'Error al cargar';
    console.error(e);
  }
}

async function loadPool() {
  if (pool.length > 0) return pool;

  const cached = get('quiz_pool');
  if (cached && cached.length > 100) {
    pool = cached;
    return pool;
  }

  const cfg = getConfig().quiz;
  const ids = Array.from({ length: cfg.poolLimit }, (_, i) => i + 1);
  const CONCURRENCY = 15;
  const results = [];

  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(id => getPokemon(id).catch(() => null)));
    for (const r of batchResults) if (r) results.push(r);
    document.getElementById('quiz-loading-text').textContent =
      `Cargando Pokémon... ${results.length}/${ids.length}`;
  }

  set('quiz_pool', results);
  pool = results;
  return pool;
}

function generateRound() {
  const cfg = getConfig().quiz;
  const studied = get('studied') || [];

  for (let attempt = 0; attempt < cfg.maxAttempts; attempt++) {
    let opponent;
    if (studied.length > 0 && Math.random() < cfg.studiedOpponentChance) {
      const studiedPool = pool.filter(p => studied.includes(p.id));
      opponent = studiedPool.length > 0 ? rand(studiedPool) : rand(pool);
    } else {
      opponent = rand(pool);
    }

    const corrects = [];
    const decoys = [];
    for (const poke of pool) {
      if (poke.id === opponent.id) continue;
      if (canDefeat(poke.types, opponent.types)) corrects.push(poke);
      else decoys.push(poke);
    }

    if (corrects.length >= 1 && decoys.length >= 4) {
      const correct = rand(corrects);
      const options = shuffle([correct, ...shuffle(decoys).slice(0, 4)]);
      return { opponent, correct, options };
    }
  }
  return null;
}

function newRound() {
  const round = generateRound();
  if (!round) return alert('No se pudo generar una ronda');
  currentRound = round;
  answered = false;
  renderRound(round);
  startTimer();
}

function renderRound(round) {
  document.getElementById('quiz-loading').style.display = 'none';
  document.getElementById('quiz-content').style.display = 'block';

  document.getElementById('opponent-card').innerHTML = `
    <img src="${round.opponent.sprite}" alt="${round.opponent.name}">
    <div class="pname">${round.opponent.name}</div>
    <div class="ptypes">${typePills(round.opponent.types)}</div>
  `;

  document.getElementById('options').innerHTML = round.options.map(p => `
    <div class="option-card" data-id="${p.id}">
      <img src="${p.sprite}" alt="${p.name}">
      <div class="pname">${p.name}</div>
      <div class="ptypes">${typePills(p.types)}</div>
    </div>
  `).join('');

  const fb = document.getElementById('feedback');
  fb.className = 'feedback';
  fb.textContent = '';

  document.querySelectorAll('.option-card').forEach(card => {
    card.addEventListener('click', () => handleAnswer(parseInt(card.dataset.id), card));
  });
}

function startTimer() {
  stopTimer();
  const cfg = getConfig().quiz;
  timerValue = cfg.timerSeconds;
  updateTimerUI();
  document.getElementById('quiz-timer').classList.remove('warning');

  timerInterval = setInterval(() => {
    timerValue--;
    updateTimerUI();
    if (timerValue <= 5 && timerValue > 0) {
      document.getElementById('quiz-timer').classList.add('warning');
    }
    if (timerValue <= 0) {
      stopTimer();
      handleTimeout();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function updateTimerUI() {
  document.getElementById('quiz-timer-value').textContent = timerValue;
}

function handleTimeout() {
  if (answered) return;
  answered = true;
  document.querySelectorAll('.option-card').forEach(c => c.classList.add('disabled'));
  const correctCard = document.querySelector(`.option-card[data-id="${currentRound.correct.id}"]`);
  if (correctCard) correctCard.classList.add('correct');

  streak = 0;
  updateScoreUI();
  saveProgress();

  const fb = document.getElementById('feedback');
  fb.className = 'feedback show error';
  fb.innerHTML = `<b>¡Se acabó el tiempo! ⏰</b><br>
    La respuesta correcta era <b>${capitalize(currentRound.correct.name)}</b>.`;
}

function handleAnswer(id, card) {
  if (answered) return;
  answered = true;
  stopTimer();

  const cfg = getConfig().quiz;
  const round = currentRound;
  const isCorrect = id === round.correct.id;
  const chosen = round.options.find(o => o.id === id);

  document.querySelectorAll('.option-card').forEach(c => c.classList.add('disabled'));

  if (isCorrect) {
    card.classList.add('correct');

    let multiplier = 1;
    for (const t of cfg.timerBonusThresholds) {
      if (timerValue >= t.minSeconds) { multiplier = t.multiplier; break; }
    }

    const baseGain = cfg.basePoints + streak * cfg.streakBonus;
    const gained = Math.round(baseGain * multiplier);
    score += gained;
    streak += 1;
    updateScoreUI();
    saveProgress();

    const effTypes = round.correct.types.filter(t => calcEffectiveness(t, round.opponent.types) >= 2);
    const eff = Math.max(...effTypes.map(t => calcEffectiveness(t, round.opponent.types)));

    const fb = document.getElementById('feedback');
    fb.className = 'feedback show success';
    fb.innerHTML = `
      <b>¡Correcto! 🎉</b><br>
      <b>${capitalize(round.correct.name)}</b> puede vencer a <b>${capitalize(round.opponent.name)}</b>
      gracias a su ataque de tipo <b>${effTypes.map(capitalize).join(' / ')}</b> (x${eff}).
      <br><span style="opacity:0.8">+${gained} pts (${multiplier}x velocidad) · Racha: ${streak} 🔥</span>
    `;
  } else {
    card.classList.add('wrong');
    const correctCard = document.querySelector(`.option-card[data-id="${round.correct.id}"]`);
    if (correctCard) correctCard.classList.add('correct');

    streak = 0;
    updateScoreUI();
    saveProgress();

    const fb = document.getElementById('feedback');
    fb.className = 'feedback show error';
    fb.innerHTML = `
      <b>¡Incorrecto! ❌</b><br>
      Elegiste <b>${capitalize(chosen.name)}</b> (${chosen.types.map(capitalize).join('/')}),
      pero la respuesta correcta era <b>${capitalize(round.correct.name)}</b>
      (${round.correct.types.map(capitalize).join('/')}).
    `;
  }
}

function updateScoreUI() {
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('quiz-score', score);
  set('quiz-streak', streak);
  set('home-score', score);
  set('home-streak', streak);
}

function saveProgress() {
  set('score', score);
  set('streak', streak);
}

export async function practiceWith(opponent) {
  showView('quiz');
  const loading = document.getElementById('quiz-loading');
  const content = document.getElementById('quiz-content');
  loading.style.display = 'flex';
  content.style.display = 'none';
  document.getElementById('quiz-loading-text').textContent = 'Preparando desafío...';

  try {
    await loadPool();
  } catch (e) {
    document.getElementById('quiz-loading-text').textContent = 'Error al cargar';
    return;
  }

  const corrects = [];
  const decoys = [];
  for (const poke of pool) {
    if (poke.id === opponent.id) continue;
    if (canDefeat(poke.types, opponent.types)) corrects.push(poke);
    else decoys.push(poke);
  }

  if (corrects.length < 1 || decoys.length < 4) {
    newRound();
    return;
  }

  const correct = rand(corrects);
  const options = shuffle([correct, ...shuffle(decoys).slice(0, 4)]);
  currentRound = { opponent, correct, options };
  answered = false;
  renderRound(currentRound);
  startTimer();
}