import { getPokemon, getPokemonList, getTypeIndex } from './api.js';
import { get, set } from './cache.js';
import { getTypeColor, getTypesData, getConfig } from './config.js';
import { typePills } from './ui.js';
import { showDetail } from './modal.js';

let all = [];
let filtered = [];
let rendered = 0;
let filter = { search: '', type: null };
let typeIndex = null;
let cardObserver = null;
let scrollObserver = null;

export async function init() {
  if (all.length === 0) {
    const grid = document.getElementById('library-grid');
    grid.innerHTML = '<div class="loading-msg">Cargando catálogo...</div>';
    try {
      all = await getPokemonList();
    } catch (e) {
      grid.innerHTML = '<div class="error-msg">Error al cargar</div>';
      return;
    }
  }

  renderTypeFilters();
  render();
  setupListeners();
}

function setupListeners() {
  const searchInput = document.getElementById('search-input');
  if (!searchInput.dataset.bound) {
    let t;
    searchInput.addEventListener('input', e => {
      clearTimeout(t);
      t = setTimeout(() => {
        filter.search = e.target.value;
        render();
      }, 250);
    });
    searchInput.dataset.bound = '1';
  }

  const grid = document.getElementById('library-grid');
  if (!grid.dataset.bound) {
    grid.addEventListener('click', e => {
      const fav = e.target.closest('.fav-icon');
      if (fav) {
        e.stopPropagation();
        toggleFav(parseInt(fav.dataset.fav), fav);
        return;
      }
      const card = e.target.closest('.poke-card');
      if (card) showDetail(parseInt(card.dataset.id));
    });
    grid.dataset.bound = '1';
  }

  if (!scrollObserver) {
    const sentinel = document.getElementById('library-sentinel');
    scrollObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && rendered < filtered.length) {
        appendMore();
      }
    }, { rootMargin: '200px' });
    scrollObserver.observe(sentinel);
  }
}

function renderTypeFilters() {
  const container = document.getElementById('type-filters');
  if (container.children.length > 0) return;

  getTypesData().order.forEach(type => {
    const pill = document.createElement('button');
    pill.className = 'type-pill';
    pill.style.setProperty('--pill-color', getTypeColor(type));
    pill.textContent = type;
    pill.dataset.type = type;
    pill.addEventListener('click', async () => {
      if (filter.type === type) {
        filter.type = null;
        pill.classList.remove('active');
      } else {
        document.querySelectorAll('.type-pill').forEach(p => p.classList.remove('active'));
        if (!typeIndex) {
          pill.textContent = '...';
          typeIndex = await getTypeIndex();
          pill.textContent = type;
        }
        filter.type = type;
        pill.classList.add('active');
      }
      render();
    });
    container.appendChild(pill);
  });
}

function getFiltered() {
  let list = all;
  if (filter.search) {
    const q = filter.search.toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(q));
  }
  if (filter.type && typeIndex) {
    const ids = new Set(typeIndex[filter.type] || []);
    list = list.filter(p => ids.has(p.id));
  }
  return list;
}

function render() {
  const grid = document.getElementById('library-grid');
  filtered = getFiltered();

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-msg">No se encontraron Pokémon</div>';
    rendered = 0;
    return;
  }

  const initial = filtered.slice(0, getConfig().library.pageSize);
  grid.innerHTML = initial.map(renderCard).join('');
  rendered = initial.length;
  observeCards();
}

function appendMore() {
  const next = filtered.slice(rendered, rendered + getConfig().library.infiniteScrollSize);
  const grid = document.getElementById('library-grid');
  grid.insertAdjacentHTML('beforeend', next.map(renderCard).join(''));
  rendered += next.length;
  observeCards();
}

function renderCard(p) {
  const favorites = get('favorites') || [];
  const isFav = favorites.includes(p.id);
  const sprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`;

  return `
    <div class="poke-card" data-id="${p.id}">
      <span class="number">#${String(p.id).padStart(3, '0')}</span>
      <span class="fav-icon ${isFav ? 'active' : ''}" data-fav="${p.id}">${isFav ? '★' : '☆'}</span>
      <img src="${sprite}" alt="${p.name}" loading="lazy">
      <div class="pname">${p.name}</div>
      <div class="ptypes" data-types-for="${p.id}"></div>
    </div>
  `;
}

function observeCards() {
  if (cardObserver) cardObserver.disconnect();
  cardObserver = new IntersectionObserver(entries => {
    entries.forEach(async entry => {
      if (!entry.isIntersecting) return;
      const card = entry.target;
      cardObserver.unobserve(card);
      const id = parseInt(card.dataset.id);
      const typesEl = card.querySelector('.ptypes');
      if (typesEl && !typesEl.innerHTML.trim()) {
        try {
          const data = await getPokemon(id);
          typesEl.innerHTML = typePills(data.types);
        } catch (e) {}
      }
    });
  }, { rootMargin: '100px' });

  document.querySelectorAll('.poke-card').forEach(c => cardObserver.observe(c));
}

function toggleFav(id, icon) {
  let favs = get('favorites') || [];
  if (favs.includes(id)) {
    favs = favs.filter(f => f !== id);
    icon.textContent = '☆';
    icon.classList.remove('active');
  } else {
    favs.push(id);
    icon.textContent = '★';
    icon.classList.add('active');
  }
  set('favorites', favs);
}