import { getPokemon } from './api.js';
import { get, set } from './cache.js';
import { typePills, capitalize, typePill } from './ui.js';
import { getWeaknessTypes, getResistanceTypes, getImmunityTypes } from './types.js';

let onPractice = null;
let onCompare = null;

export function setPracticeCallback(cb) { onPractice = cb; }
export function setCompareCallback(cb) { onCompare = cb; }

export function initModal() {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-close').addEventListener('click', () => overlay.classList.remove('show'));
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('show');
  });
}

export async function showDetail(id) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  overlay.classList.add('show');
  content.innerHTML = '<div style="text-align:center;padding:40px"><div class="spinner" style="margin:0 auto"></div></div>';

  try {
    const data = await getPokemon(id);
    const studied = get('studied') || [];
    const favorites = get('favorites') || [];
    const isStudied = studied.includes(id);
    const isFav = favorites.includes(id);

    const weaknesses = getWeaknessTypes(data.types);
    const resistances = getResistanceTypes(data.types);
    const immunities = getImmunityTypes(data.types);

    content.innerHTML = `
      <div class="detail-header">
        <img src="${data.artwork || data.sprite}" alt="${data.name}">
        <h2>${data.name}</h2>
        <div class="ptypes">${typePills(data.types)}</div>
      </div>

      <div class="detail-section">
        <h3>Estadísticas base</h3>
        ${data.stats.map(s => `
          <div class="stat-row">
            <div class="stat-name">${s.name.replace('-', ' ')}</div>
            <div class="stat-bar"><div class="stat-fill" style="width:${Math.min(100, s.value / 2)}%"></div></div>
            <div class="stat-num">${s.value}</div>
          </div>
        `).join('')}
      </div>

      <div class="detail-section">
        <h3>Debilidades</h3>
        <div class="weakness-list">
          ${weaknesses.length ? weaknesses.map(typePill).join('') : '<span style="color:var(--text-dim)">Ninguna</span>'}
        </div>
      </div>

      ${resistances.length ? `
        <div class="detail-section">
          <h3>Resistencias</h3>
          <div class="weakness-list">${resistances.map(typePill).join('')}</div>
        </div>` : ''}

      ${immunities.length ? `
        <div class="detail-section">
          <h3>Inmunidades</h3>
          <div class="weakness-list">${immunities.map(typePill).join('')}</div>
        </div>` : ''}

      <div class="detail-section">
        <h3>Datos</h3>
        <p style="color:var(--text-dim);font-size:14px">
          Altura: ${(data.height / 10).toFixed(1)} m · Peso: ${(data.weight / 10).toFixed(1)} kg<br>
          Habilidades: ${data.abilities.map(capitalize).join(', ')}
        </p>
      </div>

      <div class="detail-actions">
        <button class="btn-secondary" id="study-btn">${isStudied ? '✅ Estudiado' : '📖 Marcar como estudiado'}</button>
        <button class="btn-secondary" id="fav-btn">${isFav ? '★ Quitar favorito' : '☆ Añadir a favoritos'}</button>
        <button class="btn-secondary" id="practice-btn">⚔️ Practicar</button>
        <button class="btn-secondary" id="compare-btn">⚖️ Comparar</button>
      </div>
    `;

    document.getElementById('study-btn').addEventListener('click', () => {
      let list = get('studied') || [];
      if (list.includes(id)) list = list.filter(s => s !== id);
      else list.push(id);
      set('studied', list);
      document.getElementById('study-btn').textContent = list.includes(id) ? '✅ Estudiado' : '📖 Marcar como estudiado';
    });

    document.getElementById('fav-btn').addEventListener('click', () => {
      let list = get('favorites') || [];
      if (list.includes(id)) list = list.filter(f => f !== id);
      else list.push(id);
      set('favorites', list);
      document.getElementById('fav-btn').textContent = list.includes(id) ? '★ Quitar favorito' : '☆ Añadir a favoritos';
    });

    document.getElementById('practice-btn').addEventListener('click', () => {
      overlay.classList.remove('show');
      if (onPractice) onPractice(data);
    });

    document.getElementById('compare-btn').addEventListener('click', () => {
      overlay.classList.remove('show');
      if (onCompare) onCompare(data);
    });
  } catch (e) {
    content.innerHTML = '<p style="color:var(--error);text-align:center;padding:20px">Error al cargar</p>';
  }
}