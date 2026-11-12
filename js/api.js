import { get, set } from './cache.js';
import {
  getConfig, setConfig,
  getTypesData, setTypesData
} from './config.js';

const BASE = 'https://pokeapi.co/api/v2';

export async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

export async function loadConfigs() {
  if (!getConfig()) {
    setConfig(await fetchJSON('./data/config.json'));
  }
  if (!getTypesData()) {
    setTypesData(await fetchJSON('./data/types.json'));
  }
}

export async function getPokemon(idOrName) {
  const key = 'pokemon_' + idOrName;
  const cached = get(key);
  if (cached) return cached;

  const data = await fetchJSON(`${BASE}/pokemon/${idOrName}`);
  const parsed = {
    id: data.id,
    name: data.name,
    types: data.types.map(t => t.type.name),
    sprite: data.sprites.front_default ||
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${data.id}.png`,
    artwork: data.sprites.other?.['official-artwork']?.front_default || null,
    stats: data.stats.map(s => ({ name: s.stat.name, value: s.base_stat })),
    height: data.height,
    weight: data.weight,
    abilities: data.abilities.map(a => a.ability.name)
  };
  set(key, parsed);
  return parsed;
}

export async function getPokemonList() {
  const cached = get('library_list');
  if (cached && cached.length > 0) return cached;

  const total = getConfig().library.totalPokemon;
  const data = await fetchJSON(`${BASE}/pokemon?limit=${total}`);
  const list = data.results.map(p => {
    const parts = p.url.split('/').filter(Boolean);
    return { id: parseInt(parts[parts.length - 1]), name: p.name };
  });
  set('library_list', list);
  return list;
}

export async function getTypeIndex() {
  const cached = get('type_index');
  if (cached) return cached;

  const allTypes = getTypesData().order;
  const results = await Promise.all(
    allTypes.map(t => fetchJSON(`${BASE}/type/${t}`))
  );
  const index = {};
  allTypes.forEach((type, i) => {
    index[type] = results[i].pokemon.map(p => {
      const parts = p.pokemon.url.split('/').filter(Boolean);
      return parseInt(parts[parts.length - 1]);
    });
  });
  set('type_index', index);
  return index;
}